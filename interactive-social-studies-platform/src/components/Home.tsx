import { useState } from 'react';
import {
  Award, BookOpenCheck, Crown, Landmark, ListChecks, Loader2, Lock, Rocket,
  ScrollText, Sparkles, Star, Trophy, User, Users,
} from 'lucide-react';
import heroImg from '../assets/hero-diriyah.png';
import { getQuestions } from '../lib/db';
import type { UnitKey } from '../types';

interface HomeProps {
  examActive: boolean;
  /** ملخص البنك الحالي (يُجلب من الخادم عند توفره) */
  bank?: { unit: UnitKey; marks: number }[];
  onStart: (name: string, className: string) => Promise<void> | void;
  onTeacher: () => void;
}

const UNITS: { uk: UnitKey; icon: typeof ScrollText; title: string; subtitle: string; desc: string; accent: string; chip: string; ring: string; grad: string; bar: string }[] = [
  {
    uk: 'history',
    icon: ScrollText,
    title: 'الوحدة الأولى',
    subtitle: 'التاريخ',
    desc: 'مفهوم التاريخ وفوائده، والقرن والعقد والعهد والعصر، وعصور ما قبل التاريخ.',
    accent: 'text-cloud-400', chip: 'bg-cloud-100 text-cloud-400', ring: 'ring-cloud-200',
    grad: 'from-cloud-100 to-white', bar: 'bg-cloud-400',
  },
  {
    uk: 'first',
    icon: Landmark,
    title: 'الوحدة الثانية',
    subtitle: 'الدولة السعودية الأولى',
    desc: 'قيام الدولة السعودية الأولى، ومؤسسها الإمام محمد بن سعود، وعاصمتها الدرعية.',
    accent: 'text-saudi-600', chip: 'bg-saudi-100 text-saudi-700', ring: 'ring-saudi-200',
    grad: 'from-saudi-50 to-white', bar: 'bg-saudi-500',
  },
  {
    uk: 'second',
    icon: Crown,
    title: 'الوحدة الثالثة',
    subtitle: 'الدولة السعودية الثانية',
    desc: 'قيام الدولة السعودية الثانية، ومؤسسها الإمام تركي بن عبدالله، وعاصمتها الرياض.',
    accent: 'text-gold-500', chip: 'bg-gold-100 text-gold-700', ring: 'ring-gold-200',
    grad: 'from-gold-50 to-white', bar: 'bg-gold-400',
  },
];

export default function Home({ examActive, bank, onStart, onTeacher }: HomeProps) {
  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const source = bank ?? getQuestions();
  const qCount = source.length;
  const totalMarks = source.reduce((s, q) => s + q.marks, 0);
  const perUnit = (uk: UnitKey) => source.filter((q) => q.unit === uk).length;

  const STEPS = [
    { icon: User, title: 'اكتب اسمك', desc: 'سجّل اسمك وشعبتك' },
    { icon: ListChecks, title: 'أجب عن الأسئلة', desc: `${qCount} سؤالًا ممتعًا` },
    { icon: Award, title: 'استلم شهادتك', desc: 'نتيجتك وشهادة إنجاز' },
  ];

  const submit = async () => {
    if (busy) return;
    if (name.trim().length < 2) {
      setError(true);
      setTimeout(() => setError(false), 600);
      return;
    }
    setBusy(true);
    try {
      await onStart(name.trim(), cls.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pattern-bg min-h-screen">
      {/* ── الشريط العلوي ── */}
      <header className="sticky top-0 z-40 border-b border-saudi-100/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-saudi-600 text-white shadow-lg shadow-saudi-600/25">
              <BookOpenCheck className="size-6" />
            </span>
            <div>
              <p className="font-head text-lg font-extrabold leading-tight text-saudi-800">تحدي الدراسات الاجتماعية</p>
              <p className="text-xs font-medium text-saudi-600/80">مدرسة العروس الابتدائية</p>
            </div>
          </div>
          <button
            onClick={onTeacher}
            className="flex items-center gap-2 rounded-full border border-saudi-200 bg-white px-4 py-2 text-sm font-bold text-saudi-700 transition hover:-translate-y-0.5 hover:border-saudi-400 hover:shadow-md"
          >
            <Lock className="size-4" />
            دخول المعلم
          </button>
        </div>
      </header>

      {/* ── البطل ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-32 top-10 size-96 rounded-full bg-cloud-100 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-gold-100 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-2 lg:pt-16">
          {/* النص والنموذج */}
          <div className="anim-screen">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300 bg-gold-50 px-4 py-1.5 text-sm font-bold text-gold-700">
              <Sparkles className="size-4" />
              منصة تعليمية وطنية — الصف السادس الابتدائي
            </span>
            <h1 className="text-balance mt-5 font-head text-4xl font-black leading-[1.25] text-saudi-900 sm:text-5xl lg:text-[3.4rem]">
              اختبر معلوماتك
              <span className="relative mx-2 inline-block text-saudi-600">
                وانطلق
                <svg className="absolute -bottom-1 right-0 w-full" viewBox="0 0 120 10" fill="none" aria-hidden>
                  <path d="M2 7C30 1 70 1 118 6" stroke="#C9A227" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
              نحو التفوق!
            </h1>
            <p className="mt-4 max-w-lg text-lg font-medium leading-relaxed text-slate-600">
              اختبار تفاعلي شامل في الدراسات الاجتماعية للصف السادس الابتدائي — جاهز تتحدى معلوماتك وتحقق الدرجة الكاملة؟
            </p>

            {/* بطاقة التسجيل */}
            <div className="mt-7 rounded-3xl border border-saudi-100 bg-white p-5 shadow-xl shadow-saudi-900/5 sm:p-6">
              {examActive ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-saudi-800">
                        <User className="size-4" /> اسم الطالب <span className="text-red-500">*</span>
                      </span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder="اكتب اسمك الثلاثي"
                        className={`w-full rounded-2xl border-2 bg-sand-50 px-4 py-3 font-bold text-saudi-900 transition placeholder:font-normal placeholder:text-slate-400 focus:border-saudi-500 focus:bg-white focus:outline-none ${error ? 'anim-shake border-red-400' : 'border-sand-200'}`}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-saudi-800">
                        <Users className="size-4" /> الشعبة / الفصل <span className="text-xs font-medium text-slate-400">(اختياري)</span>
                      </span>
                      <select
                        value={cls}
                        onChange={(e) => setCls(e.target.value)}
                        className="w-full appearance-none rounded-2xl border-2 border-sand-200 bg-sand-50 px-4 py-3 font-bold text-saudi-900 transition focus:border-saudi-500 focus:bg-white focus:outline-none"
                      >
                        <option value="">اختر الشعبة (اختياري)</option>
                        <option value="الشعبة ب">الشعبة ب</option>
                      </select>
                    </label>
                  </div>
                  {error && <p className="mt-2 text-sm font-bold text-red-500">من فضلك اكتب اسمك أولًا لتبدأ التحدي</p>}
                  <button
                    onClick={submit}
                    disabled={busy}
                    className="anim-pulse-ring group mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-saudi-700 to-saudi-500 px-6 py-4 font-head text-xl font-extrabold text-white shadow-lg shadow-saudi-600/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-saudi-600/40 active:translate-y-0 disabled:opacity-70"
                  >
                    {busy ? (
                      <><Loader2 className="size-6 animate-spin" /> جارٍ تحضير الأسئلة…</>
                    ) : (
                      <><Rocket className="size-6 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /> ابدأ التحدي</>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-gold-300 bg-gold-50 p-5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold-200 text-gold-700">
                    <Lock className="size-6" />
                  </span>
                  <div>
                    <p className="font-head text-lg font-extrabold text-gold-800">الاختبار متوقف مؤقتًا</p>
                    <p className="text-sm font-medium text-gold-700">بانتظار تفعيله من قِبل المعلم، عُد لاحقًا يا بطل!</p>
                  </div>
                </div>
              )}
            </div>

            {/* معلومات الاختبار */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { icon: ListChecks, num: String(qCount), label: 'سؤالًا متنوعًا', tint: 'bg-cloud-100 text-cloud-400' },
                { icon: Star, num: '2', label: 'درجة لكل سؤال', tint: 'bg-gold-100 text-gold-600' },
                { icon: Trophy, num: String(totalMarks), label: 'الدرجة الكلية', tint: 'bg-saudi-100 text-saudi-600' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${s.tint}`}>
                    <s.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-head text-xl font-black leading-none text-saudi-900">{s.num}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* الصورة */}
          <div className="anim-screen d-2 relative mx-auto w-full max-w-lg">
            <div className="arch-top absolute -inset-3 border-[3px] border-gold-300/70" aria-hidden />
            <div className="arch-top relative overflow-hidden bg-cloud-100 shadow-2xl shadow-saudi-900/15">
              <img src={heroImg} alt="رسم توضيحي لعمارة الدرعية النجدية" className="h-auto w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-saudi-900/25 to-transparent" />
            </div>
            <div className="anim-float absolute -right-4 top-10 rounded-2xl border border-sand-200 bg-white px-4 py-2.5 shadow-lg">
              <p className="flex items-center gap-2 text-sm font-extrabold text-saudi-700">
                <Landmark className="size-4 text-gold-500" /> الدرعية — عاصمة أولى
              </p>
            </div>
            <div className="anim-float d-3 absolute -left-4 top-1/3 rounded-2xl border border-sand-200 bg-white px-4 py-2.5 shadow-lg">
              <p className="flex items-center gap-2 text-sm font-extrabold text-saudi-700">
                <Trophy className="size-4 text-saudi-600" /> شهادة إنجاز فورية
              </p>
            </div>
            <div className="anim-float d-5 absolute -bottom-4 right-10 rounded-2xl border border-sand-200 bg-white px-4 py-2.5 shadow-lg">
              <p className="flex items-center gap-2 text-sm font-extrabold text-saudi-700">
                <Star className="size-4 text-gold-500" /> نحو الدرجة الكاملة
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── الوحدات ── */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="anim-screen text-center">
          <h2 className="font-head text-3xl font-black text-saudi-900">وحدات الاختبار الثلاث</h2>
          <p className="mt-2 font-medium text-slate-500">عشرة أسئلة من كل وحدة: خمسة اختيار من متعدد وخمسة صح أو خطأ</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {UNITS.map((u, i) => (
            <article
              key={u.subtitle}
              className={`anim-screen group relative overflow-hidden rounded-3xl border border-sand-200 bg-gradient-to-b ${u.grad} p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-saudi-900/10`}
            style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div className={`absolute -left-8 -top-8 size-28 rounded-full ${u.chip} opacity-40 blur-2xl transition group-hover:opacity-70`} />
              <span className={`relative grid size-14 place-items-center rounded-2xl ${u.chip} shadow-sm arch-top !rounded-b-2xl`}>
                <u.icon className="size-7" />
              </span>
              <p className="mt-4 text-xs font-extrabold tracking-wide text-slate-400">{u.title}</p>
              <h3 className={`mt-1 font-head text-2xl font-extrabold ${u.accent}`}>{u.subtitle}</h3>
              <p className="mt-2 min-h-12 text-sm font-medium leading-relaxed text-slate-600">{u.desc}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${u.chip}`}>{perUnit(u.uk)} أسئلة · {perUnit(u.uk) * 2} درجة</span>
                <span className={`h-1.5 w-16 rounded-full ${u.bar} opacity-70`} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── خطوات ── */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="anim-screen overflow-hidden rounded-[2rem] bg-saudi-800 p-8 text-white shadow-xl shadow-saudi-900/20 sm:p-10">
          <div className="relative grid gap-8 sm:grid-cols-3">
            <div className="pointer-events-none absolute inset-0 pattern-gold opacity-60" aria-hidden />
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 font-head text-xl font-black text-gold-300 ring-1 ring-white/20">
                  {i + 1}
                </span>
                <div>
                  <p className="flex items-center gap-2 font-head text-lg font-extrabold">
                    <s.icon className="size-5 text-gold-300" /> {s.title}
                  </p>
                  <p className="mt-1 text-sm font-medium text-saudi-100">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── التذييل ── */}
      <footer className="border-t border-saudi-100 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row">
          <p className="flex items-center gap-2 text-sm font-bold text-saudi-800">
            <BookOpenCheck className="size-4 text-saudi-600" />
            تحدي الدراسات الاجتماعية — مدرسة العروس الابتدائية
          </p>
          <p className="text-xs font-medium text-slate-400">اختبار شامل للوحدات الثلاث · {qCount} سؤالًا · {totalMarks} درجة</p>
        </div>
      </footer>
    </div>
  );
}
