import { useEffect, useState } from 'react';
import { ArrowRight, Cloud, HardDrive, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { auth } from '../lib/auth';
import { apiToken, checkApi, getConnection, remote } from '../lib/api';

interface TeacherLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function TeacherLogin({ onSuccess, onBack }: TeacherLoginProps) {
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockLeft, setLockLeft] = useState(0);

  /* اكتشاف وضع الاتصال */
  useEffect(() => {
    let alive = true;
    (async () => {
      await checkApi();
      if (alive) {
        setChecking(false);
        setLockLeft(auth.lockRemainingSec());
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (lockLeft <= 0) return;
    const t = setInterval(() => setLockLeft(auth.lockRemainingSec()), 1000);
    return () => clearInterval(t);
  }, [lockLeft]);

  const cloud = getConnection() === 'on';

  const submit = async () => {
    setError('');
    if (busy || checking) return;
    if (!cloud && lockLeft > 0) return;
    if (!password.trim()) { setError('أدخل كلمة المرور'); return; }
    setBusy(true);
    try {
      if (cloud) {
        const { token } = await remote.login(password);
        apiToken.set(token);
      } else {
        await auth.login(password);
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'كلمة المرور غير صحيحة');
      if (!cloud) setLockLeft(auth.lockRemainingSec());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pattern-bg grid min-h-screen place-items-center px-4 py-10">
      <div className="anim-screen w-full max-w-md">
        <div className="relative overflow-hidden rounded-[2rem] border border-saudi-100 bg-white p-8 shadow-2xl shadow-saudi-900/10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-l from-saudi-600 via-gold-400 to-cloud-300" />

          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-saudi-600 text-white shadow-lg shadow-saudi-600/30">
            <Lock className="size-8" />
          </span>

          <h1 className="mt-4 text-center font-head text-2xl font-black text-saudi-900">لوحة تحكم المعلم</h1>
          <p className="mt-1.5 text-center text-sm font-medium text-slate-500">
            أدخل كلمة المرور للوصول إلى نتائج الطلاب وإدارة الاختبار.
          </p>

          {/* مؤشر الاتصال */}
          {!checking && (
            <p className={`mt-3 flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${cloud ? 'bg-saudi-50 text-saudi-700 ring-1 ring-saudi-100' : 'bg-sand-100 text-slate-500'}`}>
              {cloud ? <Cloud className="size-3.5" /> : <HardDrive className="size-3.5" />}
              {cloud ? 'متصل بقاعدة بيانات Neon — النتائج تُحفظ أونلاين لكل الأجهزة' : 'وضع محلي — المعاينة بدون خادم'}
            </p>
          )}

          {checking ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="size-10 animate-spin text-saudi-500" />
            </div>
          ) : (
            <>
              <div className="mt-6">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-saudi-800"><KeyRound className="size-4" /> كلمة المرور</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="••••••"
                    autoComplete="current-password"
                    autoFocus
                    dir="ltr"
                    className="w-full rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-3.5 text-center font-head text-xl font-black tracking-[0.4em] transition focus:border-saudi-500 focus:bg-white focus:outline-none"
                  />
                </label>
              </div>

              {error && (
                <p className="anim-shake mt-3 rounded-2xl bg-red-50 p-3 text-center text-sm font-bold text-red-600 ring-1 ring-red-100">{error}</p>
              )}
              {!cloud && lockLeft > 0 && (
                <p className="mt-3 rounded-2xl bg-gold-50 p-3 text-center text-sm font-bold text-gold-700 ring-1 ring-gold-200">
                  الحماية مفعّلة — أعد المحاولة بعد {lockLeft} ثانية
                </p>
              )}

              <button
                onClick={submit}
                disabled={busy || (!cloud && lockLeft > 0)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-saudi-700 to-saudi-500 px-5 py-3.5 font-head text-lg font-extrabold text-white shadow-lg shadow-saudi-600/30 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
                {busy ? 'جارٍ التحقق…' : 'دخول اللوحة'}
              </button>
            </>
          )}

          <button onClick={onBack} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-sand-200 px-5 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300 hover:text-saudi-700">
            <ArrowRight className="size-5" /> العودة للرئيسية
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Lock className="size-3.5" /> منطقة مخصصة للمعلم فقط — بيانات الطلاب محمية
          </p>
        </div>
      </div>
    </div>
  );
}
