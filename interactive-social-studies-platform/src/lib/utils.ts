import { useEffect, useRef, useState } from 'react';
import type { Level } from '../types';

/** خلط فيشر–ياتس */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** مستوى الأداء حسب النسبة */
export function getLevel(pct: number): Level {
  if (pct >= 90) return { key: 'excellent', label: 'ممتاز', message: 'بطل الدراسات الاجتماعية!' };
  if (pct >= 75) return { key: 'great', label: 'رائع', message: 'أداء متميز!' };
  if (pct >= 60) return { key: 'good', label: 'جيد', message: 'استمر في التقدم!' };
  return { key: 'start', label: 'بداية جيدة', message: 'راجع دروسك وحاول مجددًا!' };
}

/** تنسيق التاريخ بالهجري والميلادي */
export function formatHijri(dateISO: string): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(dateISO));
  } catch {
    return new Date(dateISO).toLocaleDateString('ar-SA');
  }
}

export function formatGregorian(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(dateISO: string): string {
  return new Date(dateISO).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

/** عدّاد تصاعدي متحرك للأرقام */
export function useCountUp(target: number, duration = 1400, decimals = 0): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(parseFloat((target * eased).toFixed(decimals)));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, decimals]);
  return value;
}

/** تأخير ظهور عنصر (للحركات) */
export function useMounted(delay = 60): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return mounted;
}
