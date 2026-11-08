export type UnitKey = 'history' | 'first' | 'second';
export type QuestionType = 'mcq' | 'tf';

export interface Question {
  id: number;
  unit: UnitKey;
  type: QuestionType;
  question: string;
  /** خيارات الاختيار من متعدد فقط */
  options?: string[];
  /** فهرس الإجابة الصحيحة داخل options (لا يُرسل للطالب أثناء الاختبار) */
  correctIndex?: number;
  /** الإجابة الصحيحة لأسئلة صح/خطأ */
  correctBool?: boolean;
  marks: number;
  explanation: string;
}

/** سؤال مُنقّى من الإجابات يُعرض للطالب أثناء الاختبار */
export interface QuizOption {
  text: string;
  orig: number; // الفهرس الأصلي قبل الخلط
}

export interface ShuffledQuestion {
  id: number;
  unit: UnitKey;
  type: QuestionType;
  question: string;
  marks: number;
  options?: QuizOption[];
}

export type AnswerValue = number | boolean; // number = فهرس الخيار المخلوط، boolean = صح/خطأ

export interface QuizSession {
  studentName: string;
  className: string;
  questions: ShuffledQuestion[];
  answers: Record<number, AnswerValue>; // questionId -> answer
  index: number;
  startedAt: number;
}

export interface AnswerDetail {
  id: number; // رقم السؤال الأصلي
  /** الإجابة المطبّعة: فهرس الخيار الأصلي (mcq) أو قيمة صح/خطأ */
  a: number | boolean | null;
  ok: boolean;
}

export interface AttemptResult {
  id: string;
  studentName: string;
  className: string;
  score: number;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percentage: number;
  dateISO: string;
  durationSec: number;
  details: AnswerDetail[];
  /** لقطة البنك الكامل بعد التسليم (لوضع الخادم) — تُستخدم في المراجعة */
  bank?: Question[];
}

export interface Settings {
  examActive: boolean;
}

export interface TeacherAccount {
  username: string;
  salt: string;
  hash: string;
  createdAt: string;
}

export interface Level {
  key: 'excellent' | 'great' | 'good' | 'start';
  label: string;
  message: string;
}
