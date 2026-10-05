// דפוסים ארוכי טווח (אחרי 3 שבועות נתונים לפחות): השלמה לפי תרגיל ואיזון קבוצות ב־4 השבועות האחרונים.
import { ALTERNATIVES, WORKOUTS, findExercise } from '../data/plan';
import { GROUPS, GROUP_HE, REORDER_GROUPS, type MuscleGroup } from '../data/muscles';
import type { AppState } from '../types';
import { addDays, diffDays, weekStart } from './dates';
import { UNDER_RATIO } from './adjust';
import { exercisePain, } from './pain';
import { sortSessions } from './rotation';
import { weekEnd, weekSummary } from './weekly';
import { resolveExerciseId } from './workout';

export const PATTERN_MIN_WEEKS = 3;
export const PATTERN_WINDOW = 4;
export const SKIP_RATE = 0.5;
export const MIN_APPEARANCES = 3;
export const AHEAD_RATIO = 1.1;
/** הצעה שנדחתה לא חוזרת 4 שבועות */
export const DISMISS_DAYS = 28;

export interface ExerciseStat {
  slotId: string;
  appearances: number;
  done: number;
  skipped: number;
  rate: number;
  /** כמה פעמים בוצעה כל גרסה (מקור/חלופה) */
  performed: Record<string, number>;
  /** סטים מעבר לתוכנית */
  extraSets: number;
}

export interface GroupTrend { group: MuscleGroup; ratios: (number | null)[]; behind: number; ahead: number; activeWeeks: number }

export type PatternSuggestion =
  | { id: string; kind: 'swap'; slotId: string; altId: string; text: string }
  | { id: string; kind: 'priority'; group: MuscleGroup; text: string }
  | { id: string; kind: 'info'; text: string };

export interface Patterns {
  enough: boolean;
  /** מספר שבועות הנתונים (עד 4 בחלון) */
  weeks: string[];
  stats: ExerciseStat[];
  trends: GroupTrend[];
  suggestions: PatternSuggestion[];
}

/** שבועות החלון: מהשבוע של האימון הראשון ועד השבוע שנסקר, לכל היותר 4 אחרונים */
export function dataWeeks(state: Pick<AppState, 'sessions'>, refWs: string): string[] {
  const first = sortSessions(state.sessions)[0];
  if (!first) return [];
  const fw = weekStart(first.date);
  if (fw > refWs) return [];
  const n = Math.floor(diffDays(refWs, fw) / 7) + 1;
  return Array.from({ length: Math.min(n, PATTERN_WINDOW) }, (_, i) => addDays(refWs, -7 * (Math.min(n, PATTERN_WINDOW) - 1 - i)));
}

export function exerciseStats(state: Pick<AppState, 'sessions'>, from: string, to: string): ExerciseStat[] {
  const map = new Map<string, ExerciseStat>();
  for (const s of state.sessions) {
    if (s.date < from || s.date > to || s.manual) continue;
    for (const e of s.exercises) {
      const st = map.get(e.slotId) ?? { slotId: e.slotId, appearances: 0, done: 0, skipped: 0, rate: 0, performed: {}, extraSets: 0 };
      st.appearances++;
      const d = e.skipped ? 0 : e.sets.filter((x) => x.done).length;
      if (d > 0) { st.done++; st.performed[e.exerciseId] = (st.performed[e.exerciseId] ?? 0) + 1; } else st.skipped++;
      st.extraSets += Math.max(0, d - e.plannedSets);
      map.set(e.slotId, st);
    }
  }
  return [...map.values()].map((s) => ({ ...s, rate: s.appearances ? Math.round((s.done / s.appearances) * 100) / 100 : 0 })).sort((a, b) => a.rate - b.rate);
}

/** החלופה שכדאי להציע: לא תלוית אישור (אם אין אישור), לא הנוכחית, עדיפות למה שכבר ביצע, ואז למה שלא כפול באימון */
export function pickAlternative(state: AppState, slotId: string, stat?: ExerciseStat): string | null {
  const workouts = Object.values(WORKOUTS).filter((w) => w.slots.some((s) => s.exerciseId === slotId));
  const slot = workouts[0]?.slots.find((s) => s.exerciseId === slotId);
  if (!slot) return null;
  const current = resolveExerciseId(state, slot, workouts[0].slots).id;
  const used = new Set(workouts.flatMap((w) => w.slots.map((s) => s.exerciseId)).filter((id) => id !== slotId));
  const alts = (ALTERNATIVES[slotId] ?? []).filter((a) => (!a.legs || state.settings.legsCleared) && a.id !== current);
  if (!alts.length) return null;
  const score = (a: (typeof alts)[number]) => (stat?.performed[a.id] ?? 0) * 10 + (used.has(a.ref ?? '') ? 0 : 1);
  return [...alts].sort((a, b) => score(b) - score(a))[0].id;
}

export function detectPatterns(state: AppState, refWs: string, today: string): Patterns {
  const weeks = dataWeeks(state, refWs);
  const enough = weeks.length >= PATTERN_MIN_WEEKS;
  if (!enough) return { enough, weeks, stats: [], trends: [], suggestions: [] };
  const stats = exerciseStats(state, weeks[0], weekEnd(refWs));
  const sums = weeks.map((w) => weekSummary(state, w));
  const trends: GroupTrend[] = GROUPS.map((g) => {
    const ratios = sums.map((s) => (s.sessionsDone > 0 ? s.groups[g].ratio : null));
    const act = ratios.filter((r): r is number => r !== null);
    return { group: g, ratios, behind: act.filter((r) => r < UNDER_RATIO).length, ahead: act.filter((r) => r >= AHEAD_RATIO).length, activeWeeks: act.length };
  });

  const dismissed = (id: string) => { const d = state.dismissedSuggestions?.[id]; return !!d && diffDays(today, d) < DISMISS_DAYS; };
  const permPriority = new Set(state.permanent.filter((c) => c.kind === 'priority').map((c) => c.group));
  const sug: PatternSuggestion[] = [];
  const need = (t: GroupTrend) => Math.min(PATTERN_MIN_WEEKS, t.activeWeeks);

  for (const t of trends) {
    if (t.activeWeeks < 2 || t.behind < need(t)) continue;
    const he = GROUP_HE[t.group].he;
    if (REORDER_GROUPS.includes(t.group)) {
      if (permPriority.has(t.group)) continue;
      sug.push({ id: `priority:${t.group}`, kind: 'priority', group: t.group, text: `${he} בפיגור ב־${t.behind} מתוך ${t.activeWeeks} שבועות. להשאיר ${he} ראשון בכל אימון, באופן קבוע?` });
    } else {
      sug.push({ id: `info-behind:${t.group}`, kind: 'info', text: `${he} בפיגור ב־${t.behind} מתוך ${t.activeWeeks} שבועות. ${he} נשאר בסוף האימון בכוונה; עדיף פשוט לא לדלג עליו.` });
    }
  }

  for (const s of stats) {
    if (s.appearances < MIN_APPEARANCES || s.skipped / s.appearances < SKIP_RATE) continue;
    const workouts = Object.values(WORKOUTS).filter((w) => w.slots.some((x) => x.exerciseId === s.slotId));
    const slot = workouts[0]?.slots.find((x) => x.exerciseId === s.slotId);
    if (!slot) continue;
    const cur = findExercise(resolveExerciseId(state, slot, workouts[0].slots).id)?.he ?? s.slotId;
    if (exercisePain(state.sessions, s.slotId, state.settings.pauseCleared[s.slotId]).level !== 'none') {
      sug.push({ id: `info-pain:${s.slotId}`, kind: 'info', text: `${cur}: הרבה דילוגים, והתרגיל מסומן בכלל הכאב. לא מחליפים לבד; כדאי לברר מול הפיזיותרפיסט.` });
      continue;
    }
    const alt = pickAlternative(state, s.slotId, s);
    if (!alt) continue;
    sug.push({ id: `swap:${s.slotId}:${alt}`, kind: 'swap', slotId: s.slotId, altId: alt, text: `אתה מדלג הרבה על ${cur} (${s.skipped} מתוך ${s.appearances} פעמים). להחליף לצמיתות ל${findExercise(alt)?.he ?? alt}?` });
  }

  for (const t of trends) {
    if (t.activeWeeks >= PATTERN_MIN_WEEKS && t.ahead >= PATTERN_MIN_WEEKS) {
      sug.push({ id: `info-ahead:${t.group}`, kind: 'info', text: `${GROUP_HE[t.group].he} מעל התוכנית באופן קבוע. זה בסדר, אין צורך להוסיף עוד.` });
    }
  }

  const actionable = sug.filter((x) => x.kind !== 'info' && !dismissed(x.id)).slice(0, 3);
  const info = sug.filter((x) => x.kind === 'info' && !dismissed(x.id)).slice(0, 2);
  return { enough, weeks, stats, trends, suggestions: [...actionable, ...info] };
}
