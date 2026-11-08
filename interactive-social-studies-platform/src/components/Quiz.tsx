import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BookOpenCheck, Check, ChevronLeft, ChevronRight, Crown,
  Flag, Landmark, LayoutGrid, Loader2, ScrollText, User, X,
} from 'lucide-react';
import type { AnswerValue, QuizSession, UnitKey } from '../types';

const UNIT_THEME: Record<UnitKey, { icon: typeof ScrollText; label: string; chip: string; num: string }> = {
  history: { icon: ScrollText, label: 'التاريخ', chip: 'bg-cloud-100 text-cloud-400', num: 'text-cloud-300' },
  first: { icon: Landmark, label: 'الدولة السعودية الأولى', chip: 'bg-saudi-100 text-saudi-700', num: 'text-saudi-200' },
  second: { icon: Crown, label: 'الدولة السعودية الثانية', chip: 'bg-gold-100 text-gold-700', num: 'text-gold-200' },
};

const LETTERS = ['أ', 'ب', 'ج', 'د'];

interface QuizProps {
  session: QuizSession;
  onSubmit: (answers: Record<number, AnswerValue>) => void | Promise<void>;
  onQuit: () => void;
}

export default function Quiz({ session, onSubmit, onQuit }: QuizProps) {
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  const total = session.questions.length;
  const q = session.questions[index];
  const theme = UNIT_THEME[q.unit];
  const UnitIcon = theme.icon;

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = Math.round((answeredCount / total) * 100);

  const choose = (value: AnswerValue) => setAnswers((prev) => ({ ...prev, [q.id]: value }));

  const finish = () => {
    if (submitted.current) return;
    submitted.current = true;
    setConfirmOpen(false);
    setSubmitting(true);
    void onSubmit(answers);
  };

  const OptionState = (i: number) => (answers[q.id] === i ? 'sel' : 'idle');

  return (
    <div className="pattern-bg min-h-screen pb-16">
      {/* ── شريط الحالة ── */}
      <header className="sticky top-0 z-40 border-b border-saudi-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-saudi-600 text-white shadow-md shadow-saudi-600/25">
            <BookOpenCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-extrabold text-saudi-800">
              <User className="size-4 shrink-0 text-saudi-500" />
              {session.studentName}
              {session.className && <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{session.className}</span>}
            </p>
            {/* شريط تقدم الإنجاز */}
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand-100">
                <div
                  className="bar-shimmer h-full rounded-full bg-gradient-to-l from-saudi-600 to-gold-400 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-extrabold text-saudi-700">
                أنجزت {answeredCount} من {total}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowMap((v) => !v)}
            aria-label="خريطة الأسئلة"
            className={`grid size-10 shrink-0 place-items-center rounded-xl border transition ${showMap ? 'border-saudi-500 bg-saudi-50 text-saudi-700' : 'border-sand-200 bg-white text-slate-500 hover:border-saudi-300'}`}
          >
            <LayoutGrid className="size-5" />
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="hidden shrink-0 items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-gold-500/30 transition hover:-translate-y-0.5 hover:bg-gold-600 sm:flex"
          >
            <Flag className="size-4" /> إنهاء الاختبار
          </button>
          <button
            onClick={() => setQuitOpen(true)}
            aria-label="خروج دون حفظ"
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-sand-200 bg-white text-slate-400 transition hover:border-red-300 hover:text-red-500"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* خريطة الأسئلة */}
        {showMap && (
          <div className="anim-screen border-t border-sand-200 bg-white/95">
            <div className="mx-auto grid max-w-5xl grid-cols-10 gap-2 px-4 py-4">
              {session.questions.map((qq, i) => {
                const answered = answers[qq.id] !== undefined;
                const current = i === index;
                return (
                  <button
                    key={qq.id}
                    onClick={() => { setIndex(i); setShowMap(false); }}
                    className={`grid h-9 place-items-center rounded-lg text-sm font-extrabold transition hover:scale-105 ${
                      current
                        ? 'bg-gold-500 text-white ring-2 ring-gold-300'
                        : answered
                          ? 'bg-saudi-600 text-white'
                          : 'bg-sand-100 text-slate-500 hover:bg-sand-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ── بطاقة السؤال ── */}
      <main className="mx-auto max-w-3xl px-4 pt-8">
        <div key={q.id} className="anim-screen">
          <div className="relative overflow-hidden rounded-[2rem] border border-saudi-100 bg-white p-6 shadow-xl shadow-saudi-900/10 sm:p-9">
            {/* رقم مائي كبير */}
            <span className={`pointer-events-none absolute -top-6 left-2 select-none font-head text-[7rem] font-black leading-none opacity-60 ${theme.num}`} aria-hidden>
              {index + 1}
            </span>

            <div className="relative flex flex-wrap items-center gap-2">
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${theme.chip}`}>
                <UnitIcon className="size-3.5" /> {theme.label}
              </span>
              <span className="rounded-full bg-sand-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">
                {q.type === 'mcq' ? 'اختيار من متعدد' : 'صح أو خطأ'}
              </span>
              <span className="rounded-full bg-gold-100 px-3 py-1.5 text-xs font-extrabold text-gold-700">درجتان</span>
              <span className="mr-auto font-head text-sm font-extrabold text-slate-400">
                السؤال {index + 1} من {total}
              </span>
            </div>

            <h2 className="relative mt-5 font-head text-2xl font-extrabold leading-relaxed text-saudi-950 sm:text-[1.7rem]">
              {q.question}
            </h2>

            {/* الخيارات */}
            <div className="relative mt-6">
              {q.type === 'mcq' && q.options && (
                <div className="grid gap-3">
                  {q.options.map((opt, i) => {
                    const sel = OptionState(i) === 'sel';
                    return (
                      <button
                        key={`${q.id}-${i}`}
                        onClick={() => choose(i)}
                        className={`group flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition duration-200 ${
                          sel
                            ? 'anim-pop border-saudi-600 bg-saudi-50 shadow-md shadow-saudi-600/15'
                            : 'border-sand-200 bg-sand-50/60 hover:-translate-y-0.5 hover:border-saudi-300 hover:bg-white'
                        }`}
                      >
                        <span
                          className={`grid size-10 shrink-0 place-items-center rounded-xl font-head text-lg font-black transition ${
                            sel ? 'bg-saudi-600 text-white' : 'bg-white text-saudi-700 ring-1 ring-sand-200 group-hover:ring-saudi-300'
                          }`}
                        >
                          {sel ? <Check className="size-5" /> : LETTERS[i]}
                        </span>
                        <span className={`text-base font-bold leading-relaxed sm:text-lg ${sel ? 'text-saudi-800' : 'text-slate-700'}`}>
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'tf' && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { val: true, label: 'صح', icon: Check, selCls: 'border-saudi-600 bg-saudi-600 text-white shadow-lg shadow-saudi-600/30', idleCls: 'hover:border-saudi-400 hover:text-saudi-700' },
                    { val: false, label: 'خطأ', icon: X, selCls: 'border-saudi-600 bg-saudi-600 text-white shadow-lg shadow-saudi-600/30', idleCls: 'hover:border-red-300 hover:text-red-500' },
                  ].map((o) => {
                    const sel = answers[q.id] === o.val;
                    return (
                      <button
                        key={String(o.val)}
                        onClick={() => choose(o.val)}
                        className={`flex flex-col items-center gap-2 rounded-3xl border-2 py-7 transition duration-200 ${
                          sel ? `anim-pop ${o.selCls}` : `border-sand-200 bg-sand-50/60 text-slate-500 hover:-translate-y-1 ${o.idleCls}`
                        }`}
                      >
                        <o.icon className="size-9" strokeWidth={3} />
                        <span className="font-head text-2xl font-black">{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── التنقل ── */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="flex items-center gap-1.5 rounded-2xl border-2 border-sand-200 bg-white px-5 py-3 font-head font-extrabold text-slate-600 transition enabled:hover:-translate-y-0.5 enabled:hover:border-saudi-300 enabled:hover:text-saudi-700 disabled:opacity-40"
            >
              <ChevronRight className="size-5" /> السابق
            </button>

            {/* نقاط التقدم المصغرة */}
            <div className="hidden flex-1 justify-center gap-1 sm:flex" aria-hidden>
              {session.questions.map((qq, i) => (
                <span
                  key={qq.id}
                  className={`h-1.5 flex-1 max-w-4 rounded-full transition-colors ${
                    i === index ? 'bg-gold-500' : answers[qq.id] !== undefined ? 'bg-saudi-500' : 'bg-sand-200'
                  }`}
                />
              ))}
            </div>

            {index < total - 1 ? (
              <button
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                className="flex items-center gap-1.5 rounded-2xl bg-saudi-600 px-6 py-3 font-head font-extrabold text-white shadow-lg shadow-saudi-600/30 transition hover:-translate-y-0.5 hover:bg-saudi-700"
              >
                التالي <ChevronLeft className="size-5" />
              </button>
            ) : (
              <button
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-400 px-6 py-3 font-head font-extrabold text-white shadow-lg shadow-gold-500/30 transition hover:-translate-y-0.5"
              >
                <Flag className="size-5" /> إنهاء الاختبار
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ── نافذة تأكيد التسليم ── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-gold-100 text-gold-600">
              <AlertTriangle className="size-8" />
            </span>
            <h3 className="mt-4 text-center font-head text-2xl font-black text-saudi-900">تسليم الاختبار؟</h3>
            <p className="mt-2 text-center font-medium text-slate-500">
              أجبت عن <b className="text-saudi-700">{answeredCount}</b> من {total} سؤالًا
            </p>
            {answeredCount < total && (
              <p className="mt-3 rounded-2xl bg-red-50 p-3 text-center text-sm font-bold text-red-600">
                تبقّى {total - answeredCount} سؤالًا دون إجابة — الأسئلة المتروكة لا تُحتسب صحيحة.
              </p>
            )}
            <div className="mt-6 grid gap-2.5">
              <button
                onClick={finish}
                className="rounded-2xl bg-saudi-600 px-5 py-3.5 font-head text-lg font-extrabold text-white shadow-lg shadow-saudi-600/30 transition hover:-translate-y-0.5 hover:bg-saudi-700"
              >
                تأكيد التسليم النهائي
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-2xl border-2 border-sand-200 px-5 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300 hover:text-saudi-700"
              >
                العودة للأسئلة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── جارٍ التصحيح ── */}
      {submitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/60 p-4 backdrop-blur-sm">
          <div className="anim-pop flex flex-col items-center gap-4 rounded-3xl bg-white px-10 py-8 shadow-2xl">
            <Loader2 className="size-12 animate-spin text-saudi-600" />
            <p className="font-head text-xl font-black text-saudi-900">جارٍ تصحيح إجاباتك…</p>
            <p className="text-sm font-bold text-slate-400">لحظات وتظهر نتيجتك يا بطل!</p>
          </div>
        </div>
      )}

      {/* ── نافذة الخروج ── */}
      {quitOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
            <h3 className="font-head text-xl font-black text-saudi-900">الخروج دون حفظ؟</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">إذا خرجت الآن فلن تُحفظ إجاباتك ونتيجتك.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button onClick={onQuit} className="rounded-2xl bg-red-500 px-4 py-3 font-head font-extrabold text-white transition hover:bg-red-600">خروج</button>
              <button onClick={() => setQuitOpen(false)} className="rounded-2xl border-2 border-sand-200 px-4 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300">متابعة الحل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
