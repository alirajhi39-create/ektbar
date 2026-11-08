/* اختبار محرك استيراد الأسئلة: جداول Excel/CSV + نصوص Word/PDF الحرة */
import { parseRows, mergeBanks } from '../src/lib/importQuestions';
import { QUESTIONS } from '../src/data/questions';

const table = [
  ['السؤال', 'أ', 'ب', 'ج', 'د', 'الإجابة الصحيحة', 'الوحدة', 'التفسير'],
  ['كم سنة يتكون منها القرن الواحد؟', '10 سنوات', '50 سنة', '100 سنة', '1000 سنة', 'ج', 'التاريخ', 'القرن يساوي مئة سنة.'],
  ['كانت الدرعية عاصمة الدولة السعودية الأولى.', '', '', '', '', 'صح', 'الدولة السعودية الأولى', 'صح — الدرعية هي العاصمة.'],
  ['ما عاصمة الدولة السعودية الثانية؟', 'الدرعية', 'مكة المكرمة', 'الأحساء', 'الرياض', 'د', 'الدولة السعودية الثانية', 'الرياض هي العاصمة.'],
];

const r1 = parseRows(table);
console.log('TABLE  → أسئلة:', r1.questions.length, '| تحذيرات:', r1.warnings.length);
console.log('  #1:', r1.questions[0]?.type, '| correctIndex:', (r1.questions[0] as { correctIndex?: number })?.correctIndex, '| وحدة:', r1.questions[0]?.unit);
console.log('  #2:', r1.questions[1]?.type, '| correctBool:', (r1.questions[1] as { correctBool?: boolean })?.correctBool);
console.log('  #3:', r1.questions[2]?.type, '| correctIndex:', (r1.questions[2] as { correctIndex?: number })?.correctIndex, '| وحدة:', r1.questions[2]?.unit);

const free = [
  'السؤال 1: ما المقصود بالتاريخ؟',
  'أ) دراسة الظواهر الطبيعية فقط',
  'ب) تدوين الأحداث الماضية وتفسيرها',
  'ج) دراسة الأعداد',
  'د) وصف الطقس',
  'الإجابة الصحيحة: ب',
  'التفسير: التاريخ تدوين أحداث الماضي وتفسيرها',
  'الوحدة: التاريخ',
  '',
  'السؤال 2: الدرعية عاصمة الدولة السعودية الأولى.',
  'الإجابة الصحيحة: خطأ',
  'الوحدة: الدولة السعودية الأولى',
  '',
  'السؤال 3: ما اسم السيف الذي اشتهر به الإمام تركي بن عبدالله؟',
  'أ) الصمصام', 'ب) الأجرب', 'ج) البتار', 'د) المهند',
  'الإجابة: ب',
];

const r2 = parseRows(free.map((l) => [l]));
console.log('FREE   → أسئلة:', r2.questions.length, '| تحذيرات:', r2.warnings.length);
console.log('  #1:', r2.questions[0]?.type, '| correctIndex:', (r2.questions[0] as { correctIndex?: number })?.correctIndex, '| خيارات:', r2.questions[0]?.options?.length);
console.log('  #2:', r2.questions[1]?.type, '| correctBool:', (r2.questions[1] as { correctBool?: boolean })?.correctBool, '| وحدة:', r2.questions[1]?.unit);
console.log('  #3:', r2.questions[2]?.type, '| correctIndex:', (r2.questions[2] as { correctIndex?: number })?.correctIndex, '| وحدة:', r2.questions[2]?.unit);

const merged = mergeBanks(QUESTIONS, r1.questions);
console.log('MERGE  →', QUESTIONS.length, '+', r1.questions.length, '=', merged.length, '| آخر معرف:', merged.at(-1)?.id, '| لا تضارب:', new Set(merged.map((q) => q.id)).size === merged.length);
console.log('MARKS  → كل الأسئلة درجتان:', merged.every((q) => q.marks === 2));
