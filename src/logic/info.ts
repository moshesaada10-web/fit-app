import { CARDIO_TYPES, WEEKS, type Phase } from '../data/plan';
import type { Position } from './rotation';
import type { Session } from '../types';
import { sortSessions } from './rotation';

export const PHASE_HE: Record<Phase, string> = { intro: 'היכרות', build: 'בנייה', deload: 'שבוע קל' };

export function phaseText(pos: Position): string {
  const base = `שבוע ${pos.week} מתוך 12 · ${PHASE_HE[pos.phase]}`;
  return pos.cycle > 0 ? `מחזור ${pos.cycle + 1} · ${base}` : base;
}
export function weekNote(pos: Position): string {
  if (pos.early) return 'שבוע קל שהקדמת: כ־40% פחות סטים וכ־10% פחות משקל, 3 אימונים.';
  if (pos.deload) return 'שבוע קל: כ־40% פחות סטים וכ־10% פחות משקל. הטכניקה בשליטה, עם עוד 4 חזרות טובות בכל סט.';
  return WEEKS[pos.week - 1].note + '.';
}
export function cardioName(id: string): string {
  return CARDIO_TYPES.find((c) => c.id === id)?.he ?? id;
}

/** מי הושלם בשבוע-המקביל הנוכחי (n % 3 האחרונים) */
export function weekDone(sessions: Session[]): Session[] {
  const sorted = sortSessions(sessions);
  const k = sorted.length % 3;
  return k === 0 ? [] : sorted.slice(-k);
}

export function setsSummary(e: { sets: { w: number | null; r: number | null; done: boolean }[] }, unitLabel = ''): string {
  const d = e.sets.filter((s) => s.done && s.r);
  if (!d.length) return '—';
  return d.map((s) => (s.w ? `${s.w}×${s.r}` : `${s.r}${unitLabel}`)).join(' · ');
}
