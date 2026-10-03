import type { Pain, Session } from '../types';
import { sortSessions } from './rotation';

export const PAIN_THRESHOLD = 4;

export function maxPain(p?: Pain): number | null {
  return p ? Math.max(p.back, p.shin, p.knee) : null;
}

/** כאב 4 ומעלה, או החמרה בבוקר שאחרי */
export function isTriggered(s: Pick<Session, 'pain' | 'nextMorning'>): boolean {
  const m = maxPain(s.pain);
  return (m !== null && m >= PAIN_THRESHOLD) || s.nextMorning === 'worse';
}

export type PainLevel = 'none' | 'reduce' | 'pause';
export interface PainStatus { level: PainLevel; consecutive: number }

/** כמה אימונים אחרונים ברציפות עוררו כאב (כללי, לפי כל האימונים עם פירוט כאב) */
export function generalPain(sessions: Session[]): PainStatus {
  const sorted = sortSessions(sessions).filter((s) => s.pain || s.nextMorning);
  let n = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (isTriggered(sorted[i])) n++;
    else break;
  }
  return { consecutive: n, level: n >= 2 ? 'pause' : n === 1 ? 'reduce' : 'none' };
}

/**
 * מצב כאב לתרגיל מסוים. הדרגה 'pause' רק אם התרגיל סומן במפורש כמעורר כאב ב־2 אימונים ברציפות
 * (באימונים שבהם הוא בוצע). 'reduce' אם האימון האחרון שהכיל אותו עורר כאב
 * (והתרגיל סומן, או שלא סומן אף תרגיל).
 */
export function exercisePain(sessions: Session[], slotId: string, clearedAfter?: string): PainStatus {
  const rel = sortSessions(sessions).filter(
    (s) => (!clearedAfter || s.date > clearedAfter) && s.exercises.some((e) => e.slotId === slotId && !e.skipped),
  );
  let reduce = 0;
  let explicit = 0;
  let stillExplicit = true;
  for (let i = rel.length - 1; i >= 0; i--) {
    const s = rel[i];
    if (!isTriggered(s)) break;
    const named = s.painTriggers?.includes(slotId) ?? false;
    const none = !s.painTriggers || s.painTriggers.length === 0;
    if (!named && !none) break;
    reduce++;
    if (stillExplicit && named) explicit++;
    else stillExplicit = false;
  }
  if (explicit >= 2) return { level: 'pause', consecutive: explicit };
  if (reduce >= 1) return { level: 'reduce', consecutive: reduce };
  return { level: 'none', consecutive: 0 };
}

export function adviceAfterWorkout(p: Pain, trig: boolean, consecutive: number): { level: 'ok' | 'reduce' | 'pause'; text: string } {
  const m = Math.max(p.back, p.shin, p.knee);
  if (consecutive >= 2) {
    return { level: 'pause', text: 'כאב ב־2 אימונים ברציפות. משהים את התרגיל שמעורר אותו ופונים לפיזיותרפיסט.' };
  }
  if (trig || m >= PAIN_THRESHOLD) {
    return { level: 'reduce', text: 'כאב 4 ומעלה. באימון הבא: סט אחד פחות בתרגיל המעורר וגם משקל קל יותר. מחר בבוקר לבדוק אם זה זהה, טוב או גרוע מהרגיל.' };
  }
  return { level: 'ok', text: 'אין צורך בשינוי. למחרת בבוקר לבדוק אם הכאב זהה לבסיס או גבוה ממנו.' };
}
