import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, ensureSchema, getBank, gradeAnswers, json, parseBody, tokenFromReq, type IncomingAnswer } from './_lib/core';

interface SubmitBody {
  id?: string;
  studentName?: string;
  className?: string;
  durationSec?: number;
  answers?: IncomingAnswer[];
}

interface ResultRow {
  id: string; student_name: string; class_name: string; score: number; total: number;
  correct: number; wrong: number; unanswered: number; percentage: number;
  duration_sec: number; details: unknown; date_iso: string;
}

const mapRow = (r: ResultRow) => ({
  id: r.id,
  studentName: r.student_name,
  className: r.class_name,
  score: Number(r.score),
  total: Number(r.total),
  correct: Number(r.correct),
  wrong: Number(r.wrong),
  unanswered: Number(r.unanswered),
  percentage: Number(r.percentage),
  durationSec: Number(r.duration_sec),
  details: r.details,
  dateISO: String(r.date_iso),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();

    /* تسليم اختبار: عام — التصحيح يتم هنا في الخادم */
    if (req.method === 'POST') {
      const body = parseBody<SubmitBody>(req);
      const studentName = String(body.studentName ?? '').trim();
      const className = String(body.className ?? '').trim().slice(0, 60);
      const answers = Array.isArray(body.answers) ? body.answers : [];
      if (studentName.length < 2 || studentName.length > 80) { json(res, 400, { error: 'اسم الطالب مطلوب' }); return; }
      if (answers.length === 0) { json(res, 400, { error: 'لا توجد إجابات' }); return; }

      const { questions: bank } = await getBank();
      const graded = gradeAnswers(bank, answers);
      const id = String(body.id ?? '').slice(0, 40) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const durationSec = Math.min(Math.max(Number(body.durationSec) || 0, 0), 24 * 3600);

      /* ON CONFLICT = لا تُحتسب المحاولة مرتين */
      await db()`INSERT INTO results (id, student_name, class_name, score, total, correct, wrong, unanswered, percentage, duration_sec, details)
        VALUES (${id}, ${studentName}, ${className}, ${graded.score}, ${graded.total}, ${graded.correct}, ${graded.wrong}, ${graded.unanswered}, ${graded.percentage}, ${durationSec}, ${JSON.stringify(graded.details)}::jsonb)
        ON CONFLICT (id) DO NOTHING`;

      const rows = await db()`SELECT id, student_name, class_name, score, total, correct, wrong, unanswered, percentage, duration_sec, details, date_iso::text FROM results WHERE id = ${id} LIMIT 1`;
      const result = rows[0] ? mapRow(rows[0] as unknown as ResultRow) : { id, studentName, className, ...graded, durationSec, dateISO: new Date().toISOString() };
      /* نُرجع البنك الكامل بعد التسليم لعرض المراجعة والتصحيح */
      json(res, 200, { result, bank });
      return;
    }

    /* القراءة والحذف: للمعلم فقط */
    const token = await tokenFromReq(req);
    if (!token) { json(res, 401, { error: 'انتهت الجلسة — سجّل الدخول مجددًا' }); return; }

    if (req.method === 'GET') {
      const rows = await db()`SELECT id, student_name, class_name, score, total, correct, wrong, unanswered, percentage, duration_sec, details, date_iso::text FROM results ORDER BY date_iso DESC`;
      const bank = await getBank();
      json(res, 200, { attempts: rows.map((r) => mapRow(r as unknown as ResultRow)), bank: bank.questions, custom: bank.custom });
      return;
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id ?? '');
      if (id && id !== 'all') {
        await db()`DELETE FROM results WHERE id = ${id}`;
      } else {
        await db()`TRUNCATE TABLE results`;
      }
      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: 'طريقة غير مدعومة' });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : 'خطأ في الخادم' });
  }
}
