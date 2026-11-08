import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Award, CheckCircle2, Home, ListChecks, Medal, MinusCircle, RotateCcw,
  ShieldCheck, Star, Trophy, XCircle,
} from 'lucide-react';
import type { AttemptResult } from '../types';
import { getLevel, useCountUp, useMounted } from '../lib/utils';

interface ResultsProps {
  result: AttemptResult;
  onReview: () => void;
  onRetake: () => void;
  onCertificate: () => void;
  onHome: () => void;
}

const LEVEL_STYLE = {
  excellent: { ring: '#C9A227', trail: '#F1E4B8', text: 'text-gold-600', bg: 'bg-gold-100' },
  great: { ring: '#006C35', trail: '#D3ECDF', text: 'text-saudi-700', bg: 'bg-saudi-100' },
  good: { ring: '#5DB7DA', trail: '#DDF1F9', text: 'text-cloud-400', bg: 'bg-cloud-100' },
  start: { ring: '#94A3B8', trail: '#E2E8F0', text: 'text-slate-500', bg: 'bg-slate-100' },
} as const;

export default function Results({ result, onReview, onRetake, onCertificate, onHome }: ResultsProps) {
  const level = getLevel(result.percentage);
  const style = LEVEL_STYLE[level.key];
  const score = useCountUp(result.score);
  const pct = useCountUp(Math.round(result.percentage));
  const mounted = useMounted();

  const starsCount = result.percentage >= 90 ? 3 : result.percentage >= 75 ? 2 : result.percentage >= 60 ? 1 : 0;

  useEffect(() => {
    const colors = ['#006C35', '#C9A227', '#E9C766', '#ffffff', '#5DB7DA'];
    if (result.percentage >= 90) {
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors });
      const t1 = setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0 }, colors }), 350);
      const t2 = setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1 }, colors }), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (result.percentage >= 60) {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors });
    }
  }, [result.percentage]);

  const R = 84;
  const C = 2 * Math.PI * R;

  return (
    <div className="pattern-bg min-h-screen px-4 py-10">
      <div className="anim-screen mx-auto max-w-2xl">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-saudi-100 bg-white p-8 shadow-2xl shadow-saudi-900/10 sm:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-l from-saudi-600 via-gold-400 to-cloud-300" />

          {/* التهنئة */}
          <div className="text-center">
            <span className={`anim-bounce-soft inline-grid size-20 place-items-center rounded-full ${style.bg} ${style.text} shadow-inner`}>
              {level.key === 'excellent' ? <Trophy className="size-10" /> : level.key === 'great' ? <Medal className="size-10" /> : level.key === 'good' ? <Star className="size-10" /> : <ListChecks className="size-10" />}
            </span>
            <p className="mt-3 text-sm font-bold text-slate-400">أحسنت يا</p>
            <h1 className="mt-1 font-head text-3xl font-black text-saudi-900 sm:text-4xl">{result.studentName}</h1>
            {result.className && <p className="mt-1 text-sm font-bold text-slate-400">{result.className}</p>}

            {/* النجوم */}
            <div className="mt-4 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <Star
                  key={i}
                  className={`anim-pop size-9 ${i < starsCount ? 'fill-gold-400 text-gold-500' : 'fill-sand-100 text-sand-200'}`}
                  style={{ animationDelay: `${0.4 + i * 0.25}s` }}
                />
              ))}
            </div>
          </div>

          {/* المقياس الدائري */}
          <div className="relative mx-auto mt-6 w-fit">
            <svg width="210" height="210" viewBox="0 0 210 210" className="-rotate-90">
              <circle cx="105" cy="105" r={R} fill="none" stroke={style.trail} strokeWidth="16" />
              <circle
                cx="105" cy="105" r={R} fill="none"
                stroke={style.ring} strokeWidth="16" strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={mounted ? C - (C * result.percentage) / 100 : C}
                style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.22, 0.9, 0.3, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="font-head text-5xl font-black tabular-nums text-saudi-900">
                  {score}<span className="text-2xl text-slate-400">/{result.total}</span>
                </p>
                <p className={`mt-1 font-head text-2xl font-extrabold tabular-nums ${style.text}`}>{pct}%</p>
              </div>
            </div>
          </div>

          {/* رسالة المستوى */}
          <div className="mt-6 text-center">
            <span className={`rounded-full px-5 py-2 font-head text-lg font-black ${style.bg} ${style.text}`}>
              {level.label} — {level.message}
            </span>
          </div>

          {/* الإحصاءات */}
          <div className="mt-7 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-saudi-50 p-4 text-center ring-1 ring-saudi-100">
              <CheckCircle2 className="mx-auto size-6 text-saudi-600" />
              <p className="mt-1 font-head text-2xl font-black text-saudi-800">{result.correct}</p>
              <p className="text-xs font-bold text-saudi-600">إجابة صحيحة</p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4 text-center ring-1 ring-red-100">
              <XCircle className="mx-auto size-6 text-red-500" />
              <p className="mt-1 font-head text-2xl font-black text-red-600">{result.wrong}</p>
              <p className="text-xs font-bold text-red-500">إجابة خاطئة</p>
            </div>
            <div className="rounded-2xl bg-sand-100 p-4 text-center ring-1 ring-sand-200">
              <MinusCircle className="mx-auto size-6 text-slate-400" />
              <p className="mt-1 font-head text-2xl font-black text-slate-500">{result.unanswered}</p>
              <p className="text-xs font-bold text-slate-400">دون إجابة</p>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs font-bold text-saudi-600">
            <ShieldCheck className="size-4" /> حُفظت نتيجتك تلقائيًا في سجل المدرسة
          </p>

          {/* الأزرار */}
          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            <button onClick={onReview} className="flex items-center justify-center gap-2 rounded-2xl bg-saudi-600 px-5 py-3.5 font-head font-extrabold text-white shadow-lg shadow-saudi-600/25 transition hover:-translate-y-0.5 hover:bg-saudi-700">
              <ListChecks className="size-5" /> مراجعة الإجابات
            </button>
            <button onClick={onCertificate} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-400 px-5 py-3.5 font-head font-extrabold text-white shadow-lg shadow-gold-500/25 transition hover:-translate-y-0.5">
              <Award className="size-5" /> شهادة الإنجاز (طباعة / PDF)
            </button>
            <button onClick={onRetake} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-saudi-200 bg-white px-5 py-3.5 font-head font-extrabold text-saudi-700 transition hover:-translate-y-0.5 hover:border-saudi-400">
              <RotateCcw className="size-5" /> محاولة جديدة
            </button>
            <button onClick={onHome} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-sand-200 bg-white px-5 py-3.5 font-head font-extrabold text-slate-600 transition hover:-translate-y-0.5 hover:border-saudi-300">
              <Home className="size-5" /> الرئيسية
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
