/**
 * يُولّد دوال api/ مستقلة تمامًا بلا أي استيراد نسبي.
 * سبب وجوده: Vercel لا يُضمّن مجلد api/_lib مع حزمة الدالة → FUNCTION_INVOCATION_FAILED.
 * شغّله بعد أي تعديل على src/data/questions.ts:  npx tsx scripts/gen-api.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { QUESTIONS } from '../src/data/questions';

const TYPE_DEFS = `export type UnitKey = 'history' | 'first' | 'second';
export type QuestionType = 'mcq' | 'tf';
export interface Question {
  id: number; unit: UnitKey; type: QuestionType; question: string;
  options?: string[]; correctIndex?: number; correctBool?: boolean;
  marks: number; explanation: string;
}`;

const MARKER = '/* ═══ نهاية الكود المشترك — يبدأ كود الدالة ═══ */';

const coreRaw = readFileSync('server/core.ts', 'utf8');
const core = coreRaw
  .replace("import { QUESTIONS } from './defaultQuestions';", `const QUESTIONS: Question[] = ${JSON.stringify(QUESTIONS)};`)
  .replace("import type { Question } from './defaultQuestions';", TYPE_DEFS)
  // الأنواع المستوردة من @vercel/node تُترك هنا مرة واحدة فقط
  + `\n${MARKER}\n`;

const banner = `/* ═══ ملف مولّد تلقائيًا — مكتفٍ بذاته لضمان عمله على Vercel ═══\n`
  + `   لا تعدّله يدويًا: عدّل server/core.ts ثم شغّل npx tsx scripts/gen-api.ts */\n`;

for (const name of ['auth', 'questions', 'results', 'settings']) {
  const path = `api/${name}.ts`;
  const raw = readFileSync(path, 'utf8');
  /* إن كان الملف مولّدًا سابقًا، نأخذ فقط الجزء الخاص بالدالة */
  let body = raw.includes(MARKER) ? raw.split(MARKER).slice(1).join(MARKER) : raw;
  // إزالة البانر القديم وكل الاستيرادات النسبية إلى _lib وتكرار أنواع Vercel
  body = body
    .replace(/^.*مولّد تلقائيًا.*\r?\n/gm, '')
    .replace(/^   لا تعدّله يدويًا.*\r?\n/gm, '')
    .replace(/^import \{[\s\S]*?\} from '\.\/_lib\/[^']*';\r?\n/gm, '')
    .replace(/^import .*from '\.\/_lib\/[^']*';\r?\n/gm, '')
    .replace(/^import type \{ VercelRequest, VercelResponse \} from '@vercel\/node';\r?\n/gm, '');
  writeFileSync(path, banner + core + body.trimStart(), 'utf8');
  console.log('✓', path, '→', (banner + core + body).length, 'حرف، بلا استيرادات نسبية');
}
