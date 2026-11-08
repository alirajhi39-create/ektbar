import { useEffect, useMemo } from 'react';
import { ArrowRight, FileText, Printer } from 'lucide-react';
import type { AttemptResult, Question } from '../types';
import { SCHOOL, CERTIFICATE_MIN_PERCENTAGE } from '../data/school';
import { formatGregorian, formatHijri, formatTime, getLevel } from '../lib/utils';
import { UNIT_META } from '../data/questions';

interface ReportPrintProps {
  attempts: AttemptResult[];
  bank: Question[];
  /** تقرير فردي مفصل لطالب واحد */
  single: boolean;
  onClose: () => void;
}

function GeoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="3">
        <rect x="22" y="22" width="56" height="56" />
        <rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="9" />
      </g>
    </svg>
  );
}

function answerText(q: Question, a: number | boolean | null): string {
  if (a === null || a === undefined) return 'لم يُجب';
  if (q.type === 'mcq' && typeof a === 'number' && q.options) return q.options[a] ?? '—';
  if (q.type === 'tf' && typeof a === 'boolean') return a ? 'صح' : 'خطأ';
  return '—';
}

function correctText(q: Question): string {
  if (q.type === 'mcq' && q.options && q.correctIndex !== undefined) return q.options[q.correctIndex] ?? '—';
  if (q.type === 'tf') return q.correctBool ? 'صح' : 'خطأ';
  return '—';
}

export default function ReportPrint({ attempts, bank, single, onClose }: ReportPrintProps) {
  /* اتجاه A4 عمودي للتقرير — يُزال تلقائيًا عند إغلاق الشاشة فتعود الشهادة لأفقية */
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'report-print-orientation';
    style.textContent = '@media print { @page { size: A4 portrait; margin: 12mm; } }';
    document.head.appendChild(style);
    return () => { document.getElementById('report-print-orientation')?.remove(); };
  }, []);

  const bankMap = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank]);
  const now = new Date().toISOString();

  const stats = useMemo(() => {
    if (attempts.length === 0) return { count: 0, avg: 0, top: 0, pass: 0, perfect: 0 };
    const sum = attempts.reduce((s, a) => s + a.score, 0);
    const pass = attempts.filter((a) => a.percentage >= 60).length;
    return {
      count: attempts.length,
      avg: Math.round((sum / attempts.length) * 10) / 10,
      top: Math.max(...attempts.map((a) => a.score)),
      pass: Math.round((pass / attempts.length) * 100),
      perfect: attempts.filter((a) => a.percentage >= CERTIFICATE_MIN_PERCENTAGE).length,
    };
  }, [attempts]);

  const title = single
    ? 'تقرير نتيجة طالب مفصّل'
    : 'تقرير نتائج اختبار الدراسات الاجتماعية';

  return (
    <div className="pattern-bg min-h-screen px-4 py-8">
      {/* شريط الأدوات — لا يُطبع */}
      <div className="no-print anim-screen mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-3xl border border-saudi-100 bg-white p-4 shadow-lg shadow-saudi-900/5">
        <button onClick={onClose} className="flex items-center gap-2 rounded-2xl border-2 border-sand-200 px-4 py-2.5 font-head font-extrabold text-slate-600 transition hover:border-saudi-300 hover:text-saudi-700">
          <ArrowRight className="size-5" /> العودة للوحة
        </button>
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 font-head text-lg font-black text-saudi-900"><FileText className="size-5" /> {title}</p>
          <p className="text-xs font-bold text-slate-400">ورقة A4 جاهزة — اختر «حفظ بتنسيق PDF» من نافذة الطباعة إن أردت نسخة رقمية</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-saudi-700 to-saudi-500 px-5 py-2.5 font-head font-extrabold text-white shadow-lg shadow-saudi-600/25 transition hover:-translate-y-0.5">
          <Printer className="size-5" /> طباعة / حفظ PDF
        </button>
      </div>

      {/* ورقة A4 عمودية */}
      <div className="flex justify-center">
        <div className="report-viewport [zoom:0.42] min-[480px]:[zoom:0.55] sm:[zoom:0.7] md:[zoom:0.82] lg:[zoom:0.95] xl:[zoom:1]">
          <div
            id="report-print-area"
            className="report-sheet relative mx-auto bg-white p-[14mm] shadow-2xl"
            style={{ width: '210mm', minHeight: '297mm', transformOrigin: 'top center' }}
          >
            {/* إطار زخرفي */}
            <div className="pointer-events-none absolute inset-[4mm] border border-gold-300/70" aria-hidden />
            <div className="pointer-events-none absolute inset-[6mm] border-[0.3mm] border-saudi-600/40" aria-hidden />
            <GeoMark className="pointer-events-none absolute right-[7mm] top-[7mm] size-[11mm] text-gold-400/70" />
            <GeoMark className="pointer-events-none absolute bottom-[7mm] left-[7mm] size-[11mm] text-gold-400/70" />

            <div className="relative">
              {/* الترويسة */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-saudi-600 pb-3">
                <div className="text-right">
                  <p className="font-head text-[6mm] font-black leading-tight text-saudi-800">{SCHOOL.name}</p>
                  <p className="mt-[1mm] text-[3.2mm] font-bold text-slate-500">{SCHOOL.platform} — {SCHOOL.grade}</p>
                </div>
                <div className="text-left">
                  <p className="text-[3.2mm] font-bold text-slate-500">{formatHijri(now)}</p>
                  <p className="text-[3.2mm] font-bold text-slate-500">{formatGregorian(now)}</p>
                </div>
              </div>

              {/* العنوان */}
              <div className="mt-[6mm] text-center">
                <h1 className="font-head text-[7.5mm] font-black text-saudi-900">{title}</h1>
                <p className="mt-[1.5mm] text-[3.4mm] font-bold text-gold-600">الوحدات الثلاث: التاريخ · الدولة السعودية الأولى · الدولة السعودية الثانية</p>
                {single && attempts[0] && (
                  <p className="mt-[2mm] text-[4mm] font-extrabold text-saudi-700">
                    الطالب/ة: {attempts[0].studentName}
                    {attempts[0].className ? ` — ${attempts[0].className}` : ''}
                  </p>
                )}
              </div>

              {/* ملخص إحصائي */}
              <div className="mt-[6mm] grid grid-cols-5 gap-[2mm] text-center">
                {[
                  { label: 'عدد المحاولات', value: String(stats.count) },
                  { label: 'متوسط الدرجات', value: String(stats.avg) },
                  { label: 'أعلى درجة', value: String(stats.top) },
                  { label: 'نسبة النجاح', value: `${stats.pass}%` },
                  { label: 'مستحقو الشهادة', value: String(stats.perfect) },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-saudi-50 px-[1mm] py-[2.5mm] ring-1 ring-saudi-100">
                    <p className="font-head text-[5.5mm] font-black leading-tight text-saudi-800">{s.value}</p>
                    <p className="mt-[0.5mm] text-[2.6mm] font-extrabold text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
              {!single && (
                <p className="mt-[2mm] text-center text-[2.8mm] font-bold text-slate-400">
                  مستحقو الشهادة: الطلاب الحاصلون على {CERTIFICATE_MIN_PERCENTAGE}% فأكثر
                </p>
              )}

              {/* جدول النتائج */}
              <table className="report-table mt-[6mm] w-full border-collapse text-right">
                <thead>
                  <tr className="bg-saudi-600 text-white">
                    <th className="border border-saudi-500 px-[2mm] py-[2mm] text-[3mm] font-extrabold">م</th>
                    <th className="border border-saudi-500 px-[2mm] py-[2mm] text-[3mm] font-extrabold">اسم الطالب</th>
                    <th className="border border-saudi-500 px-[2mm] py-[2mm] text-[3mm] font-extrabold">الشعبة</th>
                    <th className="border border-saudi-500 px-[2mm] py-[2mm] text-[3mm] font-extrabold">الدرجة</th>
                    <th className="border border-saudi-500 px-[2mm] py-[2mm] text-[3mm] font-extrabold">النسبة</th>
                    <th className="border border-saudi-500 px-[2mm] py-[2mm] text-[3mm] font-extrabold">ص / خ / م</th>
                    <th className="border border-saudi-500 px-[2mm] py-[2mm] text-[3mm] font-extrabold">المستوى</th>
                    <th className="border border-saudi-500 px-[2mm] py-[2mm] text-[3mm] font-extrabold">التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a, i) => (
                    <tr key={a.id} className={i % 2 === 1 ? 'bg-sand-50' : 'bg-white'}>
                      <td className="border border-sand-200 px-[2mm] py-[1.6mm] text-center text-[3mm] font-bold">{i + 1}</td>
                      <td className="border border-sand-200 px-[2mm] py-[1.6mm] text-[3.1mm] font-extrabold text-saudi-900">{a.studentName}</td>
                      <td className="border border-sand-200 px-[2mm] py-[1.6mm] text-center text-[3mm]">{a.className || '—'}</td>
                      <td className="border border-sand-200 px-[2mm] py-[1.6mm] text-center text-[3.1mm] font-black text-saudi-800">{a.score}/{a.total}</td>
                      <td className="border border-sand-200 px-[2mm] py-[1.6mm] text-center text-[3mm] font-bold">{Math.round(a.percentage)}%</td>
                      <td className="border border-sand-200 px-[2mm] py-[1.6mm] text-center text-[2.8mm]">{a.correct} / {a.wrong} / {a.unanswered}</td>
                      <td className="border border-sand-200 px-[2mm] py-[1.6mm] text-center text-[2.9mm] font-extrabold">{getLevel(a.percentage).label}</td>
                      <td className="border border-sand-200 px-[2mm] py-[1.6mm] text-center text-[2.6mm]">{formatGregorian(a.dateISO)} · {formatTime(a.dateISO)}</td>
                    </tr>
                  ))}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="border border-sand-200 py-[8mm] text-center text-[3.5mm] font-bold text-slate-400">لا توجد نتائج ضمن نطاق التقرير</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* تفاصيل إجابات الطالب في التقرير الفردي */}
              {single && attempts[0] && (
                <div className="mt-[6mm]">
                  <h2 className="border-r-[1.5mm] border-gold-400 pr-[2mm] font-head text-[4.5mm] font-black text-saudi-900">تفاصيل الإجابات</h2>
                  <table className="report-table mt-[3mm] w-full border-collapse text-right">
                    <thead>
                      <tr className="bg-saudi-50">
                        <th className="border border-sand-200 px-[2mm] py-[1.5mm] text-[2.8mm] font-extrabold">م</th>
                        <th className="border border-sand-200 px-[2mm] py-[1.5mm] text-[2.8mm] font-extrabold">السؤال</th>
                        <th className="border border-sand-200 px-[2mm] py-[1.5mm] text-[2.8mm] font-extrabold">الوحدة</th>
                        <th className="border border-sand-200 px-[2mm] py-[1.5mm] text-[2.8mm] font-extrabold">إجابة الطالب</th>
                        <th className="border border-sand-200 px-[2mm] py-[1.5mm] text-[2.8mm] font-extrabold">النتيجة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts[0].details.map((d, i) => {
                        const q = bankMap.get(d.id);
                        const skipped = d.a === null;
                        return (
                          <tr key={d.id} className={d.ok ? 'bg-saudi-50/60' : skipped ? 'bg-sand-50' : 'bg-red-50/50'}>
                            <td className="border border-sand-200 px-[2mm] py-[1.3mm] text-center text-[2.7mm]">{i + 1}</td>
                            <td className="border border-sand-200 px-[2mm] py-[1.3mm] text-[2.7mm] font-bold">{q?.question ?? '—'}</td>
                            <td className="border border-sand-200 px-[2mm] py-[1.3mm] text-center text-[2.5mm]">{q ? UNIT_META[q.unit].short : '—'}</td>
                            <td className="border border-sand-200 px-[2mm] py-[1.3mm] text-center text-[2.7mm]">{q ? answerText(q, d.a) : '—'}</td>
                            <td className={`border border-sand-200 px-[2mm] py-[1.3mm] text-center text-[2.7mm] font-extrabold ${d.ok ? 'text-saudi-700' : skipped ? 'text-slate-500' : 'text-red-600'}`}>
                              {d.ok ? 'صحيحة (+2)' : skipped ? 'متروكة' : `خاطئة — الصحيحة: ${q ? correctText(q) : '—'}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-[3mm] rounded-xl bg-cloud-50 p-[2mm] text-center text-[3mm] font-bold text-saudi-700 ring-1 ring-cloud-100">
                    المجموع: {attempts[0].score} من {attempts[0].total} درجة — النسبة {Math.round(attempts[0].percentage)}% — التقدير {getLevel(attempts[0].percentage).label}
                  </p>
                </div>
              )}

              {/* التوقيعات */}
              <div className="mt-[12mm] flex items-end justify-between px-[6mm]">
                <div className="text-center">
                  <p className="font-head text-[3.4mm] font-black text-saudi-800">{SCHOOL.teacher}</p>
                  <p className="border-t border-slate-300 px-[10mm] pt-[1mm] text-[2.9mm] font-bold text-slate-500">معلم الدراسات الاجتماعية</p>
                </div>
                <div className="pb-[1mm] text-center">
                  <p className="text-[2.8mm] font-bold text-slate-400">يُعتمد التقرير بتوقيع</p>
                </div>
                <div className="text-center">
                  <p className="font-head text-[3.4mm] font-black text-saudi-800">{SCHOOL.principal}</p>
                  <p className="border-t border-slate-300 px-[10mm] pt-[1mm] text-[2.9mm] font-bold text-slate-500">مدير المدرسة</p>
                </div>
              </div>

              <p className="mt-[6mm] border-t border-sand-200 pt-[2mm] text-center text-[2.6mm] font-bold text-slate-400">
                {SCHOOL.name} — {SCHOOL.platform} — مستخرج آليًا من سجل النتائج · {formatGregorian(now)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
