import { useMemo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, Lightbulb, MinusCircle, XCircle,
} from 'lucide-react';
import type { AttemptResult, Question } from '../types';
import { UNIT_META } from '../data/questions';
import { getQuestionMap } from '../lib/db';

interface ReviewProps {
  result: AttemptResult;
  onBack: () => void;
}

type Filter = 'all' | 'correct' | 'wrong' | 'skipped';

function answerText(q: Question, a: number | boolean | null): string {
  if (a === null || a === undefined) return 'لم تُجب';
  if (q.type === 'mcq' && typeof a === 'number' && q.options) return q.options[a];
  if (q.type === 'tf' && typeof a === 'boolean') return a ? 'صح' : 'خطأ';
  return '—';
}

function correctText(q: Question): string {
  if (q.type === 'mcq' && q.options && q.correctIndex !== undefined) return q.options[q.correctIndex];
  if (q.type === 'tf') return q.correctBool ? 'صح' : 'خطأ';
  return '—';
}

export default function Review({ result, onBack }: ReviewProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    /* في وضع الخادم: يُستخدم البنك المُعاد مع النتيجة بعد التسليم */
    const bank = result.bank
      ? new Map(result.bank.map((q) => [q.id, q]))
      : getQuestionMap();
    return result.details.map((d) => ({ d, q: bank.get(d.id) })).filter((x): x is { d: typeof x.d; q: Question } => Boolean(x.q));
  }, [result]);

  const filtered = rows.filter(({ d }) => {
    if (filter === 'correct') return d.ok;
    if (filter === 'wrong') return !d.ok && d.a !== null;
    if (filter === 'skipped') return d.a === null;
    return true;
  });

  const counts = {
    all: rows.length,
    correct: rows.filter((r) => r.d.ok).length,
    wrong: rows.filter((r) => !r.d.ok && r.d.a !== null).length,
    skipped: rows.filter((r) => r.d.a === null).length,
  };

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: counts.all },
    { key: 'correct', label: 'الصحيحة', count: counts.correct },
    { key: 'wrong', label: 'الخاطئة', count: counts.wrong },
    { key: 'skipped', label: 'المتروكة', count: counts.skipped },
  ];

  return (
    <div className="pattern-bg min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="anim-screen flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-head text-3xl font-black text-saudi-900">مراجعة الإجابات</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {result.studentName} — {result.score} من {result.total} درجة
            </p>
          </div>
          <button onClick={onBack} className="flex items-center gap-2 rounded-2xl bg-saudi-600 px-5 py-3 font-head font-extrabold text-white shadow-lg shadow-saudi-600/25 transition hover:-translate-y-0.5 hover:bg-saudi-700">
            <ArrowRight className="size-5" /> العودة للنتيجة
          </button>
        </div>

        {/* المرشحات */}
        <div className="anim-screen d-1 mt-6 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                filter === c.key ? 'bg-saudi-600 text-white shadow-md shadow-saudi-600/25' : 'bg-white text-slate-500 ring-1 ring-sand-200 hover:ring-saudi-300'
              }`}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>

        {/* القائمة */}
        <div className="mt-5 grid gap-4">
          {filtered.map(({ d, q }, idx) => {
            const skipped = d.a === null;
            const mine = answerText(q, d.a);
            const right = correctText(q);
            return (
              <article key={d.id} className="anim-screen overflow-hidden rounded-3xl border border-saudi-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: `${Math.min(idx, 8) * 0.05}s` }}>
                <div className="flex flex-wrap items-center gap-2">
                  {d.ok ? (
                    <span className="flex items-center gap-1 rounded-full bg-saudi-100 px-3 py-1 text-xs font-extrabold text-saudi-700"><CheckCircle2 className="size-3.5" /> صحيحة +{q.marks}</span>
                  ) : skipped ? (
                    <span className="flex items-center gap-1 rounded-full bg-sand-100 px-3 py-1 text-xs font-extrabold text-slate-500"><MinusCircle className="size-3.5" /> دون إجابة</span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600"><XCircle className="size-3.5" /> خاطئة</span>
                  )}
                  <span className="rounded-full bg-cloud-100 px-3 py-1 text-xs font-extrabold text-cloud-400">{UNIT_META[q.unit].short}</span>
                  <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-extrabold text-slate-500">
                    {q.type === 'mcq' ? 'اختيار من متعدد' : 'صح أو خطأ'}
                  </span>
                </div>

                <h3 className="mt-3 font-head text-lg font-extrabold leading-relaxed text-saudi-950">{q.question}</h3>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className={`rounded-2xl p-3 ring-1 ${d.ok ? 'bg-saudi-50 ring-saudi-100' : skipped ? 'bg-sand-100 ring-sand-200' : 'bg-red-50 ring-red-100'}`}>
                    <p className="text-[11px] font-extrabold text-slate-400">إجابتك</p>
                    <p className={`mt-0.5 text-sm font-bold ${d.ok ? 'text-saudi-700' : skipped ? 'text-slate-500' : 'text-red-600'}`}>{mine}</p>
                  </div>
                  <div className="rounded-2xl bg-saudi-50 p-3 ring-1 ring-saudi-100">
                    <p className="text-[11px] font-extrabold text-slate-400">الإجابة الصحيحة</p>
                    <p className="mt-0.5 text-sm font-bold text-saudi-700">{right}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-2xl bg-cloud-50 p-3 ring-1 ring-cloud-100">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold-500" />
                  <p className="text-sm font-medium leading-relaxed text-slate-600">{q.explanation}</p>
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && (
            <p className="rounded-3xl bg-white p-10 text-center font-head text-lg font-bold text-slate-400 ring-1 ring-sand-200">لا توجد أسئلة ضمن هذا التصنيف</p>
          )}
        </div>
      </div>
    </div>
  );
}
