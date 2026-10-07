import { ALTERNATIVES, EXERCISES, WORKOUTS, findExercise, type Exercise, type Slot, type WorkoutId } from '../data/plan';
import type { AppState, Draft, ExLog, Session } from '../types';
import { exercisePain, type PainLevel } from './pain';
import { roundToStep, suggestProgression, type HistoryEntry, type Suggestion } from './progression';
import { positionFor, sortSessions, targetSets, type Position } from './rotation';
import { skiFinisher, skiLogs } from './ski';
import { boostBlock, boostUsed, effectivePriority, isAdjustmentActive, orderByPriority } from './adjust';

export function exerciseHistory(sessions: Session[], exerciseId: string): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const s of sortSessions(sessions)) {
    for (const e of s.exercises) {
      if (e.exerciseId === exerciseId && !e.skipped) out.push({ ...e, date: s.date, deload: s.deload });
    }
  }
  return out;
}

/** החלופה שנבחרת כברירת מחדל לתרגיל רגליים שלא אושר: הראשונה שאינה כפולה ואינה תלוית אישור */
export function defaultAltFor(slot: Slot, workoutSlots: Slot[]): string | null {
  const list = ALTERNATIVES[slot.exerciseId] ?? [];
  const used = new Set(workoutSlots.map((s) => s.exerciseId));
  const ok = list.filter((a) => !a.legs);
  const pick = ok.find((a) => !used.has(a.ref ?? '') && !used.has(a.id)) ?? ok[0];
  return pick ? pick.id : null;
}

export function resolveExerciseId(state: AppState, slot: Slot, workoutSlots: Slot[]): { id: string; autoSwapped: boolean } {
  const pref = state.swapPrefs[slot.exerciseId];
  const ex = EXERCISES[slot.exerciseId];
  if (pref === 'orig') return { id: slot.exerciseId, autoSwapped: false };
  if (pref) return { id: pref, autoSwapped: false };
  if (ex.legs && !state.settings.legsCleared) {
    const alt = defaultAltFor(slot, workoutSlots);
    if (alt) return { id: alt, autoSwapped: true };
  }
  return { id: slot.exerciseId, autoSwapped: false };
}

export function stepFor(state: AppState, ex: Exercise): number {
  return state.settings.stepOverrides[ex.id] ?? ex.step;
}

export function suggestFor(state: AppState, slot: Slot, exerciseId: string, pos: Position): { sug: Suggestion; pain: PainLevel } {
  const ex = findExercise(exerciseId) as Exercise;
  const pain = exercisePain(state.sessions, slot.exerciseId, state.settings.pauseCleared[slot.exerciseId]).level;
  const sug = suggestProgression({
    history: exerciseHistory(state.sessions, exerciseId),
    step: stepFor(state, ex),
    repMin: slot.repMin, repMax: slot.repMax,
    isDeloadNow: pos.deload,
    bodyweight: ex.kind === 'bodyweight',
    unit: ex.unit,
    painLevel: pain,
  });
  return { sug, pain };
}

export interface PlannedSlot {
  slot: Slot;
  exerciseId: string;
  autoSwapped: boolean;
  /** הוקדם בגלל עדיפות (שבועית או קבועה): הסבר לתג */
  moved?: string;
  /** סט נוסף מאושר מההתאמה השבועית: הסבר לתג */
  boost?: string;
  /** מיקום מקורי בתוכנית (0-based) */
  origIndex: number;
}

/** סדר התרגילים והתאמות לאימון מסוים בתאריך מסוים (ללא שינוי ברוטציה) */
export function planWorkout(state: AppState, type: WorkoutId, date: string, pos: Position = positionFor(state.sessions, state.settings.earlyDeloadFrom)): PlannedSlot[] {
  const def = WORKOUTS[type];
  const base = def.slots.map((slot) => { const r = resolveExerciseId(state, slot, def.slots); return { slot, exerciseId: r.id, autoSwapped: r.autoSwapped }; });
  const ordered = orderByPriority(base, effectivePriority(state, date));
  const adj = isAdjustmentActive(state.adjustment, date) ? state.adjustment : null;
  return ordered.map(({ item, origIndex, reason }) => {
    const b = adj?.boosts.find((x) => x.workout === type && x.slotId === item.slot.exerciseId);
    const boost = b && adj && !boostUsed(state.sessions, adj, type, b.slotId) && boostBlock(state, item.slot, item.exerciseId, pos) === null ? b.reason : undefined;
    return { slot: item.slot, exerciseId: item.exerciseId, autoSwapped: item.autoSwapped, moved: reason, boost, origIndex };
  });
}

export function buildDraft(state: AppState, type: WorkoutId, date: string): Draft {
  const pos = positionFor(state.sessions, state.settings.earlyDeloadFrom);
  const exercises: ExLog[] = planWorkout(state, type, date, pos).map(({ slot, exerciseId: id, moved, boost }) => {
    const { sug, pain } = suggestFor(state, slot, id, pos);
    let n = targetSets(slot, pos).sets + (boost ? 1 : 0);
    if (pain === 'reduce') n = Math.max(1, n - 1);
    const w = sug.weight !== null ? roundToStep(sug.weight, 0.01) : null;
    return {
      slotId: slot.exerciseId,
      exerciseId: id,
      repMin: slot.repMin, repMax: slot.repMax,
      plannedSets: n,
      sets: Array.from({ length: n }, () => ({ w, r: null, done: false })),
      skipped: pain === 'pause' ? true : undefined,
      ...(moved ? { moved } : {}),
      ...(boost ? { boosted: boost } : {}),
    };
  });
  // סיום סקי תמיד בסוף, אחרי התרגילים העיקריים (ההתאמה השבועית לא מזיזה אותו)
  exercises.push(...skiLogs(skiFinisher(state.settings, type, date, pos)));
  return { type, date, startedAt: Date.now(), exercises, notes: '', deload: pos.deload };
}
