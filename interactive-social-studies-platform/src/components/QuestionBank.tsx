import { useMemo, useState } from 'react';
import {
  BookOpenCheck, Check, Crown, Landmark, Lightbulb, Loader2, Pencil, Plus,
  RotateCcw, ScrollText, Search, Trash2, X,
} from 'lucide-react';
import type { Question, QuestionType, UnitKey } from '../types';
import { UNIT_META } from '../data/questions';
import { isAuthError } from '../lib/api';

const TYPE_LABEL: Record<QuestionType, string> = { mcq: 'اختيار من متعدد', tf: 'صح أو خطأ' };
const UNIT_ICON: Record<UnitKey, typeof ScrollText> = { history: ScrollText, first: Landmark, second: Crown };
const LETTERS = ['أ', 'ب', 'ج', 'د'];

interface Editor {
  id: number | null;
  unit: UnitKey;
  type: QuestionType;
  question: string;
  options: string[];
  correctIndex: number;
  correctBool: boolean;
  explanation: string;
}

interface QuestionBankProps {
  bank: Question[];
  custom: boolean;
  /** حفظ البنك (Neon أو محليًا بحسب وضع الاتصال) */
  persist: (qs: Question[]) => Promise<void>;
  /** استعادة البنك الافتراضي وإرجاعه */
  resetDefault: () => Promise<Question[]>;
  notify: (text: string) => void;
  onError: (text: string) => void;
  onAuthFail: () => void;
}

const freshEditor = (): Editor => ({
  id: null, unit: 'history', type: 'mcq',
  question: '', options: ['', '', '', ''], correctIndex: 0, correctBool: true, explanation: '',
});

function correctPreview(q: Question): string {
  if (q.type === 'mcq') return q.options?.[q.correctIndex ?? 0] ?? '—';
  return q.correctBool ? 'صح' : 'خطأ';
}

export default function QuestionBank({ bank, custom, persist, resetDefault, notify, onError, onAuthFail }: QuestionBankProps) {
  const [search, setSearch] = useState('');
  const [unitF, setUnitF] = useState<'all' | UnitKey>('all');
  const [typeF, setTypeF] = useState<'all' | QuestionType>('all');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [err, setErr] = useState('');
  const [delId, setDelId] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalMarks = bank.length * 2;

  const filtered = useMemo(
    () =>
      bank.filter((q) => {
        const t = search.trim();
        return (
          (unitF === 'all' || q.unit === unitF) &&
          (typeF === 'all' || q.type === typeF) &&
          (t === '' || q.question.includes(t))
        );
      }),
    [bank, search, unitF, typeF],
  );

  const handleError = (e: unknown) => {
    if (isAuthError(e)) { onAuthFail(); return; }
    onError(e instanceof Error ? e.message : 'تعذر حفظ التعديلات');
  };

  const openEdit = (q: Question) => {
    setErr('');
    setEditor({
      id: q.id, unit: q.unit, type: q.type, question: q.question,
      options: q.type === 'mcq' ? [...(q.options ?? []), '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      correctIndex: q.correctIndex ?? 0,
      correctBool: q.correctBool ?? true,
      explanation: q.explanation,
    });
  };

  const saveEditor = async () => {
    if (!editor || saving) return;
    const question = editor.question.trim();
    const explanation = editor.explanation.trim();
    if (question.length < 5) { setErr('اكتب نص السؤال كاملًا (5 أحرف على الأقل)'); return; }
    if (editor.type === 'mcq' && editor.options.some((o) => !o.trim())) { setErr('أكمل الخيارات الأربعة قبل الحفظ'); return; }
    if (!explanation) { setErr('اكتب التفسير المختصر — يظهر للطالب بعد التصحيح'); return; }

    const nextQ: Question = {
      id: editor.id ?? Math.max(0, ...bank.map((q) => q.id)) + 1,
      unit: editor.unit,
      type: editor.type,
      marks: 2,
      question,
      explanation,
      ...(editor.type === 'mcq'
        ? { options: editor.options.map((o) => o.trim()), correctIndex: editor.correctIndex }
        : { correctBool: editor.correctBool }),
    };

    const next = (editor.id ? bank.map((q) => (q.id === editor.id ? nextQ : q)) : [...bank, nextQ]).sort((a, b) => a.id - b.id);
    setSaving(true);
    try {
      await persist(next);
      setEditor(null);
      notify(editor.id ? 'تم حفظ تعديلات السؤال بنجاح' : 'تمت إضافة السؤال الجديد إلى البنك');
    } catch (e) {
      handleError(e);
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (delId === null || saving) return;
    setSaving(true);
    try {
      await persist(bank.filter((q) => q.id !== delId));
      setDelId(null);
      notify('حُذف السؤال من البنك');
    } catch (e) {
      handleError(e);
    } finally {
      setSaving(false);
    }
  };

  const doReset = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await resetDefault();
      setResetOpen(false);
      notify('تمت استعادة بنك الأسئلة الافتراضي (30 سؤالًا)');
    } catch (e) {
      handleError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* ترويسة البنك */}
      <div className="anim-screen flex flex-wrap items-center gap-3 rounded-3xl border border-saudi-100 bg-white p-5 shadow-sm">
        <span className="grid size-12 place-items-center rounded-2xl bg-saudi-100 text-saudi-700">
          <BookOpenCheck className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="font-head text-xl font-black text-saudi-900">بنك الأسئلة</h2>
          <p className="text-sm font-bold text-slate-500">
            {bank.length} سؤالًا · المجموع {totalMarks} درجة (درجتان لكل سؤال)
            {custom && <span className="mr-2 rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-extrabold text-gold-700">بنك معدّل</span>}
          </p>
        </div>
        <button onClick={() => { setErr(''); setEditor(freshEditor()); }} className="flex items-center gap-2 rounded-2xl bg-saudi-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-saudi-600/25 transition hover:-translate-y-0.5 hover:bg-saudi-700">
          <Plus className="size-4" /> إضافة سؤال
        </button>
        {custom && (
          <button onClick={() => setResetOpen(true)} className="flex items-center gap-2 rounded-2xl bg-gold-50 px-4 py-2.5 text-sm font-extrabold text-gold-700 ring-1 ring-gold-200 transition hover:bg-gold-100">
            <RotateCcw className="size-4" /> استعادة الافتراضي
          </button>
        )}
      </div>

      {/* المرشحات */}
      <div className="anim-screen d-1 mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في نص السؤال…" className="w-full rounded-2xl border-2 border-sand-200 bg-white py-2.5 pl-4 pr-10 font-bold transition placeholder:font-normal focus:border-saudi-500 focus:outline-none" />
        </div>
        <select value={unitF} onChange={(e) => setUnitF(e.target.value as typeof unitF)} className="rounded-2xl border-2 border-sand-200 bg-white px-4 py-2.5 font-bold text-slate-600 focus:border-saudi-500 focus:outline-none">
          <option value="all">كل الوحدات</option>
          <option value="history">{UNIT_META.history.short}</option>
          <option value="first">{UNIT_META.first.short}</option>
          <option value="second">{UNIT_META.second.short}</option>
        </select>
        <select value={typeF} onChange={(e) => setTypeF(e.target.value as typeof typeF)} className="rounded-2xl border-2 border-sand-200 bg-white px-4 py-2.5 font-bold text-slate-600 focus:border-saudi-500 focus:outline-none">
          <option value="all">كل الأنواع</option>
          <option value="mcq">اختيار من متعدد</option>
          <option value="tf">صح أو خطأ</option>
        </select>
      </div>

      {/* القائمة */}
      <div className="mt-4 grid gap-2.5">
        {filtered.map((q, idx) => {
          const Icon = UNIT_ICON[q.unit];
          return (
            <div key={q.id} className="anim-screen flex items-center gap-3 rounded-2xl border border-saudi-100 bg-white p-4 shadow-sm transition hover:shadow-md" style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand-100 font-head text-sm font-black text-saudi-800">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-head text-sm font-extrabold text-saudi-950 sm:text-base">{q.question}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5"><Icon className="size-3" />{UNIT_META[q.unit].short}</span>
                  <span className="rounded-full bg-cloud-100 px-2 py-0.5 text-cloud-400">{TYPE_LABEL[q.type]}</span>
                  <span className="truncate rounded-full bg-saudi-50 px-2 py-0.5 text-saudi-700 ring-1 ring-saudi-100">
                    <Check className="ml-0.5 inline size-3" />{correctPreview(q)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => openEdit(q)} aria-label="تعديل السؤال" className="grid size-9 place-items-center rounded-xl bg-cloud-50 text-cloud-400 ring-1 ring-cloud-100 transition hover:bg-cloud-100">
                  <Pencil className="size-4" />
                </button>
                <button onClick={() => setDelId(q.id)} aria-label="حذف السؤال" className="grid size-9 place-items-center rounded-xl bg-red-50 text-red-500 ring-1 ring-red-100 transition hover:bg-red-100">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-sand-200 bg-sand-50 p-10 text-center font-head font-bold text-slate-400">لا توجد أسئلة مطابقة للبحث</p>
        )}
      </div>

      {/* ── محرر السؤال ── */}
      {editor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-sand-200 p-5">
              <h3 className="font-head text-xl font-black text-saudi-900">{editor.id ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
              <button onClick={() => setEditor(null)} aria-label="إغلاق" className="grid size-10 place-items-center rounded-xl bg-sand-100 text-slate-500 transition hover:bg-sand-200">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* الوحدة والنوع */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-saudi-800">الوحدة</span>
                  <select value={editor.unit} onChange={(e) => setEditor({ ...editor, unit: e.target.value as UnitKey })} className="w-full rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-2.5 font-bold focus:border-saudi-500 focus:outline-none">
                    <option value="history">{UNIT_META.history.name}</option>
                    <option value="first">{UNIT_META.first.name}</option>
                    <option value="second">{UNIT_META.second.name}</option>
                  </select>
                </label>
                <div>
                  <span className="mb-1.5 block text-sm font-bold text-saudi-800">نوع السؤال</span>
                  <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-sand-100 p-1.5">
                    {(['mcq', 'tf'] as const).map((t) => (
                      <button key={t} onClick={() => setEditor({ ...editor, type: t })} className={`rounded-xl px-3 py-2 text-sm font-extrabold transition ${editor.type === t ? 'bg-white text-saudi-700 shadow-sm ring-1 ring-saudi-200' : 'text-slate-500 hover:text-saudi-700'}`}>
                        {TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* نص السؤال */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-saudi-800">نص السؤال</span>
                <textarea value={editor.question} onChange={(e) => setEditor({ ...editor, question: e.target.value })} rows={2} placeholder="اكتب السؤال هنا…" className="w-full resize-none rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-3 font-bold leading-relaxed transition placeholder:font-normal focus:border-saudi-500 focus:bg-white focus:outline-none" />
              </label>

              {/* الخيارات أو صح/خطأ */}
              {editor.type === 'mcq' ? (
                <div>
                  <span className="mb-1.5 block text-sm font-bold text-saudi-800">الخيارات الأربعة — اختر الإجابة الصحيحة بالضغط على حرفها</span>
                  <div className="grid gap-2">
                    {editor.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditor({ ...editor, correctIndex: i })}
                          aria-label={`الإجابة الصحيحة: ${LETTERS[i]}`}
                          className={`grid size-11 shrink-0 place-items-center rounded-xl font-head text-lg font-black transition ${editor.correctIndex === i ? 'bg-saudi-600 text-white shadow-md shadow-saudi-600/25' : 'bg-white text-slate-400 ring-1 ring-sand-200 hover:ring-saudi-300'}`}
                        >
                          {editor.correctIndex === i ? <Check className="size-5" /> : LETTERS[i]}
                        </button>
                        <input
                          value={opt}
                          onChange={(e) => setEditor({ ...editor, options: editor.options.map((o, j) => (j === i ? e.target.value : o)) })}
                          placeholder={`الخيار ${LETTERS[i]}`}
                          className={`w-full rounded-2xl border-2 px-4 py-2.5 font-bold transition placeholder:font-normal focus:bg-white focus:outline-none ${editor.correctIndex === i ? 'border-saudi-400 bg-saudi-50 focus:border-saudi-500' : 'border-sand-200 bg-sand-50 focus:border-saudi-500'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="mb-1.5 block text-sm font-bold text-saudi-800">الإجابة الصحيحة</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[{ v: true, l: 'صح' }, { v: false, l: 'خطأ' }].map((o) => (
                      <button key={String(o.v)} type="button" onClick={() => setEditor({ ...editor, correctBool: o.v })} className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3.5 font-head text-lg font-black transition ${editor.correctBool === o.v ? 'border-saudi-600 bg-saudi-600 text-white shadow-md shadow-saudi-600/25' : 'border-sand-200 bg-sand-50 text-slate-500 hover:border-saudi-300'}`}>
                        {editor.correctBool === o.v && <Check className="size-5" />}
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* التفسير */}
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-saudi-800"><Lightbulb className="size-4 text-gold-500" /> التفسير المختصر</span>
                <textarea value={editor.explanation} onChange={(e) => setEditor({ ...editor, explanation: e.target.value })} rows={2} placeholder="مثال: القرن الواحد يساوي مئة سنة." className="w-full resize-none rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-3 font-bold leading-relaxed transition placeholder:font-normal focus:border-saudi-500 focus:bg-white focus:outline-none" />
              </label>

              <p className="rounded-2xl bg-cloud-50 p-3 text-center text-xs font-bold text-cloud-400 ring-1 ring-cloud-100">
                الدرجة ثابتة: درجتان لكل سؤال — لا تظهر الإجابة الصحيحة للطالب إلا بعد التسليم
              </p>

              {err && <p className="anim-shake rounded-2xl bg-red-50 p-3 text-center text-sm font-bold text-red-600 ring-1 ring-red-100">{err}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2.5 border-t border-sand-200 p-5">
              <button onClick={saveEditor} disabled={saving} className="flex items-center justify-center gap-2 rounded-2xl bg-saudi-600 px-4 py-3 font-head font-extrabold text-white shadow-md shadow-saudi-600/25 transition hover:bg-saudi-700 disabled:opacity-60">
                {saving && <Loader2 className="size-4 animate-spin" />} حفظ السؤال
              </button>
              <button onClick={() => setEditor(null)} disabled={saving} className="rounded-2xl border-2 border-sand-200 px-4 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── تأكيد الحذف ── */}
      {delId !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100"><Trash2 className="size-7" /></span>
            <h3 className="mt-4 font-head text-xl font-black text-saudi-900">حذف هذا السؤال؟</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">سيُحذف من البنك ولن يظهر في المحاولات الجديدة، وستبقى نتائج المحاولات السابقة كما هي.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button onClick={doDelete} disabled={saving} className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 font-head font-extrabold text-white transition hover:bg-red-600 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />} حذف
              </button>
              <button onClick={() => setDelId(null)} className="rounded-2xl border-2 border-sand-200 px-4 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── تأكيد الاستعادة ── */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-saudi-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="anim-pop w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold-100 text-gold-600"><RotateCcw className="size-7" /></span>
            <h3 className="mt-4 font-head text-xl font-black text-saudi-900">استعادة البنك الافتراضي؟</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">ستفقد جميع تعديلاتك وتعود الأسئلة الثلاثون المعتمدة كما هي.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button onClick={doReset} disabled={saving} className="flex items-center justify-center gap-2 rounded-2xl bg-saudi-600 px-4 py-3 font-head font-extrabold text-white transition hover:bg-saudi-700 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />} استعادة
              </button>
              <button onClick={() => setResetOpen(false)} className="rounded-2xl border-2 border-sand-200 px-4 py-3 font-head font-extrabold text-slate-600 transition hover:border-saudi-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
