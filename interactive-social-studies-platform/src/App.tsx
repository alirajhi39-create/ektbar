import { useCallback, useEffect, useState } from 'react';
import type { AnswerValue, AttemptResult, Question, QuizSession, Settings, ShuffledQuestion } from './types';
import { shuffle, uid } from './lib/utils';
import { db, getQuestionMap, getQuestions } from './lib/db';
import { auth } from './lib/auth';
import { apiToken, checkApi, getConnection, probeApi, remote } from './lib/api';
import Home from './components/Home';
import Quiz from './components/Quiz';
import Results from './components/Results';
import Review from './components/Review';
import Certificate from './components/Certificate';
import TeacherLogin from './components/TeacherLogin';
import TeacherDashboard from './components/TeacherDashboard';

type View =
  | { name: 'home' }
  | { name: 'quiz'; session: QuizSession }
  | { name: 'result'; result: AttemptResult }
  | { name: 'review'; result: AttemptResult }
  | { name: 'certificate'; result: AttemptResult }
  | { name: 'teacher-login' }
  | { name: 'teacher' };

/** الحد الأدنى من بيانات السؤال اللازمة لبناء الجلسة (بدون إجابات) */
type QuizSource = Pick<Question, 'id' | 'unit' | 'type' | 'question' | 'marks'> & { options?: string[] };

/** إنشاء جلسة اختبار: خلط عشوائي للأسئلة والخيارات */
function buildSession(source: QuizSource[], studentName: string, className: string): QuizSession {
  const questions: ShuffledQuestion[] = shuffle(
    source.map((q) => ({
      id: q.id,
      unit: q.unit,
      type: q.type,
      question: q.question,
      marks: q.marks,
      ...(q.options ? { options: shuffle(q.options.map((text, orig) => ({ text, orig }))) } : {}),
    })),
  );
  return { studentName, className, questions, answers: {}, index: 0, startedAt: Date.now() };
}

/** تطبيع الإجابات إلى مؤشرات البنك الأصلية — دون كشف الإجابات الصحيحة */
function normalizeAnswers(session: QuizSession, answers: Record<number, AnswerValue>) {
  return session.questions.map((sq) => {
    const ans = answers[sq.id];
    if (ans === undefined) return { id: sq.id, a: null as number | boolean | null };
    if (sq.type === 'mcq' && typeof ans === 'number') return { id: sq.id, a: sq.options?.[ans]?.orig ?? null };
    if (sq.type === 'tf' && typeof ans === 'boolean') return { id: sq.id, a: ans };
    return { id: sq.id, a: null };
  });
}

/** التصحيح المحلي الاحتياطي — يُستخدم فقط عند غياب الخادم */
function gradeLocally(session: QuizSession, answers: Record<number, AnswerValue>): AttemptResult {
  let score = 0, correct = 0, wrong = 0, unanswered = 0;
  const bank = getQuestionMap();
  const total = session.questions.reduce((s, q) => s + q.marks, 0);
  const details = normalizeAnswers(session, answers).map(({ id, a }) => {
    const orig = bank.get(id);
    if (!orig || a === null) { unanswered++; return { id, a, ok: false }; }
    const ok = orig.type === 'mcq' ? a === orig.correctIndex : a === orig.correctBool;
    if (ok) { score += orig.marks; correct++; } else { wrong++; }
    return { id, a, ok };
  });
  return {
    id: uid(), studentName: session.studentName, className: session.className,
    score, total, correct, wrong, unanswered,
    percentage: total > 0 ? (score / total) * 100 : 0,
    dateISO: new Date().toISOString(),
    durationSec: Math.round((Date.now() - session.startedAt) / 1000),
    details,
  };
}

/** جلسة المعلم: الخادم أولًا ثم المحلي */
function teacherLoggedIn(): boolean {
  return apiToken.get() !== '' || auth.isLoggedIn();
}

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const [settings, setSettings] = useState<Settings>(() => db.getSettings());
  const [homeBank, setHomeBank] = useState<QuizSource[]>(() => getQuestions());
  const [cloudOn, setCloudOn] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view.name]);

  /* اكتشاف الخادم ومزامنة الإعدادات والبنك */
  useEffect(() => {
    let alive = true;
    let wakeTimer: ReturnType<typeof setTimeout> | undefined;

    const syncRemote = async () => {
      try {
        const s = await remote.getSettings();
        if (alive) { setSettings(s); db.saveSettings(s); }
      } catch { /* تجاهل */ }
      try {
        const { questions } = await remote.getQuizQuestions();
        if (alive) setHomeBank(questions);
      } catch { /* تجاهل */ }
    };

    (async () => {
      if (await checkApi()) {
        if (alive) setCloudOn(true);
        await syncRemote();
        return;
      }
      /* إن فشل الفحص الأول (الدالة نائمة) أعد المحاولة تلقائيًا بعد ثوانٍ */
      wakeTimer = setTimeout(async () => {
        if (!alive || getConnection() === 'on') return;
        if (await probeApi()) {
          if (alive) setCloudOn(true);
          await syncRemote();
        }
      }, 5000);
    })();

    return () => {
      alive = false;
      if (wakeTimer) clearTimeout(wakeTimer);
    };
  }, []);

  /* مزامنة دورية: تفعيل/إيقاف الاختبار يصل لكل الأجهزة تلقائيًا */
  useEffect(() => {
    if (!cloudOn) return;
    const t = setInterval(() => {
      remote.getSettings()
        .then((s) => { setSettings(s); db.saveSettings(s); })
        .catch(() => {});
    }, 20_000);
    return () => clearInterval(t);
  }, [cloudOn]);

  const startQuiz = useCallback(async (name: string, cls: string) => {
    try {
      if (getConnection() === 'on') {
        const { questions } = await remote.getQuizQuestions();
        setView({ name: 'quiz', session: buildSession(questions, name, cls) });
        return;
      }
    } catch { /* الرجوع للوضع المحلي */ }
    setView({ name: 'quiz', session: buildSession(getQuestions(), name, cls) });
  }, []);

  const submitQuiz = useCallback(async (qs: QuizSession, answers: Record<number, AnswerValue>) => {
    const payload = {
      id: uid(),
      studentName: qs.studentName,
      className: qs.className,
      durationSec: Math.round((Date.now() - qs.startedAt) / 1000),
      answers: normalizeAnswers(qs, answers),
    };
    try {
      if (getConnection() === 'on') {
        /* التصحيح الآمن جهة الخادم في Neon */
        const { result, bank } = await remote.submitResult(payload);
        setView({ name: 'result', result: { ...result, bank } });
        return;
      }
    } catch { /* الرجوع للوضع المحلي */ }
    const result = gradeLocally(qs, answers);
    db.addAttempt(result);
    setView({ name: 'result', result });
  }, []);

  const openTeacher = useCallback(() => {
    setView(teacherLoggedIn() ? { name: 'teacher' } : { name: 'teacher-login' });
  }, []);

  switch (view.name) {
    case 'quiz':
      return (
        <Quiz
          key={view.session.studentName + view.session.startedAt}
          session={view.session}
          onSubmit={(answers) => submitQuiz(view.session, answers)}
          onQuit={() => setView({ name: 'home' })}
        />
      );
    case 'result':
      return (
        <Results
          result={view.result}
          onReview={() => setView({ name: 'review', result: view.result })}
          onRetake={() => startQuiz(view.result.studentName, view.result.className)}
          onCertificate={() => {
            if (view.result.percentage >= 75) setView({ name: 'certificate', result: view.result });
          }}
          onHome={() => setView({ name: 'home' })}
        />
      );
    case 'review':
      return <Review result={view.result} onBack={() => setView({ name: 'result', result: view.result })} />;
    case 'certificate':
      return <Certificate result={view.result} onBack={() => setView({ name: 'result', result: view.result })} />;
    case 'teacher-login':
      return <TeacherLogin onSuccess={() => setView({ name: 'teacher' })} onBack={() => setView({ name: 'home' })} />;
    case 'teacher':
      return (
        <TeacherDashboard
          onLogout={() => {
            apiToken.clear();
            auth.logout();
            if (getConnection() === 'on') remote.logout().catch(() => {});
            setView({ name: 'home' });
          }}
          onHome={() => setView({ name: 'home' })}
          onSettingsChanged={setSettings}
        />
      );
    default:
      return <Home examActive={settings.examActive} bank={homeBank} onStart={startQuiz} onTeacher={openTeacher} />;
  }
}
