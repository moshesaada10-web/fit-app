// התאמה שבועית: סדר תרגילים לפי קבוצות בפיגור, וסט נוסף בכפוף לכללי בטיחות. פונקציות טהורות.
import { WORKOUTS, type Slot, type WorkoutId } from '../data/plan';
import { GROUP_HE, LEG_GROUPS, REORDER_GROUPS, primaryGroup, type MuscleGroup } from '../data/muscles';
import type { AppState, PriorityItem, Session, WeekAdjustment } from '../types';
import { exercisePain, generalPain } from './pain';
import { targetSets, type Position } from './rotation';

/** קבוצה "בפיגור": פחות מ־75% מהסטים המתוכננים בשבוע */
export const UNDER_RATIO = 0.75;
/** קבוצה ש"עבדה יפה": 90% ומעלה */
export const GOOD_RATIO = 0.9;
/** כמה קבוצות לכל היותר מקדימים בהתאמה שבועית */
export const MAX_PRIORITY = 2;
/** סטים נוספים: לכל היותר 2 לקבוצה ו־3 בסך הכול בשבוע */
export const MAX_BOOSTS_PER_GROUP = 2;
export const MAX_BOOSTS = 3;

export function isAdjustmentActive(adj: WeekAdjustment | null | undefined, today: string): adj is WeekAdjustment {
  return !!adj && today >= adj.approvedOn && today <= adj.until;
}

/** עדיפויות בתוקף היום: קודם ההתאמה השבועית (לפי גודל הפיגור), אחר כך שינויים קבועים */
export function effectivePriority(state: Pick<AppState, 'adjustment' | 'permanent'>, today: string): PriorityItem[] {
  const out: PriorityItem[] = [];
  const seen = new Set<MuscleGroup>();
  if (isAdjustmentActive(state.adjustment, today)) {
    for (const p of state.adjustment.priority) if (!seen.has(p.group)) { seen.add(p.group); out.push(p); }
  }
  for (const c of state.permanent ?? []) {
    if (c.kind === 'priority' && c.group && !seen.has(c.group)) { seen.add(c.group); out.push({ group: c.group, reason: `קבוע: ${GROUP_HE[c.group].he} בתחילת האימון` }); }
  }
  return out.filter((p) => REORDER_GROUPS.includes(p.group));
}

export interface OrderItem { exerciseId: string }
export interface Ordered<T> { item: T; origIndex: number; reason?: string }

/**
 * מקדים לתחילת האימון תרגילים שהקבוצה העיקרית שלהם בעדיפות, לפי סדר העדיפויות.
 * בתוך כל קבוצה ושאר התרגילים: הסדר המקורי נשמר (מיון יציב). ליבה וידיים לא זזות.
 */
export function orderByPriority<T extends OrderItem>(items: T[], priority: PriorityItem[]): Ordered<T>[] {
  const pr = priority.filter((p) => REORDER_GROUPS.includes(p.group));
  const rank = (it: T) => pr.findIndex((p) => p.group === primaryGroup(it.exerciseId));
  const withIdx = items.map((item, origIndex) => ({ item, origIndex, r: rank(item) }));
  const front = withIdx.filter((x) => x.r >= 0).sort((a, b) => a.r - b.r || a.origIndex - b.origIndex);
  const rest = withIdx.filter((x) => x.r < 0);
  return [
    ...front.map(({ item, origIndex, r }) => ({ item, origIndex, reason: pr[r].reason })),
    ...rest.map(({ item, origIndex }) => ({ item, origIndex })),
  ];
}

export type BoostBlock = 'deload' | 'intro' | 'max' | 'legs' | 'pain' | 'general-pain';
export const BOOST_BLOCK_HE: Record<BoostBlock, string> = {
  deload: 'שבוע קל: לא מוסיפים סטים',
  intro: 'שבועות היכרות: נשארים ב־2 סטים',
  max: 'כבר במקסימום הסטים של התוכנית',
  legs: 'רק אחרי אישור פיזיותרפיסט לתרגילי רגליים',
  pain: 'התרגיל מסומן בכלל הכאב',
  'general-pain': 'היה כאב באימון האחרון: לא מוסיפים נפח',
};

/**
 * האם מותר להוסיף סט אחד לתרגיל בתוך אימון בעמדה הנתונה. null = מותר, אחרת סיבת החסימה.
 * כללים: לא בשבוע קל, לא בשבועות היכרות, לא מעל מספר הסטים המלא בתוכנית, לא רגליים בלי אישור,
 * לא לתרגיל שמסומן בכלל הכאב, ולא כשהכאב הכללי פעיל.
 */
export function boostBlock(state: Pick<AppState, 'sessions' | 'settings'>, slot: Slot, exerciseId: string, pos: Position): BoostBlock | null {
  if (pos.deload) return 'deload';
  if (pos.intro) return 'intro';
  if (LEG_GROUPS.includes(primaryGroup(exerciseId)) && !state.settings.legsCleared) return 'legs';
  if (generalPain(state.sessions).level !== 'none') return 'general-pain';
  if (exercisePain(state.sessions, slot.exerciseId, state.settings.pauseCleared[slot.exerciseId]).level !== 'none') return 'pain';
  if (targetSets(slot, pos).sets + 1 > slot.sets) return 'max';
  return null;
}

/** האם הסט הנוסף כבר נוצל (אימון מאותו סוג מאז האישור שבו התרגיל קיבל סט נוסף) */
export function boostUsed(sessions: Session[], adj: WeekAdjustment, workout: WorkoutId, slotId: string): boolean {
  return sessions.some((s) => s.date >= adj.approvedOn && s.type === workout && s.exercises.some((e) => e.slotId === slotId && e.boosted));
}

export function slotOf(workout: WorkoutId, slotId: string): Slot | undefined {
  return WORKOUTS[workout].slots.find((s) => s.exerciseId === slotId);
}
