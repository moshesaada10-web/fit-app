import { addDays, diffDays, weekStart } from './dates';
import type { BodyEntry } from '../types';

export interface WeekPoint { weekStart: string; date: string; kg: number }

/** נקודה אחת לשבוע (השקילה האחרונה בשבוע, שבוע מתחיל ביום ראשון). נקודת המוצא נכנסת אם אין שקילה באותו שבוע. */
export function weeklySeries(entries: BodyEntry[], baseline?: { date: string; kg: number }): WeekPoint[] {
  const map = new Map<string, WeekPoint>();
  const all = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (baseline) {
    map.set(weekStart(baseline.date), { weekStart: weekStart(baseline.date), date: baseline.date, kg: baseline.kg });
  }
  for (const e of all) {
    const ws = weekStart(e.date);
    map.set(ws, { weekStart: ws, date: e.date, kg: e.kg });
  }
  return [...map.values()].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

/** ממוצע נע (עוקב) של n נקודות אחרונות */
export function movingAverage(values: number[], n = 4): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - n + 1), i + 1);
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 100) / 100;
  });
}

/** קצב ירידה בק״ג לשבוע (חיובי = יורד), על פני עד 4 השבועות האחרונים. null אם אין מספיק נתונים. */
export function weeklyRate(series: WeekPoint[]): number | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const ref = series.find((p) => diffDays(last.date, p.date) <= 28 && diffDays(last.date, p.date) >= 6);
  if (!ref) return null;
  const weeks = diffDays(last.date, ref.date) / 7;
  return Math.round(((ref.kg - last.kg) / weeks) * 100) / 100;
}

export type TrendStatus = 'few' | 'too-fast' | 'on-pace' | 'slow' | 'flat' | 'up';

/** 2 שבועות ללא שינוי: שינוי של פחות מ־0.3 ק״ג על פני 14 ימים לפחות */
export function isPlateau(series: WeekPoint[]): boolean {
  if (series.length < 3) return false;
  const last = series[series.length - 1];
  const ref = [...series].reverse().find((p) => diffDays(last.date, p.date) >= 13);
  if (!ref) return false;
  return Math.abs(ref.kg - last.kg) < 0.3;
}

export function trendStatus(series: WeekPoint[]): { status: TrendStatus; rate: number | null } {
  const rate = weeklyRate(series);
  if (rate === null) return { status: 'few', rate };
  if (isPlateau(series)) return { status: 'flat', rate };
  if (rate > 0.7) return { status: 'too-fast', rate };
  if (rate >= 0.3) return { status: 'on-pace', rate };
  if (rate >= 0.1) return { status: 'slow', rate };
  if (rate <= -0.3) return { status: 'up', rate };
  return { status: 'flat', rate };
}

export const GOAL_BAND_KG = 2;

export function goalReached(series: WeekPoint[], goalKg: number): boolean {
  if (series.length < 2) return false;
  const a = series[series.length - 1];
  const b = series[series.length - 2];
  return a.kg <= goalKg && b.kg <= goalKg;
}

export function expectedGoalDate(current: number, goal: number, rate: number | null, from: string): string | null {
  if (rate === null || rate <= 0.05 || current <= goal) return null;
  return addDays(from, Math.round(((current - goal) / rate) * 7));
}
