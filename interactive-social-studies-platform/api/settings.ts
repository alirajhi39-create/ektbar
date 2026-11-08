import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema, json, parseBody, tokenFromReq } from './_lib/core';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();

    /* قراءة حالة الاختبار — عامة */
    if (req.method === 'GET') {
      const rows = await db()`SELECT value FROM settings WHERE key = 'exam'`;
      const value = rows[0]?.value as { examActive?: boolean } | undefined;
      json(res, 200, { examActive: value?.examActive !== false });
      return;
    }

    /* التعديل — للمعلم فقط */
    if (req.method === 'PUT') {
      const token = await tokenFromReq(req);
      if (!token) { json(res, 401, { error: 'انتهت الجلسة — سجّل الدخول مجددًا' }); return; }
      const body = parseBody<{ examActive?: boolean }>(req);
      const value = { examActive: body.examActive !== false };
      await db()`INSERT INTO settings (key, value) VALUES ('exam', ${JSON.stringify(value)}::jsonb)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      json(res, 200, value);
      return;
    }

    json(res, 405, { error: 'طريقة غير مدعومة' });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : 'خطأ في الخادم' });
  }
}
