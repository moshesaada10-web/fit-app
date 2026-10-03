import { ORDER, WEEKS, type Phase, type Slot, type WorkoutId } from '../data/plan';
import type { Session } from '../types';

/** סדר כרונולוגי: לפי תאריך ואז לפי זמן יצירה */
export function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
}

/** האימון הבא הוא תמיד הבא בסדר A→B→C אחרי האחרון שהושלם. בלי תלות בתאריכים. */
export function nextWorkout(sessions: Session[]): WorkoutId {
  const sorted = sortSessions(sessions);
  if (sorted.length === 0) return 'A';
  const last = sorted[sorted.length - 1].type;
  return ORDER[(ORDER.indexOf(last) + 1) % ORDER.length];
}

export const SESSIONS_PER_WEEK = 3;
export const DELOAD_FIRST_AT = 15; // אחרי 15 אימונים מתחיל שבוע 6
export const CYCLE_SESSIONS = 36; // 12 שבועות

export interface Position {
  count: number;
  cycle: number; // 0-based
  week: number; // 1..12 בתוך מחזור
  phase: Phase;
  /** כמה אימונים הושלמו בשבוע-המקביל הנוכחי (0..2) */
  inWeek: number;
  deload: boolean;
  early: boolean;
  /** כמה אימוני כוח עד תחילת שבוע הקל הבא (0 אם כבר בשבוע קל) */
  untilDeload: number;
  intro: boolean;
}

export function programPosition(count: number, earlyDeloadFrom: number | null = null): Position {
  const weekIdx = Math.floor(count / SESSIONS_PER_WEEK);
  const cycle = Math.floor(weekIdx / 12);
  const week = (weekIdx % 12) + 1;
  let phase = WEEKS[week - 1].phase;
  const early = earlyDeloadFrom !== null && count >= earlyDeloadFrom && count - earlyDeloadFrom < SESSIONS_PER_WEEK;
  if (early) phase = 'deload';
  const c = count % CYCLE_SESSIONS;
  let untilDeload = 0;
  if (c < 15) untilDeload = 15 - c;
  else if (c >= 18 && c < 33) untilDeload = 33 - c;
  if (early) untilDeload = 0;
  return {
    count, cycle, week, phase,
    inWeek: count % SESSIONS_PER_WEEK,
    deload: phase === 'deload', early, untilDeload,
    intro: cycle === 0 && week <= 2,
  };
}

export function positionFor(sessions: Session[], earlyDeloadFrom: number | null = null): Position {
  return programPosition(sessions.length, earlyDeloadFrom);
}

export interface SetsPlan { sets: number; optionalLast: boolean }

/** כמה סטים לתרגיל בשבוע הנוכחי: 2 בהיכרות, הדרגתי משבוע 3, ו־־40% בשבוע קל */
export function targetSets(slot: Slot, pos: Position): SetsPlan {
  const full = slot.sets;
  if (pos.deload) {
    return { sets: Math.min(full, Math.max(2, Math.round(full * 0.6))), optionalLast: false };
  }
  if (pos.cycle === 0) {
    if (pos.week <= 2) return { sets: Math.min(full, 2), optionalLast: false };
    if (pos.week === 3) return { sets: Math.min(full, 3), optionalLast: full >= 3 };
    if (pos.week === 4) return { sets: Math.min(full, 3), optionalLast: false };
  }
  return { sets: full, optionalLast: false };
}

export const DELOAD_WEIGHT_FACTOR = 0.9;

export function cardioTarget(pos: Position): { min: number; max: number; easy: boolean } {
  const w = WEEKS[pos.week - 1];
  const easy = pos.deload;
  if (pos.early) return { min: 25, max: 30, easy: true };
  return { min: w.cardioMin, max: w.cardioMax, easy };
}

/** אינטרוולים עדינים מותרים רק אחרי שבוע 8 (ולא בשבוע קל) */
export function intervalsAllowed(pos: Position): boolean {
  return (pos.cycle > 0 || pos.week >= 9) && !pos.deload;
}
