import { ArrowRight, Printer } from 'lucide-react';
import type { AttemptResult } from '../types';
import { formatGregorian, formatHijri, getLevel } from '../lib/utils';

interface CertificateProps {
  result: AttemptResult;
  onBack: () => void;
}

/** نجمة ثمانية هندسية — زخرفة نجدية */
function GeoStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="3">
        <rect x="22" y="22" width="56" height="56" />
        <rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="10" />
      </g>
    </svg>
  );
}

/** ختم المنصة */
function Seal() {
  return (
    <svg viewBox="0 0 120 120" className="size-[30mm] text-saudi-700" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 4" />
      <path d="M60 30l7.5 15.2 16.8 2.4-12.2 11.9 2.9 16.7L60 68.4l-15 7.8 2.9-16.7-12.2-11.9 16.8-2.4z" fill="#C9A227" stroke="none" />
      <path id="sealArc" d="M60 14 a46 46 0 0 1 0 92" fill="none" stroke="none" />
      <text fontSize="10.5" fontWeight="700" fill="currentColor" fontFamily="Cairo, sans-serif">
        <textPath href="#sealArc" startOffset="6">تحدي الدراسات الاجتماعية · مدرسة العروس</textPath>
      </text>
      <text x="60" y="98" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" fontFamily="Cairo, sans-serif">الصف السادس الابتدائي</text>
    </svg>
  );
}

export default function Certificate({ result, onBack }: CertificateProps) {
  const level = getLevel(result.percentage);

  return (
    <div className="pattern-bg min-h-screen px-4 py-8">
      {/* شريط الأدوات — لا يُطبع */}
      <div className="anim-screen mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-3xl border border-saudi-100 bg-white p-4 shadow-lg shadow-saudi-900/5">
        <button onClick={onBack} className="flex items-center gap-2 rounded-2xl border-2 border-sand-200 px-4 py-2.5 font-head font-extrabold text-slate-600 transition hover:border-saudi-300 hover:text-saudi-700">
          <ArrowRight className="size-5" /> العودة
        </button>
        <div className="text-center">
          <p className="font-head text-lg font-black text-saudi-900">شهادة إنجاز جاهزة</p>
          <p className="text-xs font-bold text-slate-400">للتنزيل PDF: من نافذة الطباعة اختر «حفظ بتنسيق PDF» والاتجاه «أفقي»</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-saudi-700 to-saudi-500 px-5 py-2.5 font-head font-extrabold text-white shadow-lg shadow-saudi-600/25 transition hover:-translate-y-0.5">
          <Printer className="size-5" /> طباعة / حفظ PDF
        </button>
      </div>

      {/* ورقة A4 أفقية */}
      <div className="flex justify-center">
        <div className="cert-viewport [zoom:0.28] min-[480px]:[zoom:0.38] sm:[zoom:0.48] md:[zoom:0.62] lg:[zoom:0.75] xl:[zoom:0.85]">
          <div
            id="print-area"
            className="cert-sheet relative mx-auto overflow-hidden bg-white shadow-2xl"
            style={{ width: '297mm', height: '210mm', transformOrigin: 'top center' }}
          >
            {/* الإطار الخارجي الذهبي */}
            <div className="absolute inset-0" style={{ border: '3.2mm solid #C9A227' }} aria-hidden />
            <div className="absolute" style={{ inset: '5mm', border: '0.6mm solid #006C35' }} aria-hidden />
            <div className="absolute" style={{ inset: '7mm', border: '0.25mm solid #C9A227' }} aria-hidden />

            {/* زخارف الزوايا */}
            <GeoStar className="absolute right-[9mm] top-[9mm] size-[16mm] text-gold-500" />
            <GeoStar className="absolute left-[9mm] top-[9mm] size-[16mm] text-gold-500" />
            <GeoStar className="absolute bottom-[9mm] right-[9mm] size-[16mm] text-gold-500" />
            <GeoStar className="absolute bottom-[9mm] left-[9mm] size-[16mm] text-gold-500" />

            {/* نقش الخلفية */}
            <div className="absolute inset-[8mm] pattern-bg opacity-70" aria-hidden />

            {/* المحتوى */}
            <div className="relative flex h-full flex-col items-center px-[22mm] py-[12mm] text-center">
              <p className="font-head text-[6.5mm] font-extrabold text-saudi-800">مدرسة العروس الابتدائية</p>
              <p className="mt-[1mm] text-[3.2mm] font-bold tracking-wide text-slate-500">منصة تحدي الدراسات الاجتماعية — الصف السادس الابتدائي</p>

              <h1
                className="mt-[4mm] bg-gradient-to-l from-saudi-700 via-saudi-600 to-gold-500 bg-clip-text font-head text-[17mm] font-black leading-none text-transparent"
              >
                شهادة إنجاز
              </h1>

              {/* فاصل مُعيّني */}
              <svg viewBox="0 0 220 16" className="mt-[3mm] h-[5mm] w-[70mm] text-gold-500" aria-hidden>
                <line x1="0" y1="8" x2="88" y2="8" stroke="currentColor" strokeWidth="1.6" />
                <line x1="132" y1="8" x2="220" y2="8" stroke="currentColor" strokeWidth="1.6" />
                <rect x="102" y="0.8" x2="110" width="14.4" height="14.4" transform="rotate(45 110 8)" fill="#006C35" />
                <rect x="88" y="4" width="8" height="8" transform="rotate(45 92 8)" fill="currentColor" opacity="0.7" />
                <rect x="124" y="4" width="8" height="8" transform="rotate(45 128 8)" fill="currentColor" opacity="0.7" />
              </svg>

              <p className="mt-[4mm] text-[4mm] font-bold text-slate-500">تُمنح هذه الشهادة بكل فخر واعتزاز إلى الطالب/ة:</p>
              <p className="mt-[2mm] border-b-[0.4mm] border-dashed border-gold-400 px-[14mm] pb-[2mm] font-head text-[11mm] font-black leading-tight text-saudi-800">
                {result.studentName}
                {result.className ? <span className="mr-[4mm] align-middle font-head text-[4.5mm] font-bold text-slate-400">— {result.className}</span> : null}
              </p>

              <p className="mt-[5mm] max-w-[220mm] text-[4.3mm] font-medium leading-[1.9] text-slate-600">
                تُمنح هذه الشهادة تقديرًا لإتمام اختبار الدراسات الاجتماعية التفاعلي للصف السادس الابتدائي،
                متمنين له دوام التوفيق والنجاح.
              </p>

              {/* الدرجات */}
              <div className="mt-[5mm] flex items-stretch gap-[5mm]">
                <div className="rounded-2xl bg-saudi-50 px-[9mm] py-[3mm] ring-1 ring-saudi-100">
                  <p className="text-[3mm] font-extrabold text-saudi-600">الدرجة</p>
                  <p className="font-head text-[7.5mm] font-black leading-tight text-saudi-800">
                    {result.score}<span className="text-[4mm] text-slate-400"> / {result.total}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-gold-50 px-[9mm] py-[3mm] ring-1 ring-gold-200">
                  <p className="text-[3mm] font-extrabold text-gold-600">النسبة المئوية</p>
                  <p className="font-head text-[7.5mm] font-black leading-tight text-gold-700">{Math.round(result.percentage)}%</p>
                </div>
                <div className="rounded-2xl bg-cloud-50 px-[9mm] py-[3mm] ring-1 ring-cloud-100">
                  <p className="text-[3mm] font-extrabold text-cloud-400">التقدير</p>
                  <p className="font-head text-[7.5mm] font-black leading-tight text-saudi-800">{level.label}</p>
                </div>
              </div>

              {/* الأسفل: التوقيعات والختم */}
              <div className="mt-auto flex w-full items-end justify-between px-[6mm]">
                <div className="text-center">
                  <p className="border-b-[0.35mm] border-slate-300 px-[10mm] pb-[7mm] text-[3.8mm] font-bold text-slate-500">معلم الدراسات الاجتماعية</p>
                  <p className="mt-[2mm] text-[3mm] font-bold text-slate-400">التوقيع</p>
                </div>

                <div className="flex flex-col items-center gap-[2mm]">
                  <Seal />
                  <p className="text-[3.2mm] font-bold text-slate-500">
                    {formatHijri(result.dateISO)} — {formatGregorian(result.dateISO)}
                  </p>
                </div>

                <div className="text-center">
                  <p className="border-b-[0.35mm] border-slate-300 px-[10mm] pb-[7mm] text-[3.8mm] font-bold text-slate-500">مدير المدرسة</p>
                  <p className="mt-[2mm] text-[3mm] font-bold text-slate-400">التوقيع</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
