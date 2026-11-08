import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { QUESTIONS } from '../../src/data/questions';
import type { Question } from '../../src/types';

/* ─── اتصال Neon ─── */
type Sql = NeonQueryFunction<false, false>;
let cached: Sql | null = null;

export function db(): Sql {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!url) throw new Error('DATABASE_URL غير مضبوطة في إعدادات Vercel');
  if (!cached) cached = neon(url);
  return cached;
}

/* ─── إنشاء الجداول تلقائيًا عند أول طلب ─── */
let schemaReady = false;
export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const s = db();
  await s`CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    salt TEXT NOT NULL,
    hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await s`CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires TIMESTAMPTZ NOT NULL
  )`;
  await s`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
  )`;
  await s`CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL DEFAULT '',
    score INT NOT NULL,
    total INT NOT NULL,
    correct INT NOT NULL,
    wrong INT NOT NULL,
    unanswered INT NOT NULL,
    percentage REAL NOT NULL,
    duration_sec INT NOT NULL DEFAULT 0,
    details JSONB NOT NULL,
    date_iso TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  schemaReady = true;
}

/* ─── أدوات الاستجابة ─── */
export function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

export function parseBody<T = Record<string, unknown>>(req: VercelRequest): T {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) as T; } catch { return {} as T; }
  }
  return (req.body ?? {}) as T;
}

/* ─── تشفير كلمات المرور (scrypt + ملح عشوائي) ─── */
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const computed = scryptSync(password, salt, 32);
  const stored = Buffer.from(hash, 'hex');
  return stored.length === computed.length && timingSafeEqual(computed, stored);
}

const sha256 = (x: string) => createHash('sha256').update(x).digest('hex');

/* ─── جلسات المعلم (رمز عشوائي يُخزّن مجزأ، صلاحية 24 ساعة) ─── */
export async function createSessionToken(): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await db()`INSERT INTO sessions (token_hash, expires) VALUES (${sha256(token)}, now() + interval '24 hours')`;
  return token;
}

export async function tokenFromReq(req: VercelRequest): Promise<string | null> {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const rows = await db()`SELECT token_hash FROM sessions WHERE token_hash = ${sha256(token)} AND expires > now()`;
  return rows.length > 0 ? token : null;
}

export async function destroySession(token: string): Promise<void> {
  await db()`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
}

/* ─── بنك الأسئلة: الافتراضي من الكود + المعدّل من القاعدة ─── */
export async function getBank(): Promise<{ questions: Question[]; custom: boolean }> {
  const rows = await db()`SELECT value FROM settings WHERE key = 'custom_questions'`;
  const value = rows[0]?.value as unknown;
  if (Array.isArray(value) && value.length > 0) {
    return { questions: value as Question[], custom: true };
  }
  return { questions: QUESTIONS, custom: false };
}

/** نسخة الطالب: بلا إجابات ولا تفسيرات */
export function sanitizeBank(qs: Question[]) {
  return qs.map(({ id, unit, type, question, marks, options }) => ({
    id, unit, type, question, marks,
    ...(type === 'mcq' && options ? { options } : {}),
  }));
}

/** تحقق صارم من بنك أسئلة قادم من المعلم */
export function validateBank(input: unknown): Question[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error('البنك يجب أن يحتوي على سؤال واحد على الأقل');
  const units = new Set(['history', 'first', 'second']);
  return input.map((raw, i) => {
    const q = raw as Partial<Question>;
    const id = Number(q.id);
    if (!Number.isInteger(id) || id < 1) throw new Error(`السؤال ${i + 1}: رقم غير صالح`);
    if (!units.has(String(q.unit))) throw new Error(`السؤال ${i + 1}: وحدة غير صالحة`);
    if (q.type !== 'mcq' && q.type !== 'tf') throw new Error(`السؤال ${i + 1}: نوع غير صالح`);
    if (typeof q.question !== 'string' || q.question.trim().length < 5) throw new Error(`السؤال ${i + 1}: نص قصير`);
    if (typeof q.explanation !== 'string' || !q.explanation.trim()) throw new Error(`السؤال ${i + 1}: التفسير مطلوب`);
    if (q.type === 'mcq') {
      const opts = (q.options ?? []).map((o) => String(o).trim());
      if (opts.length !== 4 || opts.some((o) => !o)) throw new Error(`السؤال ${i + 1}: يلزم 4 خيارات مكتملة`);
      const ci = Number(q.correctIndex);
      if (!Number.isInteger(ci) || ci < 0 || ci > 3) throw new Error(`السؤال ${i + 1}: إجابة صحيحة غير محددة`);
      return { id, unit: q.unit, type: 'mcq', marks: 2, question: q.question.trim(), options: opts, correctIndex: ci, explanation: q.explanation.trim() } as Question;
    }
    return { id, unit: q.unit, type: 'tf', marks: 2, question: q.question.trim(), correctBool: Boolean(q.correctBool), explanation: q.explanation.trim() } as Question;
  });
}

/* ─── التصحيح الآمن جهة الخادم ─── */
export interface IncomingAnswer { id: number; a: number | boolean | null }

export function gradeAnswers(bank: Question[], answers: IncomingAnswer[]) {
  const map = new Map(bank.map((q) => [q.id, q]));
  let score = 0, correct = 0, wrong = 0, unanswered = 0, total = 0;
  const seen = new Set<number>();

  const details = answers.map(({ id, a }) => {
    const q = map.get(id);
    if (!q || seen.has(id)) return { id, a: a ?? null, ok: false }; // منع الاحتساب المكرر
    seen.add(id);
    total += q.marks;
    if (a === null || a === undefined) { unanswered++; return { id, a: null, ok: false }; }
    const ok = q.type === 'mcq' ? a === q.correctIndex : a === q.correctBool;
    if (ok) { score += q.marks; correct++; } else { wrong++; }
    return { id, a, ok };
  });

  return { score, total, correct, wrong, unanswered, percentage: total > 0 ? (score / total) * 100 : 0, details };
}
