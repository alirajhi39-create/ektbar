import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createSessionToken, db, destroySession, ensureSchema,
  hashPassword, json, parseBody, tokenFromReq, verifyPassword,
} from './_lib/core';

interface AuthBody { username?: string; password?: string; current?: string; next?: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();
    const action = String(req.query.action || 'status');
    const body = parseBody<AuthBody>(req);

    /* حالة الحساب — عام */
    if (action === 'status') {
      const rows = await db()`SELECT 1 FROM teachers LIMIT 1`;
      json(res, 200, { hasAccount: rows.length > 0 });
      return;
    }

    if (req.method !== 'POST') { json(res, 405, { error: 'طريقة غير مدعومة' }); return; }
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    /* إنشاء الحساب لأول مرة */
    if (action === 'register') {
      if (username.length < 3 || password.length < 6) {
        json(res, 400, { error: 'اسم مستخدم (3 أحرف+) وكلمة مرور (6 أحرف+) مطلوبان' }); return;
      }
      const existing = await db()`SELECT 1 FROM teachers LIMIT 1`;
      if (existing.length > 0) { json(res, 409, { error: 'يوجد حساب معلم مسجل بالفعل' }); return; }
      const { salt, hash } = hashPassword(password);
      await db()`INSERT INTO teachers (username, salt, hash) VALUES (${username}, ${salt}, ${hash})`;
      const token = await createSessionToken();
      json(res, 200, { token });
      return;
    }

    /* تسجيل الدخول */
    if (action === 'login') {
      const rows = await db()`SELECT salt, hash FROM teachers WHERE username = ${username} LIMIT 1`;
      const row = rows[0];
      if (!row || !verifyPassword(password, String(row.salt), String(row.hash))) {
        json(res, 401, { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }); return;
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
      if (next.length < 6) { json(res, 400, { error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف' }); return; }
      const rows = await db()`SELECT id, salt, hash FROM teachers LIMIT 1`;
      const row = rows[0];
      if (!row || !verifyPassword(current, String(row.salt), String(row.hash))) {
        json(res, 400, { error: 'كلمة المرور الحالية غير صحيحة' }); return;
      }
      const { salt, hash } = hashPassword(next);
      await db()`UPDATE teachers SET salt = ${salt}, hash = ${hash} WHERE id = ${Number(row.id)}`;
      json(res, 200, { ok: true });
      return;
    }

    json(res, 400, { error: 'إجراء غير معروف' });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : 'خطأ في الخادم' });
  }
}
