import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema, getBank, json, parseBody, sanitizeBank, tokenFromReq, validateBank } from './_lib/core';
import { QUESTIONS } from './_lib/defaultQuestions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();

    /* قراءة البنك: المعلم (برمز الجلسة) يحصل النسخة الكاملة، والطالب نسخة منقّحة بلا إجابات */
    if (req.method === 'GET') {
      const bank = await getBank();
      const authed = (await tokenFromReq(req)) !== null;
      json(res, 200, {
        questions: authed ? bank.questions : sanitizeBank(bank.questions),
        custom: bank.custom,
        totalMarks: bank.questions.reduce((s, q) => s + q.marks, 0),
      });
      return;
    }

    /* باقي العمليات للمعلم فقط */
    const token = await tokenFromReq(req);
    if (!token) { json(res, 401, { error: 'انتهت الجلسة — سجّل الدخول مجددًا' }); return; }

    if (req.method === 'PUT') {
      const body = parseBody<{ questions?: unknown }>(req);
      const bank = validateBank(body.questions);
      await db()`INSERT INTO settings (key, value) VALUES ('custom_questions', ${JSON.stringify(bank)}::jsonb)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      json(res, 200, { ok: true, count: bank.length });
      return;
    }

    if (req.method === 'DELETE') {
      await db()`DELETE FROM settings WHERE key = 'custom_questions'`;
      json(res, 200, { ok: true, questions: QUESTIONS, custom: false });
      return;
    }

    json(res, 405, { error: 'طريقة غير مدعومة' });
  } catch (e) {
    json(res, 400, { error: e instanceof Error ? e.message : 'خطأ في الخادم' });
  }
}
