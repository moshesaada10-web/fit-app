import { ALTERNATIVES, EXERCISES, WORKOUTS, findExercise, type Exercise, type Slot, type WorkoutId } from '../data/plan';
import type { AppState, Draft, ExLog, Session } from '../types';
import { exercisePain, type PainLevel } from './pain';
import { roundToStep, suggestProgression, type HistoryEntry, type Suggestion } from './progression';
import { positionFor, sortSessions, targetSets, type Position } from './rotation';

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

export function buildDraft(state: AppState, type: WorkoutId, date: string): Draft {
  const pos = positionFor(state.sessions, state.settings.earlyDeloadFrom);
  const def = WORKOUTS[type];
  const exercises: ExLog[] = def.slots.map((slot) => {
    const { id } = resolveExerciseId(state, slot, def.slots);
    const { sug, pain } = suggestFor(state, slot, id, pos);
    let n = targetSets(slot, pos).sets;
    if (pain === 'reduce') n = Math.max(1, n - 1);
    const w = sug.weight !== null ? roundToStep(sug.weight, 0.01) : null;
    return {
      slotId: slot.exerciseId,
      exerciseId: id,
      repMin: slot.repMin, repMax: slot.repMax,
      plannedSets: n,
      sets: Array.from({ length: n }, () => ({ w, r: null, done: false })),
      skipped: pain === 'pause' ? true : undefined,
    };
  });
  return { type, date, startedAt: Date.now(), exercises, notes: '', deload: pos.deload };
}
