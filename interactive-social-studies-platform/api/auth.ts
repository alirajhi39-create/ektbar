import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createSessionToken, db, destroySession, ensureSchema,
  hashPassword, json, parseBody, tokenFromReq, verifyPassword,
} from './_lib/core';

/** كلمة المرور الافتراضية للوحة المعلم — قابلة للتغيير من المتغير TEACHER_PASSWORD أو من اللوحة */
const DEFAULT_PASSWORD = process.env.TEACHER_PASSWORD || '139613';

interface AuthBody { password?: string; current?: string; next?: string }

/* تهيئة حساب المعلم عند أول استخدام */
async function ensureTeacher() {
  const rows = await db()`SELECT id, salt, hash FROM teachers LIMIT 1`;
  if (rows.length > 0) return rows[0] as { id: number; salt: string; hash: string };
  const { salt, hash } = hashPassword(DEFAULT_PASSWORD);
  await db()`INSERT INTO teachers (username, salt, hash) VALUES ('teacher', ${salt}, ${hash}) ON CONFLICT (username) DO NOTHING`;
  const again = await db()`SELECT id, salt, hash FROM teachers LIMIT 1`;
  return again[0] as { id: number; salt: string; hash: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();
    const action = String(req.query.action || 'status');
    const body = parseBody<AuthBody>(req);

    /* الحالة — الدخول بكلمة مرور فقط دائمًا */
    if (action === 'status') {
      json(res, 200, { hasAccount: true });
      return;
    }

    if (req.method !== 'POST') { json(res, 405, { error: 'طريقة غير مدعومة' }); return; }

    /* تسجيل الدخول بكلمة المرور فقط */
    if (action === 'login') {
      const password = String(body.password ?? '');
      if (!password) { json(res, 400, { error: 'أدخل كلمة المرور' }); return; }
      const teacher = await ensureTeacher();
      if (!teacher || !verifyPassword(password, String(teacher.salt), String(teacher.hash))) {
        json(res, 401, { error: 'كلمة المرور غير صحيحة' }); return;
      }
      const token = await createSessionToken();
      json(res, 200, { token });
      return;
    }

    /* تسجيل الخروج */
    if (action === 'logout') {
      const token = await tokenFromReq(req);
      if (token) await destroySession(token);
      json(res, 200, { ok: true });
      return;
    }

    /* تغيير كلمة المرور — يتطلب جلسة */
    if (action === 'change-password') {
      const token = await tokenFromReq(req);
      if (!token) { json(res, 401, { error: 'انتهت الجلسة — سجّل الدخول مجددًا' }); return; }
      const current = String(body.current ?? '');
      const next = String(body.next ?? '');
      if (next.length < 4) { json(res, 400, { error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف' }); return; }
      const teacher = await ensureTeacher();
      if (!teacher || !verifyPassword(current, String(teacher.salt), String(teacher.hash))) {
        json(res, 400, { error: 'كلمة المرور الحالية غير صحيحة' }); return;
      }
      const { salt, hash } = hashPassword(next);
      await db()`UPDATE teachers SET salt = ${salt}, hash = ${hash} WHERE id = ${Number(teacher.id)}`;
      json(res, 200, { ok: true });
      return;
    }

    json(res, 400, { error: 'إجراء غير معروف' });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : 'خطأ في الخادم' });
  }
}
