import type { AttemptResult, Question, Settings } from '../types';

/**
 * عميل الاتصال بالخادم (Neon على Vercel).
 * يكتشف التوفر تلقائيًا — عند النشر على Vercel مع DATABASE_URL يعمل سحابيًا،
 * وفي المعاينة المحلية يسقط تلقائيًا إلى التخزين المحلي.
 */

export type Connection = 'unknown' | 'on' | 'off';
let conn: Connection = 'unknown';

export function getConnection(): Connection {
  return conn;
}

export async function checkApi(): Promise<boolean> {
  try {
    const r = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
    conn = r.ok ? 'on' : 'off';
  } catch {
    conn = 'off';
  }
  return conn === 'on';
}

/* ─── رمز جلسة المعلم ─── */
const TOKEN_KEY = 'sst.api.token';
export const apiToken = {
  get: (): string => sessionStorage.getItem(TOKEN_KEY) ?? '',
  set: (t: string): void => sessionStorage.setItem(TOKEN_KEY, t),
  clear: (): void => sessionStorage.removeItem(TOKEN_KEY),
};

/* ─── طلب موحّد مع معالجة الأخطاء ─── */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = apiToken.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(path, { ...init, headers });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) {
    const err = new Error(data.error || 'تعذر الاتصال بالخادم') as Error & { status?: number };
    err.status = r.status;
    throw err;
  }
  return data;
}

export function isAuthError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { status?: number }).status === 401;
}

export interface RemoteResultPayload {
  id: string;
  studentName: string;
  className: string;
  durationSec: number;
  answers: { id: number; a: number | boolean | null }[];
}

export const remote = {
  /* المصادقة — كلمة مرور واحدة فقط */
  authStatus: () => call<{ hasAccount: boolean }>('/api/auth?action=status'),
  login: (password: string) =>
    call<{ token: string }>('/api/auth?action=login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => call<{ ok: boolean }>('/api/auth?action=logout', { method: 'POST', body: '{}' }),
  changePassword: (current: string, next: string) =>
    call<{ ok: boolean }>('/api/auth?action=change-password', { method: 'POST', body: JSON.stringify({ current, next }) }),

  /* الإعدادات */
  getSettings: () => call<Settings>('/api/settings'),
  saveSettings: (s: Settings) => call<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(s) }),

  /* بنك الأسئلة */
  getQuizQuestions: () => call<{ questions: Question[]; custom: boolean }>('/api/questions'),
  getFullBank: () => call<{ questions: Question[]; custom: boolean }>('/api/questions'),
  saveBank: (questions: Question[]) =>
    call<{ ok: boolean }>('/api/questions', { method: 'PUT', body: JSON.stringify({ questions }) }),
  resetBank: () => call<{ questions: Question[]; custom: boolean }>('/api/questions', { method: 'DELETE' }),

  /* النتائج */
  submitResult: (payload: RemoteResultPayload) =>
    call<{ result: AttemptResult; bank: Question[] }>('/api/results', { method: 'POST', body: JSON.stringify(payload) }),
  getResults: () => call<{ attempts: AttemptResult[]; bank: Question[]; custom: boolean }>('/api/results'),
  deleteResult: (id: string) => call<{ ok: boolean }>(`/api/results?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clearResults: () => call<{ ok: boolean }>('/api/results?id=all', { method: 'DELETE' }),
};
