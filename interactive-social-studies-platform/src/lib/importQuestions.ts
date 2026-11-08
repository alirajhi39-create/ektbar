import type { Question, UnitKey } from '../types';
import { unzipSync, strFromU8 } from 'fflate';

/**
 * محرك استيراد الأسئلة من: PDF · Word (docx) · Excel/CSV · نص
 * يعمل بالكامل داخل المتصفح، ولا يرفع الملف إلى أي خادم.
 */

export interface ImportResult {
  questions: Question[];
  warnings: string[];
  sourceLabel: string;
}

export const SUPPORTED_EXTENSIONS = '.pdf,.docx,.xlsx,.xls,.csv,.txt';

/* ───────────────── أدوات مساعدة ───────────────── */

const norm = (s: unknown): string => String(s ?? '')
  .replace(/[\u200e\u200f\u202a-\u202e\uFEFF]/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د'];

/** إزالة بادئة الترقيم من بداية السؤال */
function stripNumber(s: string): string {
  return s
    .replace(/^\s*(?:السؤال\s*)?[سص]?\s*\d{1,3}\s*[.):\-ـ،,]?\s*/u, '')
    .replace(/^\s*Q\s*\d+\s*[.):\-]?\s*/i, '')
    .trim();
}

/** عناصر XML بأسماء مؤهلة أو مهملة */
function els(node: Element | Document, name: string): Element[] {
  const a = Array.from(node.getElementsByTagName(`w:${name}`));
  if (a.length) return a;
  return Array.from(node.getElementsByTagNameNS('*', name));
}

/* ───────────────── قراءة الملفات ───────────────── */

/** Excel / CSV → صفوف خلايا */
async function readSpreadsheet(buf: ArrayBuffer): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buf, { type: 'array', codepage: 65001 });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('لم يتم العثور على ورقة بيانات في الملف');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  return rows.map((r) => r.map(norm)).filter((r) => r.some(Boolean));
}

/** Word docx → جداول إن وُجدت، وإلا فقرات */
function readDocx(buf: ArrayBuffer): string[][] {
  const files = unzipSync(new Uint8Array(buf));
  const entry = files['word/document.xml'];
  if (!entry) throw new Error('ملف Word غير صالح أو محمي');
  const xml = strFromU8(entry);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('تعذر قراءة محتوى ملف Word');

  const tableRows = els(doc, 'tr');
  if (tableRows.length > 0) {
    const rows: string[][] = [];
    for (const tr of tableRows) {
      const cells = els(tr, 'tc').map((tc) => els(tc, 't').map((t) => t.textContent ?? '').join('').trim());
      if (celsHaveText(cells)) rows.push(cells.map(norm));
    }
    if (rows.length) return rows;
  }

  return els(doc, 'p')
    .map((p) => [norm(els(p, 't').map((t) => t.textContent ?? '').join(''))])
    .filter((r) => r[0]);
}

const celsHaveText = (cells: string[]) => cells.some((c) => c.trim().length > 0);

/** PDF → أسطر نصية مجمّعة حسب الإحداثي الرأسي */
async function readPdf(buf: ArrayBuffer): Promise<string[]> {
  /* pdfjs 5 يحتاج Promise.withResolvers — متاح في المتصفحات الحديثة، نضيفه للأقدم */
  const P = Promise as unknown as { withResolvers?: <T>() => { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } };
  if (typeof P.withResolvers !== 'function') {
    P.withResolvers = function <T>() {
      let resolve!: (v: T) => void;
      let reject!: (e: unknown) => void;
      const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    };
  }
  const pdfjs = await import('pdfjs-dist');
  const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker&inline');
  pdfjs.GlobalWorkerOptions.workerPort = new workerModule.default();

  const task = pdfjs.getDocument({ data: new Uint8Array(buf), disableFontFace: true, isEvalSupported: false });
  const doc = await task.promise;
  const lines: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const byY = new Map<number, { x: number; text: string }[]>();
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const y = Math.round(((item as { transform?: number[] }).transform?.[5] ?? 0) / 3) * 3;
        const x = (item as { transform?: number[] }).transform?.[4] ?? 0;
        const arr = byY.get(y) ?? [];
        arr.push({ x, text: item.str });
        byY.set(y, arr);
      }
      const ys = [...byY.keys()].sort((a, b) => b - a); // من أعلى الصفحة
      for (const y of ys) {
        const parts = (byY.get(y) ?? []).sort((a, b) => b.x - a.x); // RTL: الأيمن أولًا
        const line = norm(parts.map((p) => p.text).join(' '));
        if (line) lines.push(line);
      }
    }
  } finally {
    await doc.destroy();
  }
  if (!lines.length) throw new Error('لم يُعثر على نص قابل للقراءة في PDF — إن كان الملف صورًا ممسوحة ضوئيًا فاستخدم Word أو Excel');
  return lines;
}

/* ───────────────── تحليل المحتوى ───────────────── */

const RE_OPT = /^\s*[أ-دآإابةتثＡ-Ｄa-dA-D1-4]\s*[)\].:ـ\-]\s*(.+)$/u;
const RE_ANS = /^\s*(?:الإجابة\s*(?:الصحيحة)?|الاجابة\s*(?:الصحيحة)?|الصحيحة|الجواب|answer|correct|key)\s*[:\-]?\s*(.+)$/iu;
const RE_EXP = /^\s*(?:التفسير|الشرح|التعليق|explanation|note)\s*[:\-]?\s*(.+)$/iu;
const RE_UNIT = /^\s*(?:الوحدة|unit)\s*[:\-]?\s*(.+)$/iu;
const RE_TYPE = /^\s*(?:النوع|type)\s*[:\-]?\s*(.+)$/iu;
const RE_QUESTION_PREFIX = /^\s*(?:السؤال|سؤال|[سص]\s*\d+|Q\s*\d+|\d{1,3})\s*[.):\-ـ،,]?\s*(.*)$/iu;

function optionIndex(raw: string): number | null {
  const s = norm(raw).replace(/[)\].:ـ\-]/g, '').trim();
  const first = s.charAt(0);
  const idx = ARABIC_LETTERS.indexOf(first);
  if (idx >= 0) return idx;
  const latin = 'ABCDabcd'.indexOf(first);
  if (latin >= 0) return latin % 4;
  const n = Number(s);
  if (Number.isInteger(n) && n >= 1 && n <= 4) return n - 1;
  return null;
}

function isTrueFalse(v: string): boolean | null {
  const s = norm(v).toLowerCase();
  if (/^(صح|صحيح|صحيحة|true|t|yes|✓|1)$/.test(s)) return true;
  if (/^(خطأ|خطا|خاطئ|false|f|no|✗|0|خ)$/.test(s)) return false;
  return null;
}

function detectUnit(text: string, declared?: string): UnitKey {
  const s = `${declared ?? ''} ${text}`;
  if (/الثانية|تركي بن عبدالله|الرياض|1240|الأجرب|بيت المال/.test(s)) return 'second';
  if (/الأولى|الدرعية|محمد بن سعود|1139|مانع المريدي|1157/.test(s)) return 'first';
  if (/التاريخ|القرن|العقد|العهد|العصر|الحجري/.test(s)) return 'history';
  return 'history';
}

function resolveAnswer(raw: string, options: string[]): { index?: number; bool?: boolean } {
  const s = norm(raw);
  const idx = optionIndex(s);
  if (idx !== null && idx < options.length) return { index: idx };
  const byText = options.findIndex((o) => norm(o) === s);
  if (byText >= 0) return { index: byText };
  const bool = isTrueFalse(s);
  if (bool !== null) return { bool };
  // «ب) تدوين الأحداث» أو «ب : ...»
  const m = s.match(/^\s*([أ-دa-dA-D1-4])\s*[)\].:ـ\-]?\s*/u);
  if (m) {
    const i = optionIndex(m[1]);
    if (i !== null && i < options.length) return { index: i };
  }
  return {};
}

interface Draft {
  question: string;
  options: string[];
  answerRaw: string;
  explanation: string;
  unitRaw: string;
  typeRaw: string;
}

function draftToQuestion(d: Draft, id: number): { q?: Question; warn?: string } {
  const question = stripNumber(norm(d.question));
  if (question.length < 5) return {};
  const options = d.options.map(norm).filter(Boolean);
  const answerRaw = norm(d.answerRaw);
  const ans = resolveAnswer(answerRaw, options);
  const tf = isTrueFalse(answerRaw) !== null || /صح\s*أو\s*خطأ|صح\/خطأ|true.?false/i.test(d.typeRaw);
  const explanation = norm(d.explanation) ||
    (options.length && ans.index !== undefined
      ? `الإجابة الصحيحة: ${options[ans.index]}`
      : ans.bool !== undefined
        ? `الإجابة الصحيحة: ${ans.bool ? 'صح' : 'خطأ'}`
        : 'راجع الدرس للتحقق من الإجابة.');

  if (tf || options.length === 0) {
    if (ans.bool === undefined) return { warn: `«${question.slice(0, 35)}…» استُبعد: الإجابة غير محددة (اكتب صح أو خطأ)` };
    return {
      q: { id, unit: detectUnit(question, d.unitRaw), type: 'tf', marks: 2, question, correctBool: ans.bool, explanation },
    };
  }
  if (options.length !== 4) return { warn: `«${question.slice(0, 35)}…» استُبعد: يلزم 4 خيارات (وُجد ${options.length})` };
  if (ans.index === undefined) return { warn: `«${question.slice(0, 35)}…» استُبعد: لم تُحدد الإجابة الصحيحة` };
  return {
    q: {
      id, unit: detectUnit(question, d.unitRaw), type: 'mcq', marks: 2,
      question, options, correctIndex: ans.index, explanation,
    },
  };
}

/** الصيغة الحرة: سؤال → خيارات → الإجابة → التفسير */
function parseFreeText(lines: string[]): ImportResult {
  const warnings: string[] = [];
  const drafts: Draft[] = [];
  let cur: Draft | null = null;

  const push = () => {
    if (cur) drafts.push(cur);
    cur = null;
  };
  const ensure = (): Draft => {
    if (!cur) cur = { question: '', options: [], answerRaw: '', explanation: '', unitRaw: '', typeRaw: '' };
    return cur;
  };

  for (const raw of lines) {
    const line = norm(raw);
    if (!line) continue;

    const mAns = line.match(RE_ANS);
    if (mAns) { ensure().answerRaw = mAns[1]; continue; }
    const mExp = line.match(RE_EXP);
    if (mExp) { ensure().explanation = mExp[1]; continue; }
    const mUnit = line.match(RE_UNIT);
    if (mUnit) { ensure().unitRaw = mUnit[1]; continue; }
    const mType = line.match(RE_TYPE);
    if (mType) { ensure().typeRaw = mType[1]; continue; }

    // سؤال مرقّم صراحةً (1) / س1 / السؤال 2:) — لا يُعامل كخيار
    const numbered = /^\s*(?:السؤال\s*)?[سص]?\s*\d{1,3}\s*[.):\-ـ،,]\s*\S/u.test(line);
    if (numbered) {
      push();
      const m = line.match(RE_QUESTION_PREFIX);
      ensure().question = m?.[1] || line;
      continue;
    }

    const mOpt = line.match(RE_OPT);
    if (mOpt) {
      const d = ensure();
      if (d.options.length < 4) {
        d.options.push(mOpt[1]);
        continue;
      }
    }

    // سطر جديد = سؤال جديد
    push();
    const mQ = line.match(RE_QUESTION_PREFIX);
    ensure().question = mQ && mQ[1] ? mQ[1] : line;
  }
  push();

  const questions: Question[] = [];
  const seen = new Set<string>();
  for (const d of drafts) {
    const { q, warn } = draftToQuestion(d, questions.length + 1);
    if (warn) { warnings.push(warn); continue; }
    if (!q) continue;
    const key = q.question.toLowerCase();
    if (seen.has(key)) { warnings.push(`تم تجاهل سؤال مكرر: «${q.question.slice(0, 30)}…»`); continue; }
    seen.add(key);
    questions.push(q);
  }
  return { questions, warnings, sourceLabel: 'نص حر' };
}

/** صيغة الجدول: رؤوس أعمدة + صفوف */
function parseTable(rows: string[][]): ImportResult {
  const warnings: string[] = [];
  const headerIdx = rows.findIndex((r) => r.some((c) => /سؤال|question|text/i.test(c)));
  if (headerIdx < 0) return { questions: [], warnings, sourceLabel: 'جدول' };
  const header = rows[headerIdx].map((h) => norm(h).toLowerCase());
  const find = (patterns: RegExp[]) => header.findIndex((h) => patterns.some((p) => p.test(h)));
  const colQ = find([/سؤال|question|نص/]);
  if (colQ < 0) return { questions: [], warnings, sourceLabel: 'جدول' };
  const colA = find([/^أ$|^ا$|خيار.?1|option.?1|^a$/]);
  const colB = find([/^ب$|خيار.?2|option.?2|^b$/]);
  const colC = find([/^ج$|خيار.?3|option.?3|^c$/]);
  const colD = find([/^د$|خيار.?4|option.?4|^d$/]);
  const colAns = find([/إجابة|اجابة|صحيحة|answer|correct|key/]);
  const colUnit = find([/وحدة|unit/]);
  const colExp = find([/تفسير|شرح|explanation|note/]);
  const colType = find([/نوع|type/]);
  const cell = (r: string[], i: number) => (i >= 0 ? norm(r[i]) : '');

  const questions: Question[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(headerIdx + 1)) {
    const d: Draft = {
      question: cell(r, colQ),
      options: [colA, colB, colC, colD].map((i) => cell(r, i)).filter(Boolean),
      answerRaw: cell(r, colAns),
      explanation: cell(r, colExp),
      unitRaw: cell(r, colUnit),
      typeRaw: cell(r, colType),
    };
    if (!d.question) continue;
    const { q, warn } = draftToQuestion(d, questions.length + 1);
    if (warn) { warnings.push(warn); continue; }
    if (!q) continue;
    const key = q.question.toLowerCase();
    if (seen.has(key)) { warnings.push(`سؤال مكرر تم تجاهله: «${q.question.slice(0, 30)}…»`); continue; }
    seen.add(key);
    questions.push(q);
  }
  return { questions, warnings, sourceLabel: 'جدول أعمدة' };
}

/* ───────────────── الدالة العامة ───────────────── */

/** تحليل صفوف جاهزة (قابل للاختبار ومستقل عن نوع الملف) */
export function parseRows(rows: string[][]): ImportResult {
  if (!rows.length) throw new Error('لا توجد بيانات');
  const looksTable = rows.filter((r) => r.length > 1).length >= Math.min(2, rows.length);
  let result = looksTable ? parseTable(rows) : parseFreeText(rows.map((r) => r.join(' | ')));
  if (!result.questions.length && looksTable) {
    result = parseFreeText(rows.map((r) => r.join(' | ')));
  }
  if (!result.questions.length) {
    throw new Error(
      'لم يتم التعرف على أسئلة. تأكد من الصيغة أو حمّل «نموذج CSV» واملأه. ' +
      (result.warnings[0] ? `(${result.warnings[0]})` : '')
    );
  }
  return result;
}

export async function parseQuestionFile(file: File): Promise<ImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const buf = await file.arrayBuffer();
  let rows: string[][] = [];
  let label = ext.toUpperCase();

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    rows = await readSpreadsheet(buf);
  } else if (ext === 'docx') {
    rows = readDocx(buf);
  } else if (ext === 'pdf') {
    rows = (await readPdf(buf)).map((l) => [l]);
  } else if (ext === 'txt') {
    rows = norm(new TextDecoder('utf-8').decode(buf)).split(/\r?\n/).map((l) => [l]);
  } else {
    throw new Error('صيغة غير مدعومة — استخدم PDF أو Word (.docx) أو Excel (.xlsx/.csv) أو txt');
  }

  if (!rows.length) throw new Error('الملف فارغ أو لا يحتوي على نصوص قابلة للقراءة');
  const result = parseRows(rows);
  return { ...result, sourceLabel: `${label} · ${result.sourceLabel}` };
}

/** توليد نموذج Excel/CSV جاهز للتعبئة */
export function downloadTemplate(): void {
  const rows = [
    ['السؤال', 'أ', 'ب', 'ج', 'د', 'الإجابة الصحيحة', 'الوحدة', 'التفسير'],
    ['ما المقصود بالتاريخ؟', 'دراسة الظواهر الطبيعية فقط', 'تدوين الأحداث الماضية وتفسيرها', 'دراسة الأعداد', 'وصف الطقس', 'ب', 'التاريخ', 'التاريخ هو تدوين أحداث الماضي وتفسيرها.'],
    ['يساعد التاريخ على تعزيز الهوية والمواطنة.', '', '', '', '', 'صح', 'التاريخ', 'صح — دراسة التاريخ تعزز الانتماء الوطني.'],
  ];
  const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'نموذج-استيراد-الأسئلة.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** إعادة ترقيم الأسئلة عند إضافتها لبنك موجود */
export function mergeBanks(existing: Question[], incoming: Question[]): Question[] {
  const start = existing.length ? Math.max(...existing.map((q) => q.id)) + 1 : 1;
  const added = incoming.map((q, i) => ({ ...q, id: start + i }));
  return [...existing, ...added].sort((a, b) => a.id - b.id);
}
