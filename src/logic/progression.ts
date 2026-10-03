import { DELOAD_WEIGHT_FACTOR } from './rotation';
import type { ExLog } from '../types';

export function roundToStep(x: number, step: number): number {
  if (step <= 0) return x;
  return Math.round((Math.round(x / step) * step) * 100) / 100;
}

/** משקל העבודה של תרגיל ביומן: המשקל הגבוה ביותר בסטים שבוצעו */
export function workingWeight(e: ExLog): number | null {
  const ws = e.sets.filter((s) => s.done && s.w !== null).map((s) => s.w as number);
  return ws.length ? Math.max(...ws) : null;
}

export function doneSets(e: ExLog) { return e.sets.filter((s) => s.done && s.r !== null && s.r > 0); }

/** כל הסטים שבוצעו הגיעו לקצה העליון של טווח החזרות */
export function reachedTop(e: ExLog): boolean {
  const d = doneSets(e);
  if (d.length < Math.min(2, e.plannedSets)) return false;
  return d.every((s) => (s.r as number) >= e.repMax);
}

export type SuggestKind = 'start' | 'hold' | 'increase' | 'deload' | 'return' | 'reduce' | 'bodyweight' | 'paused';

export interface Suggestion {
  kind: SuggestKind;
  weight: number | null;
  /** יעד חזרות מוצע להתחלה */
  reps: number | null;
  text: string;
}

export interface HistoryEntry extends ExLog { date: string; deload?: boolean }

export interface SuggestInput {
  /** היסטוריה כרונולוגית (מהישן לחדש) של אותו תרגיל, ללא דילוגים */
  history: HistoryEntry[];
  step: number;
  repMin: number;
  repMax: number;
  isDeloadNow: boolean;
  bodyweight: boolean;
  unit: 'reps' | 'sec';
  painLevel?: 'none' | 'reduce' | 'pause';
}

const sameW = (a: number | null, b: number | null) => a !== null && b !== null && Math.abs(a - b) < 0.01;

/** הצעת התקדמות לפי כללי התוכנית */
export function suggestProgression(inp: SuggestInput): Suggestion {
  const { step, repMin, repMax, isDeloadNow, bodyweight, painLevel } = inp;
  const hist = inp.history.filter((h) => doneSets(h).length > 0);
  const normal = hist.filter((h) => !h.deload);
  const last = hist[hist.length - 1];
  const lastNormal = normal[normal.length - 1];

  if (painLevel === 'pause') {
    return { kind: 'paused', weight: null, reps: null, text: 'התרגיל מושהה אחרי כאב ב־2 אימונים ברציפות. לפנות לפיזיותרפיסט לפני שחוזרים.' };
  }

  if (bodyweight) {
    const [a, b] = normal.slice(-2);
    const top = a && b && reachedTop(a) && reachedTop(b);
    const unitWord = inp.unit === 'sec' ? 'שניות' : 'חזרות';
    if (painLevel === 'reduce') return { kind: 'reduce', weight: null, reps: repMin, text: `אחרי כאב: סט אחד פחות וטווח קל יותר. ${unitWord} בנוחות.` };
    if (isDeloadNow) return { kind: 'deload', weight: null, reps: repMin, text: 'שבוע קל: פחות סטים, בשליטה, עם עוד 4 חזרות טובות בכל סט.' };
    if (top) return { kind: 'bodyweight', weight: null, reps: repMax, text: 'הגעת לקצה העליון ב־2 אימונים. אפשר להאריך החזקה או להקשות מעט, רק אם הכול רגוע ובהמלצת מדריך או פיזיותרפיסט.' };
    if (!last) return { kind: 'start', weight: null, reps: repMin, text: `להתחיל מ־${repMin} ${unitWord} בשליטה.` };
    return { kind: 'hold', weight: null, reps: repMax, text: `להוסיף ${unitWord} עד הקצה העליון (${repMax}) בכל הסטים.` };
  }

  if (!last) {
    return { kind: 'start', weight: null, reps: repMin, text: 'עדיין אין היסטוריה. לבחור משקל קל שמאפשר לסיים עם עוד 3–4 חזרות טובות.' };
  }

  const preW = lastNormal ? workingWeight(lastNormal) : workingWeight(last);

  if (isDeloadNow) {
    if (preW === null) return { kind: 'deload', weight: null, reps: repMin, text: 'שבוע קל: משקל קל יותר ב־10% בערך.' };
    const w = roundToStep(preW * DELOAD_WEIGHT_FACTOR, step);
    return { kind: 'deload', weight: w, reps: repMin, text: `שבוע קל: ${w} ק״ג (כ־10% פחות), עם עוד 4 חזרות טובות בכל סט.` };
  }

  // השבוע אחרי הדלוד: חוזרים למשקל לפני הדלוד, בלי לעלות מעבר לו
  if (last.deload && preW !== null) {
    return { kind: 'return', weight: preW, reps: repMin, text: `חוזרים למשקל לפני השבוע הקל: ${preW} ק״ג. לא מעלים מעבר לו.` };
  }

  if (painLevel === 'reduce' && preW !== null) {
    const w = Math.max(0, roundToStep(preW - step, step));
    return { kind: 'reduce', weight: w, reps: repMin, text: `אחרי כאב: סט אחד פחות ומשקל קל יותר, ${w} ק״ג.` };
  }

  const [a, b] = normal.slice(-2);
  if (a && b && reachedTop(a) && reachedTop(b) && sameW(workingWeight(a), workingWeight(b))) {
    const w = roundToStep((workingWeight(b) as number) + step, step);
    return { kind: 'increase', weight: w, reps: repMin, text: `הגעת לקצה העליון (${repMax}) בכל הסטים ב־2 אימונים. מוסיפים מדרגה קטנה: ${w} ק״ג, וחוזרים לקצה התחתון (${repMin}).` };
  }

  const cur = lastNormal ?? last;
  const w = workingWeight(cur);
  return {
    kind: 'hold', weight: w, reps: repMax,
    text: w === null ? `לשמור על אותו עומס ולהוסיף חזרות עד ${repMax}.` : `אותו משקל (${w} ק״ג). להוסיף חזרות עד ${repMax} בכל הסטים.`,
  };
}
