import { useRef, useState } from 'react';
import {
  Check, Download, FileSpreadsheet, FileText, Loader2, UploadCloud,
  X, AlertTriangle, Layers, Replace,
} from 'lucide-react';
import type { Question } from '../types';
import { UNIT_META } from '../data/questions';
import { downloadTemplate, parseQuestionFile, SUPPORTED_EXTENSIONS, type ImportResult } from '../lib/importQuestions';

interface ImportDialogProps {
  existingCount: number;
  onConfirm: (questions: Question[], replace: boolean) => Promise<void>;
  onClose: () => void;
}

type Stage = 'idle' | 'reading' | 'preview' | 'saving';

export default function ImportDialog({ existingCount, onConfirm, onClose }: ImportDialogProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [replace, setReplace] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    setFileName(file.name);
    setStage('reading');
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('حجم الملف أكبر من 15 ميجابايت');
      const parsed = await parseQuestionFile(file);
      setResult(parsed);
      setStage('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر قراءة الملف');
      setStage('idle');
    }
  };

  const doImport = async () => {
    if (!result || stage === 'saving') return;
    setStage('saving');
    try {
      await onConfirm(result.questions, replace);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الأسئلة');
      setStage('preview');
    }
  };

  const mcq = result?.questions.filter((q) => q.type === 'mcq').length ?? 0;
  const tf = result?.questions.filter((q) => q.type === 'tf').length ?? 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-saudi-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="anim-pop my-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* الترويسة */}
        <div className="flex items-center justify-between border-b border-sand-200 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-saudi-100 text-saudi-700"><UploadCloud className="size-5" /></span>
            <div>
              <h3 className="font-head text-xl font-black text-saudi-900">استيراد أسئلة من ملف</h3>
              <p className="text-xs font-bold text-slate-400">PDF · Word · Excel · CSV · TXT — تتم القراءة على جهازك فقط</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="grid size-10 place-items-center rounded-xl bg-sand-100 text-slate-500 transition hover:bg-sand-200">
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
          {/* منطقة الرفع */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault(); setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleFile(f);
            }}
            onClick={() => stage !== 'reading' && stage !== 'saving' && inputRef.current?.click()}
            className={`grid cursor-pointer place-items-center rounded-3xl border-2 border-dashed p-7 text-center transition ${
              drag ? 'border-saudi-500 bg-saudi-50' : 'border-sand-300 bg-sand-50 hover:border-saudi-400 hover:bg-saudi-50/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={SUPPORTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
            />
            {stage === 'reading' ? (
              <>
                <Loader2 className="size-10 animate-spin text-saudi-600" />
                <p className="mt-3 font-head text-lg font-extrabold text-saudi-900">جارٍ قراءة {fileName}…</p>
                <p className="mt-1 text-xs font-bold text-slate-400">قد تستغرق ملفات PDF لحظات لاستخراج النصوص</p>
              </>
            ) : (
              <>
                <span className="grid size-14 place-items-center rounded-2xl bg-white text-saudi-600 shadow-sm ring-1 ring-sand-200"><FileText className="size-7" /></span>
                <p className="mt-3 font-head text-lg font-extrabold text-saudi-900">اسحب الملف هنا أو اضغط للاختيار</p>
                <p className="mt-1 text-sm font-bold text-slate-500">.pdf &nbsp;·&nbsp; .docx &nbsp;·&nbsp; .xlsx &nbsp;·&nbsp; .csv &nbsp;·&nbsp; .txt</p>
                {fileName && <p className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-saudi-700 ring-1 ring-sand-200">{fileName}</p>}
              </>
            )}
          </div>

          <p className="text-center text-[11px] font-bold text-slate-400">
            💡 بعض ملفات PDF العربية تُخرج النص بحروف معكوسة؛ إن حدث ذلك فانسخ الأسئلة إلى Word أو استخدم النموذج أدناه.
          </p>

          {error && (
            <p className="anim-shake flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm font-bold leading-relaxed text-red-600 ring-1 ring-red-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}

          {/* نموذج جاهز */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cloud-50 p-4 ring-1 ring-cloud-100">
            <div>
              <p className="flex items-center gap-1.5 font-head text-sm font-extrabold text-saudi-800"><FileSpreadsheet className="size-4 text-cloud-400" /> الأسهل: حمّل النموذج واملأه</p>
              <p className="mt-0.5 text-xs font-bold text-slate-500">أعمدة: السؤال · أ · ب · ج · د · الإجابة الصحيحة · الوحدة · التفسير</p>
            </div>
            <button onClick={downloadTemplate} className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-extrabold text-saudi-700 ring-1 ring-cloud-200 transition hover:bg-cloud-100">
              <Download className="size-4" /> تحميل نموذج CSV
            </button>
          </div>

          {/* المعاينة */}
          {result && stage !== 'reading' && (
            <>
              <div className="rounded-2xl border border-saudi-100 bg-saudi-50/60 p-4">
                <p className="flex items-center gap-2 font-head text-base font-black text-saudi-900">
                  <Check className="size-5 text-saudi-600" /> تم التعرف على {result.questions.length} سؤالًا
                  <span className="text-xs font-bold text-slate-400">({result.sourceLabel})</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-extrabold">
                  <span className="rounded-full bg-white px-3 py-1 text-saudi-700 ring-1 ring-saudi-100">اختيار من متعدد: {mcq}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-gold-700 ring-1 ring-gold-200">صح أو خطأ: {tf}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-cloud-400 ring-1 ring-cloud-100">المجموع: {result.questions.length * 2} درجة</span>
                </div>
                {result.warnings.length > 0 && (
                  <div className="mt-3 rounded-xl bg-gold-50 p-3 ring-1 ring-gold-200">
                    <p className="text-xs font-extrabold text-gold-700">ملاحظات ({result.warnings.length}):</p>
                    <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto text-[11px] font-bold text-gold-700">
                      {result.warnings.slice(0, 6).map((w, i) => <li key={i}>• {w}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* عيّنة من الأسئلة */}
              <div className="grid gap-2">
                {result.questions.slice(0, 4).map((q) => {
                  const correct = q.type === 'mcq'
                    ? q.options?.[q.correctIndex ?? 0]
                    : q.correctBool ? 'صح' : 'خطأ';
                  return (
                    <div key={q.id} className="rounded-2xl border border-sand-200 bg-white p-3">
                      <div className="flex items-start gap-2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sand-100 text-xs font-black text-saudi-800">{q.id}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-saudi-950">{q.question}</p>
                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            {UNIT_META[q.unit].short} · {q.type === 'mcq' ? 'اختيار من متعدد' : 'صح أو خطأ'} ·{' '}
                            <span className="text-saudi-700">الصحيحة: {correct}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {result.questions.length > 4 && (
                  <p className="text-center text-xs font-bold text-slate-400">+ {result.questions.length - 4} سؤالًا آخر…</p>
                )}
              </div>

              {/* طريقة الإضافة */}
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => setReplace(false)}
                  className={`flex items-start gap-2.5 rounded-2xl border-2 p-3.5 text-right transition ${!replace ? 'border-saudi-500 bg-saudi-50' : 'border-sand-200 bg-white hover:border-saudi-300'}`}
                >
                  <Layers className={`mt-0.5 size-5 shrink-0 ${!replace ? 'text-saudi-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="font-head text-sm font-extrabold text-saudi-900">إضافة للبنك الحالي</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">يصبح العدد {existingCount + result.questions.length} سؤالًا</p>
                  </div>
                </button>
                <button
                  onClick={() => setReplace(true)}
                  className={`flex items-start gap-2.5 rounded-2xl border-2 p-3.5 text-right transition ${replace ? 'border-gold-500 bg-gold-50' : 'border-sand-200 bg-white hover:border-gold-300'}`}
                >
                  <Replace className={`mt-0.5 size-5 shrink-0 ${replace ? 'text-gold-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="font-head text-sm font-extrabold text-saudi-900">استبدال البنك بالكامل</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">تُحذف الأسئلة الحالية ويحل محلها المستورد</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* إرشادات الصيغة الحرة */}
          <details className="rounded-2xl border border-sand-200 bg-sand-50 p-3.5">
            <summary className="cursor-pointer text-sm font-extrabold text-saudi-800">صيغة النص الحر المدعومة (اضغط للعرض)</summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-white p-3 text-[11px] font-bold leading-relaxed text-slate-600" dir="rtl">
{`السؤال 1: ما المقصود بالتاريخ؟
أ) دراسة الظواهر الطبيعية فقط
ب) تدوين الأحداث الماضية وتفسيرها
ج) دراسة الأعداد
د) وصف الطقس
الإجابة الصحيحة: ب
التفسير: التاريخ تدوين أحداث الماضي وتفسيرها
الوحدة: التاريخ

السؤال 2: الدرعية عاصمة الدولة السعودية الأولى.
الإجابة الصحيحة: صح
الوحدة: الدولة السعودية الأولى`}
            </pre>
            <p className="mt-2 text-[11px] font-bold text-slate-500">
              الإجابة تقبل: أ/ب/ج/د أو A/B/C/D أو 1-4 أو نص الخيار أو «صح / خطأ». تُستنتج الوحدة تلقائيًا من النص إن لم تُذكر.
            </p>
          </details>
        </div>

        {/* الأزرار */}
        <div className="grid grid-cols-2 gap-2.5 border-t border-sand-200 p-5">
          <button
            onClick={doImport}
            disabled={!result || stage === 'saving' || stage === 'reading'}
            className="flex items-center justify-center gap-2 rounded-2xl bg-saudi-600 px-4 py-3 font-head font-extrabold text-white shadow-md shadow-saudi-600/25 transition hover:bg-saudi-700 disabled:opacity-45"
          >
            {stage === 'saving' ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
            {stage === 'saving' ? 'جارٍ الحفظ…' : result ? `استيراد ${result.questions.length} سؤالًا` : 'استيراد الأسئلة'}
          </button>
          <button onClick={onClose} disabled={stage === 'saving'} className="rounded-2xl border-2 border-sand-200 px-4 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300 disabled:opacity-45">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
