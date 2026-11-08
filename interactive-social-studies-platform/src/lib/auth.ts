import type { TeacherAccount } from '../types';

/**
 * مصادقة المعلم — بدون أي كلمة مرور ثابتة في الكود.
 * عند أول تشغيل ينشئ المعلم حسابه، وتُخزّن كلمة المرور كقيمة تجزئة
 * SHA-256 مع ملح عشوائي فقط (لا تُحفظ كلمة المرور نصيًا أبدًا).
 */
const ACCOUNT_KEY = 'sst.teacher.v1';
const SESSION_KEY = 'sst.session.v1';
const GUARD_KEY = 'sst.guard.v1';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getAccount(): TeacherAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as TeacherAccount) : null;
  } catch {
    return null;
  }
}

/* حارس المحاولات المتكررة */
interface Guard { fails: number; lockedUntil: number }
function getGuard(): Guard {
  try {
    const raw = sessionStorage.getItem(GUARD_KEY);
    return raw ? (JSON.parse(raw) as Guard) : { fails: 0, lockedUntil: 0 };
  } catch {
    return { fails: 0, lockedUntil: 0 };
  }
}
function setGuard(g: Guard) {
  sessionStorage.setItem(GUARD_KEY, JSON.stringify(g));
}

export const auth = {
  hasAccount(): boolean {
    return getAccount() !== null;
  },

  isLoggedIn(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'active';
  },

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
  },

  lockRemainingSec(): number {
    const g = getGuard();
    return Math.max(0, Math.ceil((g.lockedUntil - Date.now()) / 1000));
  },

  /** إنشاء الحساب لأول مرة */
  async register(username: string, password: string): Promise<void> {
    if (getAccount()) throw new Error('يوجد حساب معلم مسجل بالفعل');
    const salt = randomSalt();
    const hash = await sha256(`${salt}::${password}`);
    const account: TeacherAccount = { username: username.trim(), salt, hash, createdAt: new Date().toISOString() };
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    sessionStorage.setItem(SESSION_KEY, 'active');
  },

  async login(username: string, password: string): Promise<void> {
    const guard = getGuard();
    if (guard.lockedUntil > Date.now()) {
      throw new Error(`محاولات كثيرة — انتظر ${Math.ceil((guard.lockedUntil - Date.now()) / 1000)} ثانية`);
    }
    const acc = getAccount();
    let ok = false;
    if (acc) {
      const hash = await sha256(`${acc.salt}::${password}`);
      ok = acc.username === username.trim() && hash === acc.hash;
    } else {
      await sha256('dummy'); // توحيد زمن الاستجابة
    }
    if (!ok) {
      const fails = guard.fails + 1;
      setGuard({ fails, lockedUntil: fails >= 5 ? Date.now() + 30_000 : 0 });
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    setGuard({ fails: 0, lockedUntil: 0 });
    sessionStorage.setItem(SESSION_KEY, 'active');
  },

  async changePassword(current: string, next: string): Promise<void> {
    const acc = getAccount();
    if (!acc) throw new Error('لا يوجد حساب');
    const currentHash = await sha256(`${acc.salt}::${current}`);
    if (currentHash !== acc.hash) throw new Error('كلمة المرور الحالية غير صحيحة');
    const salt = randomSalt();
    const hash = await sha256(`${salt}::${next}`);
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ ...acc, salt, hash }));
  },
};
