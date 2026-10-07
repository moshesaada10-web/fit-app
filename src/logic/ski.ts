// לוגיקת בלוק ההכנה לסקי. פונקציות טהורות.
import type { WorkoutId } from '../data/plan';
import { SKI_EXERCISES, SKI_FINISHERS, SKI_WEEKS, type SkiExercise } from '../data/ski';
import type { ExLog, Settings } from '../types';
import { addDays, diffDays } from './dates';
import type { Position } from './rotation';

export interface SkiWeek {
  /** 1..12 בבלוק; לפני תחילת הבלוק = 1 */
  week: number;
  /** 0: שבועות 1–4, 1: 5–8, 2: 9–12 */
  stage: 0 | 1 | 2;
  daysLeft: number;
  /** השבוע האחרון לפני הטיול: נפח −40% */
  taper: boolean;
  /** הבלוק עוד לא התחיל (יותר מ־12 שבועות לטיול) */
  before: boolean;
}

export const TAPER_FACTOR = 0.6;

/** null = הבלוק כבוי או שהטיול כבר עבר */
export function skiWeek(settings: Pick<Settings, 'skiPrep' | 'skiTripDate'>, today: string): SkiWeek | null {
  if (!settings.skiPrep || !settings.skiTripDate) return null;
  const daysLeft = diffDays(settings.skiTripDate, today);
  if (daysLeft < 0) return null;
  const start = addDays(settings.skiTripDate, -SKI_WEEKS * 7);
  const before = today < start;
  const week = before ? 1 : Math.min(SKI_WEEKS, Math.floor(diffDays(today, start) / 7) + 1);
  const stage = (week <= 4 ? 0 : week <= 8 ? 1 : 2) as SkiWeek['stage'];
  return { week, stage, daysLeft, taper: daysLeft <= 7, before };
}

export const SKI_STAGE_HE = ['לומדים את התנועות, נפח נמוך', 'יותר זמן וסטים', 'החזקות ארוכות וסיבולת לסקי'];

/** התרגיל שמבוצע בפועל: תרגילי רגליים בלי אישור פיזיו מוחלפים */
export function resolveSki(id: string, legsCleared: boolean): { id: string; swapped: boolean } {
  const ex = SKI_EXERCISES[id];
  if (ex.legs && !legsCleared && ex.subFor) return { id: ex.subFor, swapped: true };
  return { id, swapped: false };
}

export interface SkiItem { slotId: string; exerciseId: string; ex: SkiExercise; sets: number; dose: number; swapped: boolean; cue?: string }

/** סיום הסקי לאימון: סטים לפי שלב, −40% בשבוע קל של התוכנית או בשבוע ההפחתה (לא מצטבר) */
export function skiFinisher(settings: Settings, type: WorkoutId, today: string, pos: Pick<Position, 'deload'>): SkiItem[] {
  const w = skiWeek(settings, today);
  if (!w) return [];
  return SKI_FINISHERS[type].map((slotId) => {
    const r = resolveSki(slotId, settings.legsCleared);
    const ex = SKI_EXERCISES[r.id];
    const orig = SKI_EXERCISES[slotId];
    let sets = ex.sets[w.stage];
    if (pos.deload || w.taper) sets = Math.max(1, Math.round(sets * TAPER_FACTOR));
    const cue = orig.cue?.[w.stage];
    return { slotId, exerciseId: r.id, ex, sets, dose: ex.dose[w.stage], swapped: r.swapped, ...(cue ? { cue } : {}) };
  });
}

export function skiLogs(items: SkiItem[]): ExLog[] {
  return items.map((it) => ({
    slotId: it.slotId, exerciseId: it.exerciseId, repMin: it.dose, repMax: it.dose, plannedSets: it.sets,
    sets: Array.from({ length: it.sets }, () => ({ w: null, r: null, done: false })), ski: true,
  }));
}

/** יעד אירובי בבלוק הסקי: עד 40–45 דק׳ אופניים; הפחתה בשבוע האחרון */
export function skiCardio(w: SkiWeek | null, base: { min: number; max: number; easy: boolean }, deload: boolean): { min: number; max: number; easy: boolean } {
  if (!w || w.before) return base;
  if (w.taper) return { min: 20, max: 25, easy: true };
  if (deload) return base;
  if (w.week >= 9) return { min: 40, max: 45, easy: false };
  if (w.week >= 5) return { min: Math.max(base.min, 35), max: Math.max(base.max, 40), easy: false };
  return base;
}

/** אינטרוולים עדינים באופניים מבלוק הסקי: משבוע 7, לא בשבוע קל ולא בהפחתה, ורק בלי כאב */
export function skiIntervalsAllowed(w: SkiWeek | null, deload: boolean, painActive: boolean): boolean {
  return !!w && !w.before && w.week >= 7 && !w.taper && !deload && !painActive;
}
export const SKI_INTERVALS_HE = 'רשות, רק בלי כאב: באופניים 4×3 דק׳ בקצב בינוני (אפשר לדבר במשפטים קצרים), 3 דק׳ קל ביניהם. בלי עמידה על הדוושות.';

/** יעד אירובי ואינטרוולים לשימוש במסכים */
export function cardioPlanFor(settings: Settings, today: string, pos: Position, base: { min: number; max: number; easy: boolean }, painActive: boolean) {
  const w = skiWeek(settings, today);
  return { target: skiCardio(w, base, pos.deload || pos.early), skiIntervals: skiIntervalsAllowed(w, pos.deload || pos.early, painActive), w };
}
