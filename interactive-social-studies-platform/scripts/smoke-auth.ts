/* اختبار المصادقة المحلية بكلمة المرور الواحدة */
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  get length() { return store.size; },
} as Storage;
(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = (globalThis as unknown as { localStorage: Storage }).localStorage;

const { auth } = await import('../src/lib/auth');

try {
  await auth.login('000000');
  console.log('WRONG PASS → فشل: دخل بكلمة خاطئة!');
} catch (e) {
  console.log('WRONG PASS → مرفوضة:', e instanceof Error ? e.message : e);
}

await auth.login('139613');
console.log('CORRECT    → دخول ناجح:', auth.isLoggedIn());

await auth.changePassword('139613', 'abc123');
auth.logout();
await auth.login('abc123');
console.log('CHANGED    → كلمة جديدة تعمل:', auth.isLoggedIn());
