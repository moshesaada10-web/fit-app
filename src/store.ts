import { useSyncExternalStore } from 'react';
import type { WorkoutId } from './data/plan';
import { todayISO } from './logic/dates';
import { buildDraft } from './logic/workout';
import { GROUPS, type MuscleGroup } from './data/muscles';
import type { AppState, BodyEntry, BoostItem, CardioEntry, DailyLog, Draft, Pain, PermanentChange, PriorityItem, ReviewRecord, Session, Settings, WeekAdjustment } from './types';

const KEY = 'moshe-fitness-v1';

export function defaultSettings(today = todayISO()): Settings {
  return {
    heightCm: 175, baselineKg: 90, baselineDate: today, goalKg: 85, pastKg: 114,
    legsCleared: false, earlyDeloadFrom: null, stepOverrides: {}, pauseCleared: {}, physioChecked: {},
  };
}

export function emptyState(): AppState {
  return { version: 1, settings: defaultSettings(), sessions: [], cardio: [], body: [], daily: {}, draft: null, swapPrefs: {}, reviews: {}, adjustment: null, permanent: [], dismissedSuggestions: {} };
}

export function uid(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
}

/** מאמת מבנה בסיסי של גיבוי; זורק שגיאה אם לא תקין */
export function parseBackup(text: string): AppState {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('הקובץ אינו JSON תקין'); }
  const o = raw as Partial<AppState> & { app?: string; data?: Partial<AppState> };
  const d = (o && o.data ? o.data : o) as Partial<AppState>;
  if (!d || typeof d !== 'object' || d.version !== 1 || !Array.isArray(d.sessions) || !Array.isArray(d.cardio) || !Array.isArray(d.body)) {
    throw new Error('זה לא קובץ גיבוי של האפליקציה');
  }
  const base = emptyState();
  return {
    ...base, ...d,
    settings: { ...base.settings, ...(d.settings ?? {}) },
    daily: d.daily && typeof d.daily === 'object' ? d.daily : {},
    swapPrefs: d.swapPrefs ?? {},
    draft: d.draft ?? null,
    // שדות שנוספו בגרסה עם הסיכום השבועי: גיבוי ישן מקבל ערכי ברירת מחדל, ערכים פגומים מסוננים
    reviews: cleanReviews(d.reviews),
    adjustment: cleanAdjustment(d.adjustment),
    permanent: Array.isArray(d.permanent) ? d.permanent.filter(isPermanent) : [],
    dismissedSuggestions: isObj(d.dismissedSuggestions) ? Object.fromEntries(Object.entries(d.dismissedSuggestions).filter(([, v]) => isDate(v))) : {},
  } as AppState;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isDate = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const isGroup = (x: unknown): x is MuscleGroup => GROUPS.includes(x as MuscleGroup);
function cleanReviews(x: unknown): Record<string, ReviewRecord> {
  if (!isObj(x)) return {};
  const out: Record<string, ReviewRecord> = {};
  for (const [k, v] of Object.entries(x)) {
    if (isDate(k) && isObj(v) && ['approved', 'dismissed', 'ack'].includes(v.decision as string)) out[k] = { decision: v.decision as ReviewRecord['decision'], at: isDate(v.at) ? v.at : k };
  }
  return out;
}
function cleanAdjustment(x: unknown): WeekAdjustment | null {
  if (!isObj(x) || !isDate(x.fromWeek) || !isDate(x.approvedOn) || !isDate(x.until)) return null;
  const priority = (Array.isArray(x.priority) ? x.priority : []).filter((p): p is PriorityItem => isObj(p) && isGroup(p.group) && typeof p.reason === 'string');
  const boosts = (Array.isArray(x.boosts) ? x.boosts : []).filter((b): b is BoostItem => isObj(b) && ['A', 'B', 'C'].includes(b.workout as string) && typeof b.slotId === 'string' && isGroup(b.group) && typeof b.reason === 'string');
  return { fromWeek: x.fromWeek, approvedOn: x.approvedOn, until: x.until, priority, boosts };
}
function isPermanent(c: unknown): c is PermanentChange {
  if (!isObj(c) || typeof c.id !== 'string' || !isDate(c.createdOn)) return false;
  if (c.kind === 'swap') return typeof c.slotId === 'string' && typeof c.altId === 'string';
  if (c.kind === 'priority') return isGroup(c.group);
  return false;
}

function load(): AppState {
  try {
    const t = localStorage.getItem(KEY);
    if (t) return parseBackup(t);
  } catch { /* ignore */ }
  return emptyState();
}

let state: AppState = load();
const listeners = new Set<() => void>();

function commit(next: AppState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* מלא או חסום */ }
  listeners.forEach((l) => l());
}

export const getState = () => state;
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function useAppState(): AppState { return useSyncExternalStore(subscribe, getState); }

const patch = (p: Partial<AppState>) => commit({ ...state, ...p });

export const actions = {
  setSettings(p: Partial<Settings>) { patch({ settings: { ...state.settings, ...p } }); },

  startWorkout(type: WorkoutId, date = todayISO()) {
    if (!state.draft) patch({ draft: buildDraft(state, type, date) });
  },
  restartWorkout(type: WorkoutId, date = todayISO()) { patch({ draft: buildDraft(state, type, date) }); },
  updateDraft(fn: (d: Draft) => Draft) { if (state.draft) patch({ draft: fn(state.draft) }); },
  discardDraft() { patch({ draft: null }); },
  setSwap(slotId: string, altId: string | null) {
    const swapPrefs = { ...state.swapPrefs };
    if (altId === null) delete swapPrefs[slotId]; else swapPrefs[slotId] = altId;
    patch({ swapPrefs });
  },

  finishWorkout(extra: { pain: Pain; painTriggers: string[] }): Session | null {
    const d = state.draft;
    if (!d) return null;
    const s: Session = {
      id: uid(), date: d.date, type: d.type, createdAt: Date.now(),
      exercises: d.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done || x.r !== null) })),
      notes: d.notes || undefined, pain: extra.pain, painTriggers: extra.painTriggers, deload: d.deload,
    };
    patch({ sessions: [...state.sessions, s], draft: null });
    return s;
  },
  addSession(s: Omit<Session, 'id' | 'createdAt' | 'exercises'> & { exercises?: Session['exercises'] }) {
    const full: Session = { ...s, id: uid(), createdAt: Date.now(), exercises: s.exercises ?? [], manual: s.exercises ? s.manual : true };
    patch({ sessions: [...state.sessions, full] });
  },
  updateSession(id: string, p: Partial<Session>) { patch({ sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...p } : s)) }); },
  deleteSession(id: string) { patch({ sessions: state.sessions.filter((s) => s.id !== id) }); },

  addCardio(c: Omit<CardioEntry, 'id' | 'createdAt'>) { patch({ cardio: [...state.cardio, { ...c, id: uid(), createdAt: Date.now() }] }); },
  updateCardio(id: string, p: Partial<CardioEntry>) { patch({ cardio: state.cardio.map((c) => (c.id === id ? { ...c, ...p } : c)) }); },
  deleteCardio(id: string) { patch({ cardio: state.cardio.filter((c) => c.id !== id) }); },

  addBody(b: Omit<BodyEntry, 'id'>) { patch({ body: [...state.body, { ...b, id: uid() }] }); },
  updateBody(id: string, p: Partial<BodyEntry>) { patch({ body: state.body.map((b) => (b.id === id ? { ...b, ...p } : b)) }); },
  deleteBody(id: string) { patch({ body: state.body.filter((b) => b.id !== id) }); },

  setDaily(date: string, p: Partial<DailyLog>) {
    patch({ daily: { ...state.daily, [date]: { ...(state.daily[date] ?? { date }), ...p, date } } });
  },

  /* ---------- סיכום שבועי ---------- */
  approveReview(weekStart: string, adj: Omit<WeekAdjustment, 'approvedOn'>, today = todayISO()) {
    patch({ adjustment: { ...adj, approvedOn: today }, reviews: { ...state.reviews, [weekStart]: { decision: 'approved', at: today } } });
  },
  closeReview(weekStart: string, decision: 'dismissed' | 'ack', today = todayISO()) {
    patch({ reviews: { ...state.reviews, [weekStart]: { decision, at: today } } });
  },
  /** מחזיר את הסיכום למצב "לא טופל" (ומבטל את ההתאמה אם נוצרה ממנו) */
  reopenReview(weekStart: string) {
    const reviews = { ...state.reviews };
    delete reviews[weekStart];
    patch({ reviews, adjustment: state.adjustment?.fromWeek === weekStart ? null : state.adjustment });
  },
  cancelAdjustment() { patch({ adjustment: null }); },

  applyPermanentSwap(slotId: string, altId: string, today = todayISO()) {
    const prevPref = state.swapPrefs[slotId] ?? null;
    const c: PermanentChange = { id: uid(), kind: 'swap', createdOn: today, slotId, altId, prevPref };
    patch({
      swapPrefs: { ...state.swapPrefs, [slotId]: altId },
      permanent: [...state.permanent.filter((x) => !(x.kind === 'swap' && x.slotId === slotId)), c],
    });
  },
  applyPermanentPriority(group: MuscleGroup, today = todayISO()) {
    if (state.permanent.some((x) => x.kind === 'priority' && x.group === group)) return;
    patch({ permanent: [...state.permanent, { id: uid(), kind: 'priority', createdOn: today, group }] });
  },
  undoPermanent(id: string) {
    const c = state.permanent.find((x) => x.id === id);
    if (!c) return;
    const swapPrefs = { ...state.swapPrefs };
    // מחזירים את ההעדפה הקודמת רק אם המשתמש לא החליף ידנית בינתיים
    if (c.kind === 'swap' && c.slotId && swapPrefs[c.slotId] === c.altId) {
      if (c.prevPref) swapPrefs[c.slotId] = c.prevPref; else delete swapPrefs[c.slotId];
    }
    patch({ swapPrefs, permanent: state.permanent.filter((x) => x.id !== id) });
  },
  dismissSuggestion(id: string, today = todayISO()) { patch({ dismissedSuggestions: { ...state.dismissedSuggestions, [id]: today } }); },

  importAll(s: AppState) { commit(s); },
  resetAll() { commit(emptyState()); },
};

export function exportJSON(): string {
  return JSON.stringify({ app: 'moshe-fitness', exportedAt: new Date().toISOString(), data: state }, null, 2);
}
