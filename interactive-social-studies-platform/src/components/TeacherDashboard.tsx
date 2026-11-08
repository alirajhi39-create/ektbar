import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, CheckCircle2, Cloud, Eye, FileSpreadsheet, HardDrive, Home as HomeIcon, Inbox,
  KeyRound, Loader2, LogOut, MinusCircle, Percent, Power, RefreshCw, Search, ShieldCheck,
  Trash2, Trophy, Users, X, XCircle,
} from 'lucide-react';
import type { AttemptResult, Question, Settings } from '../types';
import {
  db, exportAttemptsCSV, getQuestions, isCustomBank, resetQuestions, saveQuestions,
} from '../lib/db';
import { auth } from '../lib/auth';
import { checkApi, isAuthError, probeApi, remote, resetApiCache } from '../lib/api';
import { UNIT_META } from '../data/questions';
import { formatGregorian, formatTime, getLevel } from '../lib/utils';
import QuestionBank from './QuestionBank';

interface DashboardProps {
  onLogout: () => void;
  onHome: () => void;
  onSettingsChanged: (s: Settings) => void;
}

type Toast = { text: string; ok: boolean } | null;
type Conn = 'checking' | 'api' | 'local';

function answerText(q: Question, a: number | boolean | null): string {
  if (a === null || a === undefined) return '— لم يُجب —';
  if (q.type === 'mcq' && typeof a === 'number' && q.options) return q.options[a];
  if (q.type === 'tf' && typeof a === 'boolean') return a ? 'صح' : 'خطأ';
  return '—';
}

function correctText(q: Question): string {
  if (q.type === 'mcq' && q.options && q.correctIndex !== undefined) return q.options[q.correctIndex];
  if (q.type === 'tf') return q.correctBool ? 'صح' : 'خطأ';
  return '—';
}

export default function TeacherDashboard({ onLogout, onHome, onSettingsChanged }: DashboardProps) {
  const [conn, setConn] = useState<Conn>('checking');
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [bankQs, setBankQs] = useState<Question[]>(() => getQuestions());
  const [customBank, setCustomBank] = useState(() => isCustomBank());
  const [settings, setSettings] = useState<Settings>(() => db.getSettings());
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [detail, setDetail] = useState<AttemptResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttemptResult | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdCur, setPwdCur] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [busyAction, setBusyAction] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [tab, setTab] = useState<'results' | 'questions'>('results');

  const bankMap = useMemo(() => new Map(bankQs.map((q) => [q.id, q])), [bankQs]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /* تحميل البيانات: Neon أولًا ثم المحلي */
  const loadData = useCallback(async (): Promise<void> => {
    if (await checkApi()) {
      try {
        const [{ attempts: list, bank, custom }, s] = await Promise.all([remote.getResults(), remote.getSettings()]);
        setAttempts(list);
        setBankQs(bank);
        setCustomBank(custom);
        setSettings(s);
        db.saveSettings(s);
        onSettingsChanged(s);
        setConn('api');
        return;
      } catch (e) {
        if (isAuthError(e)) { onLogout(); return; }
      }
    }
    setConn('local');
    setAttempts(db.getAttempts());
    setSettings(db.getSettings());
    setBankQs(getQuestions());
    setCustomBank(isCustomBank());
  }, [onLogout, onSettingsChanged]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* إعادة الاتصال اليدوية — توقظ دوال الخادم وقاعدة Neon ثم تعيد التحميل */
  const [reconnecting, setReconnecting] = useState(false);
  const reconnect = async () => {
    if (reconnecting) return;
    setReconnecting(true);
    try {
      resetApiCache();
      if (await probeApi()) {
        setConn('checking');
        await loadData();
        setToast({ text: 'تم الاتصال بقاعدة Neon — التزامن الأونلاين مفعّل', ok: true });
      } else {
        setConn('local');
        setToast({ text: 'الخادم غير متاح بعد — أضف DATABASE_URL في Vercel ثم أعد النشر (Redeploy)', ok: false });
      }
    } finally {
      setReconnecting(false);
    }
  };

  const guard = (e: unknown): boolean => {
    if (isAuthError(e)) { onLogout(); return true; }
    setToast({ text: e instanceof Error ? e.message : 'تعذر تنفيذ العملية', ok: false });
    return false;
  };

  /* ── حالة الاختبار ── */
  const toggleExam = async () => {
    const prev = settings;
    const next = { ...settings, examActive: !settings.examActive };
    setSettings(next);
    try {
      if (conn === 'api') await remote.saveSettings(next); else db.saveSettings(next);
      db.saveSettings(next);
      onSettingsChanged(next);
      setToast({ text: next.examActive ? 'تم تفعيل الاختبار — يمكن للطلاب البدء الآن' : 'تم إيقاف الاختبار مؤقتًا', ok: next.examActive });
    } catch (e) {
      setSettings(prev);
      guard(e);
    }
  };

  /* ── بنك الأسئلة ── */
  const persistBank = async (qs: Question[]): Promise<void> => {
    if (conn === 'api') await remote.saveBank(qs); else saveQuestions(qs);
    setBankQs(qs);
    setCustomBank(true);
  };

  const resetBankToDefault = async (): Promise<Question[]> => {
    if (conn === 'api') {
      const r = await remote.resetBank();
      setBankQs(r.questions);
      setCustomBank(false);
      return r.questions;
    }
    resetQuestions();
    const qs = getQuestions();
    setBankQs(qs);
    setCustomBank(false);
    return qs;
  };

  /* ── النتائج ── */
  const classes = useMemo(() => [...new Set(attempts.map((a) => a.className).filter(Boolean))], [attempts]);

  const filtered = useMemo(
    () =>
      attempts.filter((a) => {
        const matchName = a.studentName.includes(search.trim());
        const matchClass = classFilter === 'all' || a.className === classFilter;
        return (search.trim() === '' || matchName) && matchClass;
      }),
    [attempts, search, classFilter],
  );

  const totalRef = attempts[0]?.total ?? 60;

  const stats = useMemo(() => {
    if (attempts.length === 0) return { count: 0, avg: 0, top: 0, pass: 0 };
    const sum = attempts.reduce((s, a) => s + a.score, 0);
    const pass = attempts.filter((a) => a.percentage >= 60).length;
    return {
      count: attempts.length,
      avg: Math.round((sum / attempts.length) * 10) / 10,
      top: Math.max(...attempts.map((a) => a.score)),
      pass: Math.round((pass / attempts.length) * 100),
    };
  }, [attempts]);

  const dist = useMemo(() => {
    const buckets = [
      { label: '90% فأكثر', min: 90, max: 101, color: 'bg-gold-500' },
      { label: '75% – 89%', min: 75, max: 90, color: 'bg-saudi-500' },
      { label: '60% – 74%', min: 60, max: 75, color: 'bg-cloud-400' },
      { label: 'أقل من 60%', min: 0, max: 60, color: 'bg-slate-300' },
    ];
    return buckets.map((b) => ({
      ...b,
      count: attempts.filter((a) => a.percentage >= b.min && a.percentage < b.max).length,
    }));
  }, [attempts]);

  const doDelete = async () => {
    if (!deleteTarget || busyAction) return;
    setBusyAction(true);
    try {
      if (conn === 'api') await remote.deleteResult(deleteTarget.id); else db.deleteAttempt(deleteTarget.id);
      setAttempts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setToast({ text: `حُذفت محاولة «${deleteTarget.studentName}» — يمكنه إعادة الاختبار`, ok: true });
      setDeleteTarget(null);
    } catch (e) {
      guard(e);
    } finally {
      setBusyAction(false);
    }
  };

  const doClearAll = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      if (conn === 'api') await remote.clearResults(); else db.clearAttempts();
      setAttempts([]);
      setClearAllOpen(false);
      setToast({ text: 'تم مسح جميع النتائج', ok: true });
    } catch (e) {
      guard(e);
    } finally {
      setBusyAction(false);
    }
  };

  const doChangePwd = async () => {
    setPwdErr('');
    if (pwdNew.length < 6) { setPwdErr('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف'); return; }
    try {
      if (conn === 'api') await remote.changePassword(pwdCur, pwdNew); else await auth.changePassword(pwdCur, pwdNew);
      setPwdOpen(false);
      setPwdCur(''); setPwdNew('');
      setToast({ text: 'تم تغيير كلمة المرور بنجاح', ok: true });
    } catch (e) {
      if (isAuthError(e)) { onLogout(); return; }
      setPwdErr(e instanceof Error ? e.message : 'خطأ غير متوقع');
    }
  };

  const levelChip = (pct: number) => {
    const l = getLevel(pct);
    const cls =
      l.key === 'excellent' ? 'bg-gold-100 text-gold-700'
      : l.key === 'great' ? 'bg-saudi-100 text-saudi-700'
      : l.key === 'good' ? 'bg-cloud-100 text-cloud-400'
      : 'bg-slate-100 text-slate-500';
    return <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${cls}`}>{l.label}</span>;
  };

  const connChip = (
    <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold sm:flex ${
      conn === 'api' ? 'bg-saudi-50 text-saudi-700 ring-1 ring-saudi-100' : conn === 'local' ? 'bg-sand-100 text-slate-500' : 'bg-cloud-50 text-cloud-400'
    }`}>
      {conn === 'checking' ? <Loader2 className="size-3.5 animate-spin" /> : conn === 'api' ? <Cloud className="size-3.5" /> : <HardDrive className="size-3.5" />}
      {conn === 'checking' ? 'جارٍ الاتصال…' : conn === 'api' ? 'قاعدة Neon السحابية' : 'تخزين محلي (معاينة)'}
    </span>
  );

  return (
    <div className="pattern-bg min-h-screen pb-16">
      {/* الترويسة */}
      <header className="sticky top-0 z-40 border-b border-saudi-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="grid size-10 place-items-center rounded-xl bg-saudi-600 text-white shadow-md shadow-saudi-600/25">
            <ShieldCheck className="size-5" />
          </span>
          <div className="flex-1">
            <h1 className="font-head text-lg font-black leading-tight text-saudi-900">لوحة تحكم المعلم</h1>
            {connChip}
          </div>
          <button onClick={() => setPwdOpen(true)} className="hidden items-center gap-2 rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm font-extrabold text-slate-600 transition hover:border-saudi-300 hover:text-saudi-700 sm:flex">
            <KeyRound className="size-4" /> كلمة المرور
          </button>
          <button onClick={onHome} aria-label="الرئيسية" className="grid size-10 place-items-center rounded-xl border border-sand-200 bg-white text-slate-500 transition hover:border-saudi-300 hover:text-saudi-700">
            <HomeIcon className="size-5" />
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-extrabold text-red-600 ring-1 ring-red-100 transition hover:bg-red-100">
            <LogOut className="size-4" /> خروج
          </button>
        </div>
      </header>

      {conn === 'checking' ? (
        <div className="grid place-items-center py-32">
          <Loader2 className="size-12 animate-spin text-saudi-500" />
          <p className="mt-4 font-head text-lg font-extrabold text-slate-500">جارٍ الاتصال بقاعدة البيانات…</p>
        </div>
      ) : (
      <main className="mx-auto max-w-6xl px-4 pt-7">
        {/* بانر الوضع المحلي مع إرشاد التفعيل */}
        {conn === 'local' && (
          <div className="anim-screen mb-5 flex flex-wrap items-center gap-3 rounded-3xl border-2 border-dashed border-gold-300 bg-gold-50 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-gold-600 ring-1 ring-gold-200">
              <HardDrive className="size-5" />
            </span>
            <div className="min-w-52 flex-1">
              <p className="font-head text-sm font-black text-gold-800">الحفظ الحالي محلي على هذا الجهاز فقط</p>
              <p className="text-xs font-bold leading-relaxed text-gold-700">
                للمزامنة الأونلاين بين كل الأجهزة: من لوحة Vercel اربط قاعدة Neon عبر قائمة <b>Storage</b> (أو أضف متغير <b>DATABASE_URL</b> من neon.tech) ثم اضغط <b>Redeploy</b>، وبعدها اضغط «إعادة الاتصال».
              </p>
            </div>
            <button onClick={reconnect} disabled={reconnecting} className="flex shrink-0 items-center gap-2 rounded-2xl bg-saudi-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-saudi-600/25 transition hover:-translate-y-0.5 disabled:opacity-60">
              {reconnecting ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {reconnecting ? 'جارٍ إيقاظ القاعدة…' : 'إعادة الاتصال'}
            </button>
          </div>
        )}

        {/* التبويبات */}
        <div className="anim-screen mb-5 flex gap-2 rounded-3xl border border-saudi-100 bg-white p-2 shadow-sm">
          {([
            { key: 'results', label: 'نتائج الطلاب', icon: Users, badge: attempts.length },
            { key: 'questions', label: 'بنك الأسئلة', icon: Inbox, badge: null },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-head font-extrabold transition ${
                tab === t.key ? 'bg-saudi-600 text-white shadow-md shadow-saudi-600/25' : 'text-slate-500 hover:bg-sand-100 hover:text-saudi-700'
              }`}
            >
              <t.icon className="size-5" />
              {t.label}
              {t.badge !== null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-black tabular-nums ${tab === t.key ? 'bg-white/20' : 'bg-sand-100 text-slate-500'}`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'questions' ? (
          <QuestionBank
            bank={bankQs}
            custom={customBank}
            persist={persistBank}
            resetDefault={resetBankToDefault}
            notify={(text) => setToast({ text, ok: true })}
            onError={(text) => setToast({ text, ok: false })}
            onAuthFail={onLogout}
          />
        ) : (
        <>
        {/* بطاقات الإحصاء */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Users, label: 'محاولات الطلاب', value: stats.count, suffix: '', tint: 'bg-saudi-100 text-saudi-700' },
            { icon: BarChart3, label: 'متوسط الدرجات', value: stats.avg, suffix: ` / ${totalRef}`, tint: 'bg-cloud-100 text-cloud-400' },
            { icon: Trophy, label: 'أعلى درجة', value: stats.top, suffix: ` / ${totalRef}`, tint: 'bg-gold-100 text-gold-700' },
            { icon: Percent, label: 'نسبة النجاح (60%+)', value: stats.pass, suffix: '%', tint: 'bg-saudi-100 text-saudi-700' },
          ].map((s, i) => (
            <div key={s.label} className="anim-screen rounded-3xl border border-saudi-100 bg-white p-5 shadow-sm" style={{ animationDelay: `${i * 0.07}s` }}>
              <span className={`grid size-11 place-items-center rounded-xl ${s.tint}`}><s.icon className="size-5" /></span>
              <p className="mt-3 font-head text-3xl font-black tabular-nums text-saudi-900">
                {s.value}<span className="text-sm font-bold text-slate-400">{s.suffix}</span>
              </p>
              <p className="text-sm font-bold text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* التحكم والتوزيع */}
        <div className="mt-5 grid gap-4 lg:grid-cols-5">
          {/* حالة الاختبار */}
          <div className="anim-screen d-2 rounded-3xl border border-saudi-100 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-head text-lg font-black text-saudi-900">حالة الاختبار</p>
                <p className="mt-0.5 text-sm font-bold text-slate-500">
                  {settings.examActive ? 'مفعّل — يستطيع الطلاب الدخول والحل' : 'موقوف — لا يستطيع الطلاب بدء الاختبار'}
                </p>
              </div>
              <button
                onClick={toggleExam}
                aria-pressed={settings.examActive}
                className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${settings.examActive ? 'bg-saudi-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 grid size-7 place-items-center rounded-full bg-white shadow transition-all ${settings.examActive ? 'right-8' : 'right-1'}`}>
                  <Power className={`size-4 ${settings.examActive ? 'text-saudi-600' : 'text-slate-400'}`} />
                </span>
              </button>
            </div>
            <div className={`mt-4 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-extrabold ${settings.examActive ? 'bg-saudi-50 text-saudi-700 ring-1 ring-saudi-100' : 'bg-gold-50 text-gold-700 ring-1 ring-gold-200'}`}>
              <span className={`size-2.5 rounded-full ${settings.examActive ? 'bg-saudi-500' : 'bg-gold-500'}`} />
              {settings.examActive ? 'الاختبار متاح الآن' : 'الاختبار متوقف مؤقتًا'}
            </div>
          </div>

          {/* توزيع الدرجات */}
          <div className="anim-screen d-3 rounded-3xl border border-saudi-100 bg-white p-5 shadow-sm lg:col-span-3">
            <p className="font-head text-lg font-black text-saudi-900">توزيع مستويات الأداء</p>
            <div className="mt-3 grid gap-2.5">
              {dist.map((b) => {
                const width = stats.count ? Math.max(4, (b.count / stats.count) * 100) : 0;
                return (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs font-extrabold text-slate-500">{b.label}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-sand-100">
                      <div className={`h-full rounded-full ${b.color} transition-all duration-700`} style={{ width: `${width}%` }} />
                    </div>
                    <span className="w-8 text-left font-head text-sm font-black tabular-nums text-saudi-800">{b.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* أدوات الجدول */}
        <div className="anim-screen d-4 mt-6 rounded-3xl border border-saudi-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1">
              <Search className="absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الطالب…"
                className="w-full rounded-2xl border-2 border-sand-200 bg-sand-50 py-2.5 pl-4 pr-10 font-bold transition placeholder:font-normal focus:border-saudi-500 focus:bg-white focus:outline-none"
              />
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-2.5 font-bold text-slate-600 transition focus:border-saudi-500 focus:outline-none"
            >
              <option value="all">كل الشعب</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={() => exportAttemptsCSV(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-2xl bg-saudi-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-saudi-600/25 transition hover:-translate-y-0.5 disabled:opacity-40"
            >
              <FileSpreadsheet className="size-4" /> تصدير Excel / CSV
            </button>
            <button
              onClick={() => setClearAllOpen(true)}
              disabled={attempts.length === 0}
              className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-40"
            >
              <Trash2 className="size-4" /> مسح الكل
            </button>
          </div>

          {/* الجدول */}
          {filtered.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-sand-200">
              <table className="w-full min-w-[760px] text-right">
                <thead>
                  <tr className="bg-saudi-50 text-xs font-extrabold text-saudi-800">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">الطالب</th>
                    <th className="px-4 py-3">الشعبة</th>
                    <th className="px-4 py-3">الدرجة</th>
                    <th className="px-4 py-3">صح / خطأ / متروك</th>
                    <th className="px-4 py-3">المستوى</th>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id} className="border-t border-sand-100 transition hover:bg-sand-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3 font-head text-sm font-extrabold text-saudi-900">{a.studentName}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-500">{a.className || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-head text-sm font-black text-saudi-800 tabular-nums">{a.score}/{a.total}</span>
                        <span className="mr-1.5 text-xs font-bold text-slate-400 tabular-nums">({Math.round(a.percentage)}%)</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-extrabold tabular-nums">
                        <span className="text-saudi-600">{a.correct}</span><span className="text-slate-300"> / </span>
                        <span className="text-red-500">{a.wrong}</span><span className="text-slate-300"> / </span>
                        <span className="text-slate-400">{a.unanswered}</span>
                      </td>
                      <td className="px-4 py-3">{levelChip(a.percentage)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-500">
                        {formatGregorian(a.dateISO)}<br />{formatTime(a.dateISO)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => setDetail(a)} aria-label="تفاصيل" className="grid size-9 place-items-center rounded-xl bg-cloud-50 text-cloud-400 ring-1 ring-cloud-100 transition hover:bg-cloud-100">
                            <Eye className="size-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(a)} aria-label="حذف وإتاحة الإعادة" title="حذف المحاولة والسماح بإعادة الاختبار" className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-100 transition hover:bg-red-100">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 grid place-items-center rounded-2xl border-2 border-dashed border-sand-200 bg-sand-50 px-6 py-14 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300 ring-1 ring-sand-200"><Inbox className="size-7" /></span>
              <p className="mt-3 font-head text-lg font-extrabold text-slate-500">لا توجد نتائج مطابقة بعد</p>
              <p className="text-sm font-medium text-slate-400">ستظهر هنا نتائج الطلاب فور تسليمهم الاختبار</p>
            </div>
          )}
        </div>
        </>
        )}
      </main>
      )}

      {/* ── نافذة تفاصيل المحاولة ── */}
      {detail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-sand-200 p-5">
              <div>
                <h3 className="font-head text-xl font-black text-saudi-900">{detail.studentName}</h3>
                <p className="text-xs font-bold text-slate-400">
                  {detail.className || 'بدون شعبة'} · {detail.score}/{detail.total} · {formatGregorian(detail.dateISO)}
                </p>
              </div>
              <button onClick={() => setDetail(null)} aria-label="إغلاق" className="grid size-10 place-items-center rounded-xl bg-sand-100 text-slate-500 transition hover:bg-sand-200">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 px-5 pt-4 text-center">
              <span className="rounded-xl bg-saudi-50 py-2 text-sm font-extrabold text-saudi-700 ring-1 ring-saudi-100">صحيحة: {detail.correct}</span>
              <span className="rounded-xl bg-red-50 py-2 text-sm font-extrabold text-red-600 ring-1 ring-red-100">خاطئة: {detail.wrong}</span>
              <span className="rounded-xl bg-sand-100 py-2 text-sm font-extrabold text-slate-500 ring-1 ring-sand-200">متروكة: {detail.unanswered}</span>
            </div>
            <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto px-5 pb-5">
              {detail.details.map((d, idx) => {
                const q = bankMap.get(d.id);
                if (!q) return null;
                const skipped = d.a === null;
                return (
                  <div key={d.id} className={`rounded-2xl border p-3.5 ${d.ok ? 'border-saudi-100 bg-saudi-50/50' : skipped ? 'border-sand-200 bg-sand-50' : 'border-red-100 bg-red-50/40'}`}>
                    <div className="flex items-start gap-2.5">
                      {d.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-saudi-600" /> : skipped ? <MinusCircle className="mt-0.5 size-5 shrink-0 text-slate-400" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold leading-relaxed text-saudi-950">
                          <span className="ml-1 font-head text-slate-400">{idx + 1}.</span> {q.question}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {UNIT_META[q.unit].short} · إجابة الطالب: <span className={d.ok ? 'text-saudi-700' : skipped ? 'text-slate-500' : 'text-red-600'}>{answerText(q, d.a)}</span>
                          {!d.ok && <> · الصحيحة: <span className="text-saudi-700">{correctText(q)}</span></>}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-400 ring-1 ring-sand-200">{d.ok ? '+2' : '0'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── تأكيد حذف محاولة ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100"><Trash2 className="size-7" /></span>
            <h3 className="mt-4 font-head text-xl font-black text-saudi-900">حذف محاولة «{deleteTarget.studentName}»؟</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">ستُحذف النتيجة نهائيًا ويتمكن الطالب من إعادة الاختبار من جديد.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button onClick={doDelete} disabled={busyAction} className="rounded-2xl bg-red-500 px-4 py-3 font-head font-extrabold text-white transition hover:bg-red-600 disabled:opacity-50">حذف نهائي</button>
              <button onClick={() => setDeleteTarget(null)} className="rounded-2xl border-2 border-sand-200 px-4 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── تأكيد مسح الكل ── */}
      {clearAllOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100"><Trash2 className="size-7" /></span>
            <h3 className="mt-4 font-head text-xl font-black text-saudi-900">مسح جميع النتائج؟</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">سيُحذف سجل {attempts.length} محاولة نهائيًا — يُنصح بالتصدير إلى Excel أولًا.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button onClick={doClearAll} disabled={busyAction} className="rounded-2xl bg-red-500 px-4 py-3 font-head font-extrabold text-white transition hover:bg-red-600 disabled:opacity-50">مسح نهائي</button>
              <button onClick={() => setClearAllOpen(false)} className="rounded-2xl border-2 border-sand-200 px-4 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── تغيير كلمة المرور ── */}
      {pwdOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
            <h3 className="text-center font-head text-xl font-black text-saudi-900">تغيير كلمة المرور</h3>
            <div className="mt-4 grid gap-3">
              <input type="password" value={pwdCur} onChange={(e) => setPwdCur(e.target.value)} placeholder="كلمة المرور الحالية" autoComplete="current-password" dir="ltr" className="w-full rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-3 text-left font-bold transition placeholder:text-right focus:border-saudi-500 focus:bg-white focus:outline-none" />
              <input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doChangePwd()} placeholder="كلمة المرور الجديدة (6 أحرف فأكثر)" autoComplete="new-password" dir="ltr" className="w-full rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-3 text-left font-bold transition placeholder:text-right focus:border-saudi-500 focus:bg-white focus:outline-none" />
            </div>
            {pwdErr && <p className="mt-3 rounded-2xl bg-red-50 p-2.5 text-center text-sm font-bold text-red-600">{pwdErr}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button onClick={doChangePwd} className="rounded-2xl bg-saudi-600 px-4 py-3 font-head font-extrabold text-white transition hover:bg-saudi-700">حفظ</button>
              <button onClick={() => { setPwdOpen(false); setPwdErr(''); setPwdCur(''); setPwdNew(''); }} className="rounded-2xl border-2 border-sand-200 px-4 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* تنبيه سريع */}
      {toast && (
        <div className={`anim-pop fixed bottom-6 right-1/2 z-50 translate-x-1/2 rounded-2xl px-5 py-3 font-head text-sm font-extrabold text-white shadow-xl ${toast.ok ? 'bg-saudi-600' : 'bg-red-500'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
