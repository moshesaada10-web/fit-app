// סיכום שבועי (ראשון–שבת) והצעת התאמה לשבוע הבא.
import { ORDER, WORKOUTS, findExercise, type WorkoutId } from '../data/plan';
import { GROUPS, GROUP_HE, LEG_GROUPS, REORDER_GROUPS, groupsHe, primaryGroup, type MuscleGroup } from '../data/muscles';
import type { AppState, BoostItem, Pain, PriorityItem, Session } from '../types';
import { addDays, formatShort, parseISO, weekStart } from './dates';
import { BOOST_BLOCK_HE, GOOD_RATIO, MAX_BOOSTS, MAX_BOOSTS_PER_GROUP, MAX_PRIORITY, UNDER_RATIO, boostBlock, orderByPriority, type BoostBlock } from './adjust';
import { isTriggered } from './pain';
import { nextWorkout, programPosition, sortSessions, targetSets } from './rotation';
import { resolveExerciseId } from './workout';
import { skiFinisher } from './ski';

export const SESSIONS_TARGET = 3;
export const CARDIO_TARGET = 2;
/** מיום שישי מציגים את סיכום השבוע הנוכחי */
export const REVIEW_FROM_DAY = 5;

export const weekEnd = (ws: string) => addDays(ws, 6);

/** איזה שבוע לסכם היום: מיום שישי – השבוע הנוכחי, אחרת – השבוע הקודם */
export function reviewWeekFor(today: string): string {
  const ws = weekStart(today);
  return parseISO(today).getDay() >= REVIEW_FROM_DAY ? ws : addDays(ws, -7);
}

/** שבוע שממתין לסיכום (טרם טופל), או null. רק אם התוכנית כבר התחילה עד סוף אותו שבוע. */
export function pendingReview(state: Pick<AppState, 'sessions' | 'cardio' | 'reviews'>, today: string): string | null {
  const ws = reviewWeekFor(today);
  if (state.reviews?.[ws]) return null;
  const we = weekEnd(ws);
  const started = state.sessions.some((s) => s.date <= we) || state.cardio.some((c) => c.date <= we);
  return started ? ws : null;
}

export interface GroupStat { group: MuscleGroup; planned: number; done: number; ratio: number | null }
export interface SkippedItem { slotId: string; exerciseId: string; type: WorkoutId; date: string; partial: boolean }
export interface PainNote { date: string; type: WorkoutId; pain?: Pain; triggers: string[]; nextMorning?: Session['nextMorning']; notes?: string; triggered: boolean }

export interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  sessions: Session[];
  sessionsDone: number;
  cardioDone: number;
  cardioMinutes: number;
  groups: Record<MuscleGroup, GroupStat>;
  /** אימונים שלא בוצעו (לפי הרוטציה) */
  missedWorkouts: WorkoutId[];
  skipped: SkippedItem[];
  pain: PainNote[];
  manualCount: number;
  /** קבוצות בפיגור, מהגדול לקטן */
  under: MuscleGroup[];
  good: MuscleGroup[];
  /** האימון הבא ברוטציה (לפי כל האימונים עד היום) */
  nextType: WorkoutId;
  verdict: string[];
}

const doneCount = (e: { sets: { done: boolean }[]; skipped?: boolean }) => (e.skipped ? 0 : e.sets.filter((s) => s.done).length);

export function weekSummary(state: AppState, ws: string): WeekSummary {
  const we = weekEnd(ws);
  const all = sortSessions(state.sessions);
  const early = state.settings.earlyDeloadFrom;
  const idxBefore = all.filter((s) => s.date < ws).length;
  const inWeek = all.filter((s) => s.date >= ws && s.date <= we);
  const groups = Object.fromEntries(GROUPS.map((g) => [g, { group: g, planned: 0, done: 0, ratio: null }])) as Record<MuscleGroup, GroupStat>;
  const skipped: SkippedItem[] = [];

  inWeek.forEach((s, i) => {
    const pos = programPosition(idxBefore + i, early);
    if (s.manual || s.exercises.length === 0) {
      // נרשם בדיעבד בלי פירוט: נספר לפי התוכנית
      for (const slot of WORKOUTS[s.type].slots) {
        const g = primaryGroup(resolveExerciseId(state, slot, WORKOUTS[s.type].slots).id);
        const n = targetSets(slot, pos).sets;
        if (i < SESSIONS_TARGET) groups[g].planned += n;
        groups[g].done += n;
      }
      return;
    }
    for (const e of s.exercises) {
      const g = primaryGroup(e.exerciseId);
      if (i < SESSIONS_TARGET) groups[g].planned += e.plannedSets;
      const d = doneCount(e);
      groups[g].done += d;
      if (d === 0 || d < Math.min(e.plannedSets, 2)) skipped.push({ slotId: e.slotId, exerciseId: e.exerciseId, type: s.type, date: s.date, partial: d > 0 });
    }
  });

  // אימונים שחסרו להשלמת 3: ממשיכים ברוטציה מהאחרון שבוצע
  const missedWorkouts: WorkoutId[] = [];
  let t: WorkoutId = inWeek.length ? ORDER[(ORDER.indexOf(inWeek[inWeek.length - 1].type) + 1) % 3] : nextWorkout(all.filter((s) => s.date < ws));
  for (let j = inWeek.length; j < SESSIONS_TARGET; j++) {
    missedWorkouts.push(t);
    const pos = programPosition(idxBefore + j, early);
    for (const slot of WORKOUTS[t].slots) {
      const g = primaryGroup(resolveExerciseId(state, slot, WORKOUTS[t].slots).id);
      groups[g].planned += targetSets(slot, pos).sets;
    }
    // סיום סקי מתוכנן (לפי סוף השבוע): נספר גם באימון שלא בוצע
    for (const it of skiFinisher(state.settings, t, we, pos)) groups[primaryGroup(it.exerciseId)].planned += it.sets;
    t = ORDER[(ORDER.indexOf(t) + 1) % 3];
  }
  for (const g of GROUPS) groups[g].ratio = groups[g].planned > 0 ? Math.round((groups[g].done / groups[g].planned) * 100) / 100 : null;

  const cardio = state.cardio.filter((c) => c.date >= ws && c.date <= we);
  const pain: PainNote[] = inWeek
    .filter((s) => s.pain || s.nextMorning || s.painTriggers?.length)
    .map((s) => ({ date: s.date, type: s.type, pain: s.pain, triggers: s.painTriggers ?? [], nextMorning: s.nextMorning, notes: s.notes, triggered: isTriggered(s) }));

  const active = inWeek.length > 0;
  const under = active ? GROUPS.filter((g) => groups[g].ratio !== null && (groups[g].ratio as number) < UNDER_RATIO).sort((a, b) => (groups[a].ratio as number) - (groups[b].ratio as number)) : [];
  const good = active ? GROUPS.filter((g) => groups[g].ratio !== null && (groups[g].ratio as number) >= GOOD_RATIO) : [];

  const sum: WeekSummary = {
    weekStart: ws, weekEnd: we, sessions: inWeek, sessionsDone: inWeek.length,
    cardioDone: cardio.length, cardioMinutes: cardio.reduce((n, c) => n + (c.minutes || 0), 0),
    groups, missedWorkouts, skipped, pain, manualCount: inWeek.filter((s) => s.manual || s.exercises.length === 0).length,
    under, good, nextType: nextWorkout(state.sessions), verdict: [],
  };
  sum.verdict = verdictLines(sum);
  return sum;
}

function verb(gs: MuscleGroup[]): string {
  if (gs.length > 1) return 'עבדו';
  const g = GROUP_HE[gs[0]].g;
  return g === 'm' ? 'עבד' : g === 'f' ? 'עבדה' : 'עבדו';
}

/** שורות סיכום בעברית פשוטה */
export function verdictLines(s: WeekSummary): string[] {
  const out: string[] = [];
  if (s.sessionsDone === 0) out.push(`לא היו אימוני כוח השבוע. ממשיכים מאימון ${s.nextType}.`);
  else if (s.sessionsDone >= SESSIONS_TARGET) out.push(`${s.sessionsDone} מתוך ${SESSIONS_TARGET} אימוני כוח. שבוע מלא.`);
  else out.push(`${s.sessionsDone} מתוך ${SESSIONS_TARGET} אימוני כוח. האימון הבא: ${s.nextType}, כלומר ממשיכים מהאימון שנשאר.`);

  if (s.sessionsDone > 0) {
    const parts: string[] = [];
    if (s.under.length) parts.push(`פספסת ${groupsHe(s.under, true)}`);
    if (s.good.length) parts.push(`${groupsHe(s.good, true)} ${verb(s.good)} יפה`);
    if (!s.under.length && !parts.length) parts.push('כל קבוצות השרירים קיבלו את רוב הסטים');
    else if (!s.under.length) parts.unshift('אין קבוצה שנשארה מאחור');
    // שתי רשימות קצרות: פסיק ("פספסת רגליים וחזה, גב עבד יפה"); ארוכות: שני משפטים, כדי שלא יתערבבו
    const shortLists = s.under.length <= 2 && s.good.length <= 2;
    out.push(parts.join(shortLists ? ', ' : '. ') + '.');
  }
  out.push(s.cardioDone >= CARDIO_TARGET ? `אירובי: ${s.cardioDone} מתוך ${CARDIO_TARGET}, מצוין.` : `אירובי: ${s.cardioDone} מתוך ${CARDIO_TARGET}.`);
  const trig = s.pain.filter((p) => p.triggered).length;
  if (trig) out.push(`כאב 4 ומעלה או החמרה בבוקר ב־${trig} ${trig === 1 ? 'אימון' : 'אימונים'}. כלל הכאב קודם לכל התאמה.`);
  return out;
}

/* ---------- הצעה לשבוע הבא ---------- */

export interface Proposal {
  weekStart: string;
  until: string;
  priority: PriorityItem[];
  boosts: BoostItem[];
  /** קבוצות בפיגור שלא מקבלות סט נוסף, ולמה */
  boostBlocked: { group: MuscleGroup; why: string }[];
  /** קבוצות בפיגור שלא מוקדמות (ליבה, ידיים) */
  notMoved: MuscleGroup[];
  /** התרגילים שיוקדמו בכל אימון קרוב */
  moves: { workout: WorkoutId; names: string[] }[];
}

const short = (g: MuscleGroup, s: GroupStat) => `${GROUP_HE[g].he} בפיגור (${s.done}/${s.planned} סטים)`;

export function proposeAdjustment(state: AppState, sum: WeekSummary): Proposal {
  const until = addDays(sum.weekStart, 13);
  const priority: PriorityItem[] = sum.under.filter((g) => REORDER_GROUPS.includes(g)).slice(0, MAX_PRIORITY)
    .map((g) => ({ group: g, reason: short(g, sum.groups[g]) }));
  const notMoved = sum.under.filter((g) => !REORDER_GROUPS.includes(g));

  // אימונים קרובים: 3 הבאים ברוטציה, כל אחד בעמדה שלו בתוכנית
  const count = state.sessions.length;
  let t = nextWorkout(state.sessions);
  const upcoming: { workout: WorkoutId; pos: ReturnType<typeof programPosition> }[] = [];
  for (let j = 0; j < SESSIONS_TARGET; j++) { upcoming.push({ workout: t, pos: programPosition(count + j, state.settings.earlyDeloadFrom) }); t = ORDER[(ORDER.indexOf(t) + 1) % 3]; }

  const boosts: BoostItem[] = [];
  const boostBlocked: Proposal['boostBlocked'] = [];
  for (const g of sum.under) {
    const deficit = sum.groups[g].planned - sum.groups[g].done;
    const reasons = new Set<BoostBlock>();
    let taken = 0;
    if (LEG_GROUPS.includes(g) && !state.settings.legsCleared) reasons.add('legs');
    else {
      for (const u of upcoming) {
        for (const slot of WORKOUTS[u.workout].slots) {
          if (taken >= Math.min(MAX_BOOSTS_PER_GROUP, deficit) || boosts.length >= MAX_BOOSTS) break;
          const id = resolveExerciseId(state, slot, WORKOUTS[u.workout].slots).id;
          if (primaryGroup(id) !== g) continue;
          if (boosts.some((b) => b.workout === u.workout && b.slotId === slot.exerciseId)) continue;
          const block = boostBlock(state, slot, id, u.pos);
          if (block) { reasons.add(block); continue; }
          boosts.push({ workout: u.workout, slotId: slot.exerciseId, group: g, reason: `+1 סט: ${GROUP_HE[g].he} בפיגור` });
          taken++;
        }
      }
    }
    if (!taken) {
      const order: BoostBlock[] = ['general-pain', 'deload', 'intro', 'legs', 'pain', 'max'];
      const why = order.find((r) => reasons.has(r));
      boostBlocked.push({ group: g, why: why ? BOOST_BLOCK_HE[why] : boosts.length >= MAX_BOOSTS ? 'הגענו למקסימום של 3 סטים נוספים בשבוע' : 'אין תרגיל מתאים באימונים הקרובים' });
    }
  }

  const moves = upcoming.map((u) => {
    const slots = WORKOUTS[u.workout].slots;
    const names = orderByPriority(slots.map((slot) => ({ exerciseId: resolveExerciseId(state, slot, slots).id })), priority)
      .filter((o) => o.reason)
      .map((o) => findExercise(o.item.exerciseId)?.he ?? o.item.exerciseId);
    return { workout: u.workout, names };
  }).filter((m) => m.names.length > 0);

  return { weekStart: sum.weekStart, until, priority, boosts, boostBlocked, notMoved, moves };
}

export function weekLabel(ws: string): string { return `${formatShort(ws)}–${formatShort(weekEnd(ws))}`; }

/** יעד סטים שבועי לכל קבוצה לפי התוכנית (A+B+C) בעמדה נתונה, עם התרגילים שבפועל ייבחרו (חלופות/אישור רגליים) */
export function planGroupTargets(state: AppState, pos: ReturnType<typeof programPosition>): Record<MuscleGroup, number> {
  const out = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>;
  for (const w of ORDER) {
    const slots = WORKOUTS[w].slots;
    for (const slot of slots) out[primaryGroup(resolveExerciseId(state, slot, slots).id)] += targetSets(slot, pos).sets;
  }
  return out;
}
