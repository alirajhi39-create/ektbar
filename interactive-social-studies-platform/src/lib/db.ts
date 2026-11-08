import type { AttemptResult, Question, Settings } from '../types';
import { QUESTIONS } from '../data/questions';

/**
 * طبقة قاعدة البيانات المحلية المُنظّمة.
 * تتصرف كجدول دائم للنتائج والإعدادات وبنك الأسئلة مع واجهة CRUD واضحة.
 */
const ATTEMPTS_KEY = 'sst.attempts.v1';
const SETTINGS_KEY = 'sst.settings.v1';
const QUESTIONS_KEY = 'sst.questions.v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* تجاهل امتلاء التخزين */
  }
}

export const db = {
  /** إرجاع جميع المحاولات مرتبة من الأحدث إلى الأقدم */
  getAttempts(): AttemptResult[] {
    const list = read<AttemptResult[]>(ATTEMPTS_KEY, []);
    return [...list].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  },

  addAttempt(result: AttemptResult): void {
    const list = read<AttemptResult[]>(ATTEMPTS_KEY, []);
    // منع تكرار الحفظ لنفس المحاولة
    if (list.some((r) => r.id === result.id)) return;
    list.push(result);
    write(ATTEMPTS_KEY, list);
  },

  deleteAttempt(id: string): void {
    write(ATTEMPTS_KEY, read<AttemptResult[]>(ATTEMPTS_KEY, []).filter((r) => r.id !== id));
  },

  clearAttempts(): void {
    write(ATTEMPTS_KEY, []);
  },

  getSettings(): Settings {
    return read<Settings>(SETTINGS_KEY, { examActive: true });
  },

  saveSettings(s: Settings): void {
    write(SETTINGS_KEY, s);
  },
};

/**
 * بنك الأسئلة — الافتراضي المعتمد مع إمكانية تعديله من لوحة المعلم.
 * النسخة المعدّلة تُحفظ بشكل دائم، ويمكن استعادة الافتراضي في أي وقت.
 */
export function getQuestions(): Question[] {
  const custom = read<Question[] | null>(QUESTIONS_KEY, null);
  if (custom && Array.isArray(custom) && custom.length > 0) {
    return [...custom].sort((a, b) => a.id - b.id);
  }
  return QUESTIONS;
}

export function saveQuestions(qs: Question[]): void {
  write(QUESTIONS_KEY, qs);
}

export function resetQuestions(): void {
  try {
    localStorage.removeItem(QUESTIONS_KEY);
  } catch {
    /* تجاهل */
  }
}

export function isCustomBank(): boolean {
  try {
    return localStorage.getItem(QUESTIONS_KEY) !== null;
  } catch {
    return false;
  }
}

export function getQuestionMap(): Map<number, Question> {
  return new Map(getQuestions().map((q) => [q.id, q]));
}

/** تصدير النتائج إلى ملف CSV متوافق مع Excel (مع دعم العربية) */
export function exportAttemptsCSV(attempts: AttemptResult[]): void {
  const header = ['الاسم', 'الشعبة', 'الدرجة', 'المجموع', 'النسبة %', 'صحيحة', 'خاطئة', 'غير مجاب', 'المستوى', 'التاريخ'];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = attempts.map((a) => {
    const pct = Math.round(a.percentage);
    const level = pct >= 90 ? 'ممتاز' : pct >= 75 ? 'رائع' : pct >= 60 ? 'جيد' : 'بحاجة إلى مراجعة';
    const date = new Date(a.dateISO).toLocaleString('ar-SA');
    return [a.studentName, a.className || '—', a.score, a.total, pct, a.correct, a.wrong, a.unanswered, level, date]
      .map(esc)
      .join(',');
  });
  const csv = '﻿' + header.map(esc).join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `نتائج-تحدي-الدراسات-الاجتماعية-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
