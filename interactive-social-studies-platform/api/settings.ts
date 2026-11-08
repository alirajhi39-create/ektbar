/* ═══ ملف مولّد تلقائيًا — مكتفٍ بذاته لضمان عمله على Vercel ═══
   لا تعدّله يدويًا: عدّل server/core.ts ثم شغّل npx tsx scripts/gen-api.ts */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
const QUESTIONS: Question[] = [{"id":1,"unit":"history","type":"mcq","marks":2,"question":"ما المقصود بالتاريخ؟","options":["دراسة الظواهر الطبيعية فقط","تدوين الأحداث التي حدثت في الماضي وتفسيرها","دراسة الأعداد والعمليات الحسابية","وصف حالة الطقس"],"correctIndex":1,"explanation":"التاريخ هو تدوين الأحداث التي حدثت في الماضي وتفسيرها؛ لنستفيد منها في فهم الحاضر."},{"id":2,"unit":"history","type":"mcq","marks":2,"question":"أي مما يأتي يُعد من فوائد دراسة التاريخ؟","options":["نسيان أحداث الماضي","معرفة أحوال الطقس","فهم الحاضر وتوقع المستقبل","إهمال تراث الأمم"],"correctIndex":2,"explanation":"من فوائد دراسة التاريخ: فهم الحاضر وتوقع المستقبل من خلال معرفة أحداث الماضي."},{"id":3,"unit":"history","type":"mcq","marks":2,"question":"كم سنة يتكون منها القرن الواحد؟","options":["10 سنوات","50 سنة","100 سنة","1000 سنة"],"correctIndex":2,"explanation":"القرن الواحد يساوي مئة (100) سنة."},{"id":4,"unit":"history","type":"mcq","marks":2,"question":"ماذا يُقصد بمصطلح العهد؟","options":["فترة ابتداء حاكم ونهايته","فترة ابتداء دولة ونهايتها","عشر سنوات","مئة سنة"],"correctIndex":0,"explanation":"العهد هو الفترة الزمنية من بداية حكم الحاكم إلى نهايته."},{"id":5,"unit":"history","type":"mcq","marks":2,"question":"إلى أي العصور ينتمي العصر الحجري؟","options":["العصور الحديثة","العصور الإسلامية","العصور القديمة","عصور ما قبل التاريخ"],"correctIndex":3,"explanation":"العصر الحجري ينتمي إلى عصور ما قبل التاريخ؛ أي قبل اختراع الكتابة."},{"id":6,"unit":"first","type":"mcq","marks":2,"question":"كيف كانت الحالة السياسية في شبه الجزيرة العربية قبل قيام الدولة السعودية الأولى؟","options":["كانت تخضع لحكومة موحدة","كانت تعاني الانقسامات والنزاعات","كانت جميع مناطقها مستقرة","لم توجد فيها إمارات محلية"],"correctIndex":1,"explanation":"كانت شبه الجزيرة العربية تعاني الانقسامات والنزاعات بين الإمارات المحلية لغياب الدولة الموحدة."},{"id":7,"unit":"first","type":"mcq","marks":2,"question":"من مؤسس الدرعية عام 850هـ؟","options":["الإمام تركي بن عبدالله","الإمام سعود بن عبدالعزيز","مانع المريدي","الإمام عبدالله بن سعود"],"correctIndex":2,"explanation":"مانع المريدي هو مؤسس مدينة الدرعية عام 850هـ."},{"id":8,"unit":"first","type":"mcq","marks":2,"question":"من مؤسس الدولة السعودية الأولى؟","options":["الإمام محمد بن سعود","الإمام فيصل بن تركي","الملك عبدالعزيز بن عبدالرحمن","الإمام عبدالله بن سعود"],"correctIndex":0,"explanation":"الإمام محمد بن سعود هو مؤسس الدولة السعودية الأولى."},{"id":9,"unit":"first","type":"mcq","marks":2,"question":"في أي عام تأسست الدولة السعودية الأولى؟","options":["850هـ","1157هـ","1240هـ","1139هـ"],"correctIndex":3,"explanation":"تأسست الدولة السعودية الأولى عام 1139هـ وعاصمتها الدرعية."},{"id":10,"unit":"first","type":"mcq","marks":2,"question":"أي أئمة الدولة السعودية الأولى عُرف عهده بالفترة الذهبية للدولة؟","options":["الإمام عبدالله بن سعود","الإمام سعود بن عبدالعزيز","الإمام محمد بن سعود","الإمام عبدالعزيز بن محمد"],"correctIndex":1,"explanation":"عُرف عهد الإمام سعود بن عبدالعزيز بالفترة الذهبية للدولة السعودية الأولى."},{"id":11,"unit":"second","type":"mcq","marks":2,"question":"من مؤسس الدولة السعودية الثانية؟","options":["الإمام سعود بن عبدالعزيز","الإمام محمد بن سعود","الإمام تركي بن عبدالله","الإمام عبدالله بن فيصل"],"correctIndex":2,"explanation":"الإمام تركي بن عبدالله هو مؤسس الدولة السعودية الثانية."},{"id":12,"unit":"second","type":"mcq","marks":2,"question":"في أي عام تأسست الدولة السعودية الثانية؟","options":["1240هـ","1139هـ","850هـ","1233هـ"],"correctIndex":0,"explanation":"تأسست الدولة السعودية الثانية عام 1240هـ على يد الإمام تركي بن عبدالله."},{"id":13,"unit":"second","type":"mcq","marks":2,"question":"ما عاصمة الدولة السعودية الثانية؟","options":["الدرعية","مكة المكرمة","الأحساء","الرياض"],"correctIndex":3,"explanation":"اتخذت الدولة السعودية الثانية مدينة الرياض عاصمةً لها."},{"id":14,"unit":"second","type":"mcq","marks":2,"question":"ما اسم السيف الذي اشتهر به الإمام تركي بن عبدالله؟","options":["الصمصام","الأجرب","البتار","المهند"],"correctIndex":1,"explanation":"اشتهر الإمام تركي بن عبدالله بسيفه الملقّب بـ \"الأجرب\"."},{"id":15,"unit":"second","type":"mcq","marks":2,"question":"أي مما يأتي يُعد من مظاهر اهتمام الدولتين السعوديتين بالتعليم؟","options":["إغلاق دور العلم","التقليل من نسخ الكتب","إنشاء دور العلم والمكتبات","منع المجالس العلمية"],"correctIndex":2,"explanation":"اهتمت الدولتان السعوديتان بالتعليم، فأنشأتا دور العلم والمكتبات وشجعتا نسخ الكتب."},{"id":16,"unit":"history","type":"tf","marks":2,"question":"يساعد التاريخ على تعزيز الهوية والمواطنة.","correctBool":true,"explanation":"صح — دراسة التاريخ تعزز الهوية الوطنية وقيم المواطنة والانتماء."},{"id":17,"unit":"history","type":"tf","marks":2,"question":"العقد يساوي مئة سنة.","correctBool":false,"explanation":"التصحيح: العقد يساوي عشر سنوات."},{"id":18,"unit":"history","type":"tf","marks":2,"question":"العصر هو فترة ابتداء دولة ونهايتها.","correctBool":true,"explanation":"صح — العصر هو الفترة الزمنية من قيام الدولة إلى نهايتها."},{"id":19,"unit":"history","type":"tf","marks":2,"question":"السنة 1351هـ تقع في القرن الثالث عشر الهجري.","correctBool":false,"explanation":"التصحيح: السنة 1351هـ تقع في القرن الرابع عشر الهجري."},{"id":20,"unit":"history","type":"tf","marks":2,"question":"يُعد العصر الأموي من العصور الإسلامية.","correctBool":true,"explanation":"صح — العصر الأموي يُعد من العصور الإسلامية."},{"id":21,"unit":"first","type":"tf","marks":2,"question":"أدى غياب الدولة الموحدة قبل الدولة السعودية الأولى إلى ضعف النشاط التجاري.","correctBool":true,"explanation":"صح — غياب الدولة الموحدة أضعف الأمن والاستقرار، فقلَّ النشاط التجاري."},{"id":22,"unit":"first","type":"tf","marks":2,"question":"تأسست الدرعية على يد مانع المريدي عام 1139هـ.","correctBool":false,"explanation":"التصحيح: أسس مانع المريدي الدرعية عام 850هـ."},{"id":23,"unit":"first","type":"tf","marks":2,"question":"كانت الدرعية عاصمة الدولة السعودية الأولى.","correctBool":true,"explanation":"صح — كانت الدرعية عاصمة الدولة السعودية الأولى."},{"id":24,"unit":"first","type":"tf","marks":2,"question":"قدم الشيخ محمد بن عبدالوهاب إلى الدرعية عام 1157هـ.","correctBool":true,"explanation":"صح — قدم الشيخ محمد بن عبدالوهاب إلى الدرعية عام 1157هـ."},{"id":25,"unit":"first","type":"tf","marks":2,"question":"انتهت الدولة السعودية الأولى في عهد الإمام محمد بن سعود.","correctBool":false,"explanation":"التصحيح: انتهت الدولة السعودية الأولى في عهد الإمام عبدالله بن سعود عام 1233هـ."},{"id":26,"unit":"second","type":"tf","marks":2,"question":"تمكن الإمام تركي بن عبدالله من إعادة تأسيس الدولة السعودية عام 1240هـ.","correctBool":true,"explanation":"صح — أعاد الإمام تركي بن عبدالله تأسيس الدولة السعودية عام 1240هـ."},{"id":27,"unit":"second","type":"tf","marks":2,"question":"اتخذت الدولة السعودية الثانية الدرعية عاصمة لها.","correctBool":false,"explanation":"التصحيح: اتخذت الدولة السعودية الثانية الرياض عاصمة لها."},{"id":28,"unit":"second","type":"tf","marks":2,"question":"من صفات الإمام تركي بن عبدالله الشجاعة والتخطيط والعدل.","correctBool":true,"explanation":"صح — اتّصف الإمام تركي بن عبدالله بالشجاعة وحسن التخطيط والعدل."},{"id":29,"unit":"second","type":"tf","marks":2,"question":"كان بيت المال مخصصًا لموارد الدولة ومصروفاتها.","correctBool":true,"explanation":"صح — خُصّص بيت المال لموارد الدولة ومصروفاتها."},{"id":30,"unit":"second","type":"tf","marks":2,"question":"لم تهتم الدولتان السعوديتان الأولى والثانية بخدمة الحجاج وتوفير الأمن لهم.","correctBool":false,"explanation":"التصحيح: اهتمت الدولتان السعوديتان بخدمة الحجاج وتوفير الأمن لهم."}];
export type UnitKey = 'history' | 'first' | 'second';
export type QuestionType = 'mcq' | 'tf';
export interface Question {
  id: number; unit: UnitKey; type: QuestionType; question: string;
  options?: string[]; correctIndex?: number; correctBool?: boolean;
  marks: number; explanation: string;
}

/* ─── اتصال Neon — يقبل جميع أسماء المتغيرات الشائعة ─── */
type Sql = NeonQueryFunction<false, false>;
let cached: Sql | null = null;

const ENV_KEYS = ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING'];

function connectionString(): string {
  for (const key of ENV_KEYS) {
    const v = process.env[key];
    if (typeof v === 'string' && v.trim().startsWith('postgres')) return v.trim();
  }
  return '';
}

export function db(): Sql {
  const url = connectionString();
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

/* ═══ نهاية الكود المشترك — يبدأ كود الدالة ═══ */
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
