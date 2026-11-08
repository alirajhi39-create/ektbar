/* توليد نسخة مستقلة من بنك الأسئلة داخل api/_lib لضمان اكتفاء دوال Vercel ذاتيًا */
import { writeFileSync } from 'node:fs';
import { QUESTIONS } from '../src/data/questions';

const header = `/* ─── مولّد تلقائيًا من src/data/questions.ts عبر: npx tsx scripts/gen-api-bank.ts ─── */
/* لا تعدّل هذا الملف يدويًا؛ عدّل المصدر ثم أعد التوليد (الدوال على Vercel لا تستطيع استيراد src/) */

export type UnitKey = 'history' | 'first' | 'second';
export type QuestionType = 'mcq' | 'tf';

export interface Question {
  id: number;
  unit: UnitKey;
  type: QuestionType;
  question: string;
  options?: string[];
  correctIndex?: number;
  correctBool?: boolean;
  marks: number;
  explanation: string;
}

export const QUESTIONS: Question[] = `;

writeFileSync('api/_lib/defaultQuestions.ts', header + JSON.stringify(QUESTIONS, null, 2) + ';\n', 'utf8');
console.log('تم توليد api/_lib/defaultQuestions.ts —', QUESTIONS.length, 'سؤالًا');
