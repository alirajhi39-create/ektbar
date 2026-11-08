/* اختبار منطق التصحيح والتنقية جهة الخادم */
import { gradeAnswers, sanitizeBank, validateBank } from '../api/_lib/core';
import { QUESTIONS } from '../src/data/questions';

/* 1) جميع الإجابات صحيحة → 60/60 */
const perfect = QUESTIONS.map((q) => ({
  id: q.id,
  a: q.type === 'mcq' ? (q.correctIndex ?? 0) : (q.correctBool ?? true),
}));
const g1 = gradeAnswers(QUESTIONS, perfect);
console.log('PERFECT →', g1.score, '/', g1.total, '| صحيحة:', g1.correct, '| نسبة:', g1.percentage + '%');

/* 2) جميع الإجابات خاطئة → 0 */
const zero = QUESTIONS.map((q) => ({
  id: q.id,
  a: q.type === 'mcq' ? ((q.correctIndex ?? 0) + 1) % 4 : !(q.correctBool ?? true),
}));
const g2 = gradeAnswers(QUESTIONS, zero);
console.log('ZERO    →', g2.score, '| خاطئة:', g2.wrong);

/* 3) أسئلة متروكة لا تُحسب صحيحة */
const skipped = QUESTIONS.map((q) => ({ id: q.id, a: null }));
const g3 = gradeAnswers(QUESTIONS, skipped);
console.log('SKIPPED →', g3.score, '| متروكة:', g3.unanswered);

/* 4) منع الاحتساب المكرر لنفس السؤال */
const dup = [...perfect, ...perfect];
const g4 = gradeAnswers(QUESTIONS, dup);
console.log('DUPED   →', g4.score, '/', g4.total, '(يجب أن يبقى 60/60)');

/* 5) النسخة المُرسلة للطالب خالية من الإجابات */
const sani = sanitizeBank(QUESTIONS);
const leaked = sani.filter((q) => 'correctIndex' in q || 'correctBool' in q || 'explanation' in q);
console.log('SANITIZED → أسئلة:', sani.length, '| تسريب إجابات:', leaked.length, '(يجب 0)');

/* 6) التحقق الصارم يرفض بنكًا معطوبًا */
try {
  validateBank([{ id: 1, unit: 'history', type: 'mcq', question: 'س', options: ['أ'], correctIndex: 9, explanation: '' }]);
  console.log('VALIDATE → فشل في الرفض!');
} catch (e) {
  console.log('VALIDATE → رفض صحيح:', e instanceof Error ? e.message : e);
}

/* 7) بنك سليم معدّل يمر */
const ok = validateBank(QUESTIONS);
console.log('VALIDATE → بنك معتمد سليم:', ok.length, 'سؤالًا');
