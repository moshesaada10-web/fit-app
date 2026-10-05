import { beforeEach, describe, expect, it } from 'vitest';
import { ALTERNATIVES, EXERCISES, WORKOUTS, type WorkoutId } from '../src/data/plan';
import { GROUP_HE, MUSCLES, allExerciseIds, primaryGroup, type MuscleGroup } from '../src/data/muscles';
import { boostBlock, effectivePriority, orderByPriority, MAX_BOOSTS, MAX_BOOSTS_PER_GROUP } from '../src/logic/adjust';
import { detectPatterns, exerciseStats, pickAlternative } from '../src/logic/patterns';
import { nextWorkout, programPosition } from '../src/logic/rotation';
import { pendingReview, planGroupTargets, proposeAdjustment, reviewWeekFor, verdictLines, weekSummary } from '../src/logic/weekly';
import { buildDraft, planWorkout } from '../src/logic/workout';
import { actions, emptyState, getState, parseBackup } from '../src/store';
import type { AppState, Session, WeekAdjustment } from '../src/types';

let t = 1000;
/** אימון מלא לפי buildDraft; skip = קבוצות או slotId שלא בוצעו */
function done(st: AppState, date: string, type: WorkoutId, o: { skipGroups?: MuscleGroup[]; skipSlots?: string[]; pain?: Session['pain']; painTriggers?: string[] } = {}): Session {
  const d = buildDraft(st, type, date);
  const s: Session = {
    id: `x${t}`, date, type, createdAt: t++, deload: d.deload, pain: o.pain, painTriggers: o.painTriggers,
    exercises: d.exercises.map((e) => {
      const skip = o.skipGroups?.includes(primaryGroup(e.exerciseId)) || o.skipSlots?.includes(e.slotId);
      return { ...e, skipped: skip ? true : e.skipped, sets: skip ? [] : e.sets.map((x) => ({ ...x, r: e.repMin, done: true })) };
    }),
  };
  st.sessions.push(s);
  return s;
}
const base = () => { const st = emptyState(); st.settings.baselineDate = '2026-08-01'; return st; };
/** n אימונים מלאים ברוטציה, יום אחרי יום, מתאריך מסוים (להזזת העמדה בתוכנית) */
function history(st: AppState, n: number, from = '2026-06-01') {
  for (let i = 0; i < n; i++) {
    const d = new Date(2026, 5, 1 + i * 2, 12);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (iso < from) continue;
    done(st, iso, nextWorkout(st.sessions));
  }
}

describe('תיוג קבוצות שרירים', () => {
  it('כל תרגיל וכל חלופה מתויגים', () => {
    for (const id of allExerciseIds()) expect(MUSCLES[id]?.length, id).toBeGreaterThan(0);
    expect(Object.keys(EXERCISES).length + Object.values(ALTERNATIVES).flat().length).toBeGreaterThan(30);
  });
  it('קבוצה עיקרית הגיונית', () => {
    expect(primaryGroup('chest-press')).toBe('chest');
    expect(primaryGroup('lat-pulldown')).toBe('back');
    expect(primaryGroup('leg-curl')).toBe('hamstrings');
    expect(primaryGroup('alt-clamshell')).toBe('legs');
    expect(primaryGroup('side-plank')).toBe('core');
  });
  it('יעד שבועי לקבוצה נגזר מהתוכנית', () => {
    const st = base(); st.settings.legsCleared = true;
    const full = planGroupTargets(st, programPosition(12));
    expect(full.chest).toBe(6); // לחיצת חזה 3 + שיפוע 3
    expect(full.back).toBe(16); // חתירה 3+3, פולי 3+3, תמיכת חזה 4
    expect(full.hamstrings).toBe(6); // כפיפת ברך A+B
    expect(full.shoulders).toBe(3 + 3 + 3 + 4); // הרחקה A, לחיצת כתפיים, משיכה לפנים, הרחקה C
    const intro = planGroupTargets(st, programPosition(0));
    expect(intro.chest).toBe(4);
    // בלי אישור רגליים: כפיפת ברך מוחלפת ולכן אין יעד לירך אחורית
    expect(planGroupTargets(base(), programPosition(12)).hamstrings).toBe(0);
  });
});

describe('שבוע ראשון–שבת וזמן הסיכום', () => {
  it('מיום שישי מסכמים את השבוע הנוכחי, לפני כן את הקודם', () => {
    expect(reviewWeekFor('2026-10-08')).toBe('2026-09-27'); // חמישי
    expect(reviewWeekFor('2026-10-09')).toBe('2026-10-04'); // שישי
    expect(reviewWeekFor('2026-10-10')).toBe('2026-10-04'); // שבת
    expect(reviewWeekFor('2026-10-11')).toBe('2026-10-04'); // ראשון: השבוע שהסתיים
    expect(reviewWeekFor('2026-10-05')).toBe('2026-09-27');
  });
  it('כרטיס ממתין רק אם התוכנית התחילה ורק עד שמחליטים', () => {
    const st = base();
    expect(pendingReview(st, '2026-10-09')).toBeNull();
    done(st, '2026-10-05', 'A');
    expect(pendingReview(st, '2026-10-08')).toBeNull(); // השבוע הקודם, לפני שהתחיל
    expect(pendingReview(st, '2026-10-09')).toBe('2026-10-04');
    expect(pendingReview(st, '2026-10-12')).toBe('2026-10-04'); // לא נצפה: עדיין מופיע אחרי שהשבוע נגמר
    st.reviews['2026-10-04'] = { decision: 'ack', at: '2026-10-09' };
    expect(pendingReview(st, '2026-10-10')).toBeNull();
    expect(pendingReview(st, '2026-10-12')).toBeNull();
  });
});

describe('סיכום שבועי', () => {
  it('שבוע מלא: 3/3, כל הקבוצות 100%', () => {
    const st = base();
    done(st, '2026-10-04', 'A'); done(st, '2026-10-06', 'B'); done(st, '2026-10-08', 'C');
    const s = weekSummary(st, '2026-10-04');
    expect(s.sessionsDone).toBe(3);
    expect(s.under).toEqual([]);
    expect(s.groups.chest).toMatchObject({ planned: 4, done: 4, ratio: 1 });
    expect(s.verdict[0]).toContain('שבוע מלא');
  });
  it('פספס חזה ורגליים, גב עבד יפה', () => {
    const st = base();
    for (const [d, w] of [['2026-10-04', 'A'], ['2026-10-06', 'B'], ['2026-10-08', 'C']] as const) done(st, d, w, { skipGroups: ['chest', 'legs'] });
    const s = weekSummary(st, '2026-10-04');
    expect(s.under).toEqual(['chest', 'legs']);
    expect(s.good).toContain('back');
    expect(s.verdict[1]).toMatch(/^פספסת חזה ורגליים. /);
    expect(s.verdict[1]).toContain('גב');
    expect(s.skipped.map((k) => k.slotId)).toContain('chest-press');
  });
  it('הדוגמה של משה: "פספסת רגליים וחזה, גב עבד יפה"', () => {
    const st = base();
    done(st, '2026-10-04', 'A');
    const s = { ...weekSummary(st, '2026-10-04'), under: ['legs', 'chest'] as MuscleGroup[], good: ['back'] as MuscleGroup[] };
    expect(verdictLines(s)[1]).toBe('פספסת רגליים וחזה, גב עבד יפה.');
    expect(verdictLines({ ...s, good: ['core'] })[1]).toBe('פספסת רגליים וחזה, ליבה עבדה יפה.');
    expect(verdictLines({ ...s, under: [], good: ['shoulders'] })[1]).toBe('אין קבוצה שנשארה מאחור, כתפיים עבדו יפה.');
  });
  it('ניסוח לפי מין: "גב עבד יפה"', () => {
    const st = base();
    done(st, '2026-10-04', 'A', { skipGroups: ['chest', 'legs', 'shoulders', 'core'] });
    done(st, '2026-10-06', 'B', { skipGroups: ['chest', 'legs', 'shoulders', 'core'] });
    done(st, '2026-10-08', 'C', { skipGroups: ['chest', 'legs', 'shoulders', 'core', 'arms'] });
    expect(weekSummary(st, '2026-10-04').verdict[1]).toBe('פספסת חזה, כתפיים, רגליים, ידיים וליבה. גב עבד יפה.');
  });
  it('אימון שלם חסר: נספר כמתוכנן, והשבוע הבא מתחיל בו (הרוטציה לא משתנה)', () => {
    const st = base();
    done(st, '2026-10-04', 'A'); done(st, '2026-10-06', 'B');
    const s = weekSummary(st, '2026-10-04');
    expect(s.missedWorkouts).toEqual(['C']);
    expect(s.nextType).toBe('C');
    expect(s.groups.arms.planned).toBe(4);
    expect(s.groups.arms.done).toBe(0);
    expect(s.under).toContain('arms');
    expect(s.verdict[0]).toContain('האימון הבא: C');
  });
  it('אימון שנרשם בדיעבד בלי פירוט נספר לפי התוכנית', () => {
    const st = base();
    st.sessions.push({ id: 'm', date: '2026-10-05', type: 'A', createdAt: 1, exercises: [], manual: true });
    const s = weekSummary(st, '2026-10-04');
    expect(s.manualCount).toBe(1);
    expect(s.groups.chest.done).toBe(2);
  });
  it('אירובי והערות כאב', () => {
    const st = base();
    done(st, '2026-10-04', 'A', { pain: { back: 5, shin: 0, knee: 0 }, painTriggers: ['chest-press'] });
    st.cardio.push({ id: 'c1', date: '2026-10-05', type: 'bike', minutes: 30, effort: 3, easy: true, createdAt: 1 });
    st.cardio.push({ id: 'c0', date: '2026-10-03', type: 'bike', minutes: 30, effort: 3, easy: true, createdAt: 0 }); // שבוע קודם
    const s = weekSummary(st, '2026-10-04');
    expect(s.cardioDone).toBe(1);
    expect(s.pain).toHaveLength(1);
    expect(s.pain[0].triggered).toBe(true);
    expect(s.verdict.join(' ')).toContain('כלל הכאב');
  });
  it('שבוע בלי אימונים: אין "פספסת" ואין הצעה', () => {
    const st = base();
    done(st, '2026-09-28', 'A');
    const s = weekSummary(st, '2026-10-04');
    expect(s.under).toEqual([]);
    expect(s.verdict[0]).toContain('לא היו אימוני כוח');
    expect(proposeAdjustment(st, s).priority).toEqual([]);
  });
});

describe('סידור מחדש', () => {
  const items = WORKOUTS.A.slots.map((s) => ({ exerciseId: s.exerciseId }));
  it('קבוצות בעדיפות עוברות להתחלה, בסדר העדיפות, השאר בסדר המקורי', () => {
    const r = orderByPriority(items, [{ group: 'shoulders', reason: 'x' }, { group: 'back', reason: 'y' }]);
    expect(r.map((x) => x.item.exerciseId)).toEqual(['lateral-raise', 'seated-row', 'lat-pulldown', 'chest-press', 'leg-press', 'leg-curl', 'bird-dog', 'side-plank']);
    expect(r[0].reason).toBe('x');
    expect(r[3].reason).toBeUndefined();
  });
  it('ליבה וידיים לא מוקדמות לעולם', () => {
    const r = orderByPriority(items, [{ group: 'core', reason: 'x' }, { group: 'arms', reason: 'y' }]);
    expect(r.map((x) => x.item.exerciseId)).toEqual(items.map((i) => i.exerciseId));
  });
  it('בלי עדיפות: אין שינוי', () => {
    expect(orderByPriority(items, []).map((x) => x.origIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  const adj = (p: Partial<WeekAdjustment> = {}): WeekAdjustment => ({ fromWeek: '2026-10-04', approvedOn: '2026-10-09', until: '2026-10-17', priority: [{ group: 'legs', reason: 'רגליים וישבן בפיגור (0/12 סטים)' }], boosts: [], ...p });
  it('התאמה פעילה מסדרת את האימון ושומרת סיבה לתג; פג תוקף = חזרה לתוכנית', () => {
    const st = base();
    st.adjustment = adj();
    const on = planWorkout(st, 'A', '2026-10-12');
    expect(on.slice(0, 2).map((p) => p.exerciseId)).toEqual(['alt-glute-bridge', 'alt-clamshell']);
    expect(on[0].moved).toContain('רגליים');
    const d = buildDraft(st, 'A', '2026-10-12');
    expect(d.exercises[0].moved).toContain('בפיגור');
    expect(d.exercises.find((e) => e.slotId === 'chest-press')!.moved).toBeUndefined();
    expect(planWorkout(st, 'A', '2026-10-18')[0].exerciseId).toBe('chest-press'); // אחרי שבוע
    expect(planWorkout(st, 'A', '2026-10-08')[0].exerciseId).toBe('chest-press'); // לפני האישור
  });
  it('הרוטציה לא מושפעת מהתאמה', () => {
    const st = base();
    done(st, '2026-10-04', 'A'); done(st, '2026-10-06', 'B');
    st.adjustment = adj();
    expect(nextWorkout(st.sessions)).toBe('C');
  });
  it('עדיפות קבועה חלה תמיד, אחרי השבועית', () => {
    const st = base();
    st.permanent = [{ id: 'p', kind: 'priority', group: 'chest', createdOn: '2026-10-01' }];
    st.adjustment = adj();
    expect(effectivePriority(st, '2026-10-12').map((p) => p.group)).toEqual(['legs', 'chest']);
    expect(effectivePriority(st, '2026-11-01').map((p) => p.group)).toEqual(['chest']);
    expect(planWorkout(st, 'C', '2026-11-01')[0].exerciseId).toBe('incline-press');
    expect(planWorkout(st, 'B', '2026-11-01').map((p) => p.exerciseId)[0]).toBe('chest-supported-row'); // אין חזה ב-B
  });
});

describe('סט נוסף: תקרות וכללי בטיחות', () => {
  const C = WORKOUTS.C.slots;
  const lat = C.find((s) => s.exerciseId === 'lateral-raise')!; // 4 סטים בתוכנית
  const inc = C.find((s) => s.exerciseId === 'incline-press')!; // 3 סטים
  it('מותר רק מתחת למקסימום התוכנית', () => {
    const st = base();
    expect(boostBlock(st, lat, 'lateral-raise', programPosition(9))).toBeNull(); // שבוע 4: 3 מתוך 4
    expect(boostBlock(st, inc, 'incline-press', programPosition(9))).toBe('max');
    expect(boostBlock(st, lat, 'lateral-raise', programPosition(12))).toBe('max'); // שבוע 5: כבר 4
  });
  it('לא בשבוע קל ולא בהיכרות', () => {
    const st = base();
    expect(boostBlock(st, lat, 'lateral-raise', programPosition(15))).toBe('deload');
    expect(boostBlock(st, lat, 'lateral-raise', programPosition(9, 9))).toBe('deload'); // שבוע קל שהוקדם
    expect(boostBlock(st, lat, 'lateral-raise', programPosition(2))).toBe('intro');
  });
  it('לא לרגליים בלי אישור', () => {
    const st = base();
    const lp = WORKOUTS.A.slots.find((s) => s.exerciseId === 'leg-press')!;
    expect(boostBlock(st, lp, 'alt-glute-bridge', programPosition(9))).toBe('legs');
  });
  it('לא לתרגיל שמסומן בכלל הכאב', () => {
    const st = base();
    st.sessions.push({ id: 'p', date: '2026-10-01', type: 'C', createdAt: 1, pain: { back: 5, shin: 0, knee: 0 }, painTriggers: ['lateral-raise'],
      exercises: [{ slotId: 'lateral-raise', exerciseId: 'lateral-raise', repMin: 12, repMax: 15, plannedSets: 3, sets: [{ w: 4, r: 12, done: true }] }] });
    st.sessions.push({ id: 'q', date: '2026-10-03', type: 'A', createdAt: 2, pain: { back: 1, shin: 0, knee: 0 }, exercises: [] });
    expect(boostBlock(st, lat, 'lateral-raise', programPosition(9))).toBe('pain');
  });

  /** 9 אימונים מלאים (שבוע 4 בתוכנית) ואז שבוע עם דילוגים */
  function week4(skip: MuscleGroup[], legsCleared = false) {
    const st = base(); st.settings.legsCleared = legsCleared;
    history(st, 8);
    for (const [d, w] of [['2026-10-04', 'C'], ['2026-10-06', 'A'], ['2026-10-08', 'B']] as const) {
      expect(nextWorkout(st.sessions)).toBe(w);
      done(st, d, w, { skipGroups: skip });
    }
    return st;
  }
  it('הצעה: כתפיים בפיגור → +1 סט בהרחקת כתפיים ב-C; חזה במקסימום; רגליים בלי אישור', () => {
    const st = week4(['chest', 'legs', 'shoulders']);
    expect(st.sessions.length).toBe(11);
    const sum = weekSummary(st, '2026-10-04');
    const p = proposeAdjustment(st, sum);
    expect(p.priority.map((x) => x.group)).toEqual(['chest', 'shoulders']); // 2 לכל היותר, לפי הפיגור
    expect(p.boosts).toEqual([expect.objectContaining({ workout: 'C', slotId: 'lateral-raise', group: 'shoulders' })]);
    expect(p.boostBlocked.find((b) => b.group === 'chest')!.why).toContain('מקסימום');
    expect(p.boostBlocked.find((b) => b.group === 'legs')!.why).toContain('אישור');
    expect(p.until).toBe('2026-10-17');
  });
  it('תקרה: לכל היותר 2 לקבוצה ו-3 בסך הכול', () => {
    const st = week4(['back', 'shoulders', 'chest', 'legs', 'core', 'arms'], true);
    const p = proposeAdjustment(st, weekSummary(st, '2026-10-04'));
    expect(p.boosts.length).toBeLessThanOrEqual(MAX_BOOSTS);
    for (const g of ['back', 'shoulders'] as MuscleGroup[]) expect(p.boosts.filter((b) => b.group === g).length).toBeLessThanOrEqual(MAX_BOOSTS_PER_GROUP);
    // לא מעל מקסימום התוכנית
    for (const b of p.boosts) {
      const slot = WORKOUTS[b.workout].slots.find((s) => s.exerciseId === b.slotId)!;
      expect(slot.sets).toBeGreaterThan(3);
    }
  });
  it('בבניית האימון: סט נוסף פעם אחת בלבד, ולא בשבוע קל', () => {
    const st = week4(['shoulders']);
    const p = proposeAdjustment(st, weekSummary(st, '2026-10-04'));
    st.adjustment = { fromWeek: '2026-10-04', approvedOn: '2026-10-09', until: p.until, priority: p.priority, boosts: p.boosts };
    const d = buildDraft(st, 'C', '2026-10-11');
    const lr = d.exercises.find((e) => e.slotId === 'lateral-raise')!;
    expect(lr.plannedSets).toBe(4);
    expect(lr.boosted).toContain('+1');
    expect(lr.sets).toHaveLength(4);
    // אחרי שבוצע, לא שוב באותה התאמה
    st.sessions.push({ id: 'z', date: '2026-10-11', type: 'C', createdAt: 99999, exercises: d.exercises });
    expect(planWorkout(st, 'C', '2026-10-15').find((x) => x.slot.exerciseId === 'lateral-raise')!.boost).toBeUndefined();
    // שבוע קל שהוקדם: בלי סט נוסף גם אם אושר
    const st2 = week4(['shoulders']);
    st2.adjustment = st.adjustment;
    st2.settings.earlyDeloadFrom = st2.sessions.length;
    const d2 = buildDraft(st2, 'C', '2026-10-11');
    expect(d2.exercises.find((e) => e.slotId === 'lateral-raise')!.boosted).toBeUndefined();
    expect(d2.deload).toBe(true);
  });
});

describe('דפוסים ארוכי טווח', () => {
  /** 4 שבועות, בכל שבוע A,B,C; מדלג על לחיצת חזה */
  function fourWeeks(skipSlots: string[] = ['chest-press'], skipGroups: MuscleGroup[] = []) {
    const st = base();
    const weeks = ['2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04'];
    for (const w of weeks) {
      const [y, m, d] = w.split('-').map(Number);
      for (let k = 0; k < 3; k++) {
        const dt = new Date(y, m - 1, d + k * 2, 12);
        const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        done(st, iso, nextWorkout(st.sessions), { skipSlots, skipGroups });
      }
    }
    return st;
  }
  it('פחות מ-3 שבועות: אין דפוסים', () => {
    const st = base();
    done(st, '2026-09-28', 'A'); done(st, '2026-10-05', 'B');
    expect(detectPatterns(st, '2026-10-04', '2026-10-09').enough).toBe(false);
  });
  it('אחוז השלמה לפי תרגיל', () => {
    const st = fourWeeks();
    const stats = exerciseStats(st, '2026-09-13', '2026-10-10');
    const cp = stats.find((s) => s.slotId === 'chest-press')!;
    expect(cp).toMatchObject({ appearances: 4, done: 0, skipped: 4, rate: 0 });
    expect(stats.find((s) => s.slotId === 'seated-row')!.rate).toBe(1);
    expect(stats[0].slotId).toBe('chest-press'); // הנמוך ביותר ראשון
  });
  it('מדלג הרבה → הצעה להחלפה קבועה; חזה בפיגור קבוע → הצעה להשאיר ראשון', () => {
    const st = fourWeeks();
    const p = detectPatterns(st, '2026-10-04', '2026-10-09');
    expect(p.enough).toBe(true);
    const swap = p.suggestions.find((s) => s.kind === 'swap');
    expect(swap).toMatchObject({ slotId: 'chest-press', altId: 'alt-incline-machine' });
    expect(swap!.text).toContain('לחיצת חזה במכונה');
    const pr = p.suggestions.find((s) => s.kind === 'priority');
    expect(pr).toMatchObject({ group: 'chest' });
  });
  it('החלפה מעדיפה חלופה שכבר ביצע', () => {
    const st = base();
    expect(pickAlternative(st, 'chest-press', { slotId: 'chest-press', appearances: 4, done: 2, skipped: 2, rate: 0.5, performed: { 'alt-cable-fly': 2 }, extraSets: 0 })).toBe('alt-cable-fly');
    // בלי אישור: חלופה תלוית אישור לא מוצעת
    expect(pickAlternative(st, 'leg-curl')).toBe('alt-glute-bridge');
  });
  it('אישור קבוע, דחייה וביטול', () => {
    const st = fourWeeks();
    actions.importAll(st);
    actions.applyPermanentPriority('chest', '2026-10-09');
    actions.applyPermanentSwap('chest-press', 'alt-incline-machine', '2026-10-09');
    let s = getState();
    expect(s.swapPrefs['chest-press']).toBe('alt-incline-machine');
    expect(s.permanent).toHaveLength(2);
    const p = detectPatterns(s, '2026-10-04', '2026-10-09');
    expect(p.suggestions.find((x) => x.kind === 'priority')).toBeUndefined();
    expect(planWorkout(s, 'C', '2026-10-20')[0].exerciseId).toBe('incline-press');
    // ביטול מחזיר את המצב הקודם
    for (const c of s.permanent) actions.undoPermanent(c.id);
    s = getState();
    expect(s.swapPrefs['chest-press']).toBeUndefined();
    expect(s.permanent).toHaveLength(0);
    // דחייה: לא מוצע שוב 4 שבועות
    const id = detectPatterns(s, '2026-10-04', '2026-10-09').suggestions.find((x) => x.kind === 'priority')!.id;
    actions.dismissSuggestion(id, '2026-10-09');
    expect(detectPatterns(getState(), '2026-10-04', '2026-10-20').suggestions.some((x) => x.id === id)).toBe(false);
    expect(detectPatterns(getState(), '2026-10-04', '2026-11-07').suggestions.some((x) => x.id === id)).toBe(true);
  });
  it('תרגיל שמדלגים עליו בגלל כאב: לא מציעים החלפה לבד', () => {
    const st = fourWeeks();
    const last = st.sessions[st.sessions.length - 3]; // A בשבוע האחרון
    expect(last.type).toBe('A');
    last.pain = { back: 5, shin: 0, knee: 0 }; last.painTriggers = ['chest-press'];
    last.exercises.find((e) => e.slotId === 'chest-press')!.skipped = false;
    last.exercises.find((e) => e.slotId === 'chest-press')!.sets = [{ w: 30, r: 8, done: true }];
    for (const s of st.sessions.slice(-2)) s.pain = { back: 5, shin: 0, knee: 0 };
    const p = detectPatterns(st, '2026-10-04', '2026-10-09');
    expect(p.suggestions.some((s) => s.kind === 'swap' && s.slotId === 'chest-press')).toBe(false);
    expect(p.suggestions.some((s) => s.id === 'info-pain:chest-press')).toBe(true);
  });
  it('ליבה בפיגור קבוע: הערה בלבד, בלי הקדמה', () => {
    const st = fourWeeks([], ['core']);
    const p = detectPatterns(st, '2026-10-04', '2026-10-09');
    expect(p.suggestions.some((s) => s.kind === 'priority' && s.group === 'core')).toBe(false);
    expect(p.suggestions.some((s) => s.id === 'info-behind:core')).toBe(true);
    expect(GROUP_HE.core.he).toBe('ליבה');
  });
});

describe('גיבוי והגירה', () => {
  beforeEach(() => actions.resetAll());
  it('גיבוי ישן בלי השדות החדשים מקבל ברירות מחדל', () => {
    const old = { version: 1, settings: {}, sessions: [], cardio: [], body: [], daily: {}, draft: null, swapPrefs: { 'chest-press': 'alt-cable-fly' } };
    const s = parseBackup(JSON.stringify(old));
    expect(s.reviews).toEqual({});
    expect(s.adjustment).toBeNull();
    expect(s.permanent).toEqual([]);
    expect(s.dismissedSuggestions).toEqual({});
    expect(s.swapPrefs['chest-press']).toBe('alt-cable-fly');
  });
  it('ערכים פגומים מסוננים, תקינים נשמרים', () => {
    const s = parseBackup(JSON.stringify({
      version: 1, sessions: [], cardio: [], body: [],
      reviews: { '2026-10-04': { decision: 'approved', at: '2026-10-09' }, bad: { decision: 'x' } },
      adjustment: { fromWeek: '2026-10-04', approvedOn: '2026-10-09', until: '2026-10-17', priority: [{ group: 'chest', reason: 'r' }, { group: 'nope', reason: 'r' }], boosts: [{ workout: 'C', slotId: 'lateral-raise', group: 'shoulders', reason: 'r' }, { workout: 'Z' }] },
      permanent: [{ id: '1', kind: 'priority', group: 'chest', createdOn: '2026-10-09' }, { id: '2', kind: 'swap', createdOn: '2026-10-09' }, 'junk'],
      dismissedSuggestions: { a: '2026-10-09', b: 5 },
    }));
    expect(Object.keys(s.reviews)).toEqual(['2026-10-04']);
    expect(s.adjustment!.priority).toHaveLength(1);
    expect(s.adjustment!.boosts).toHaveLength(1);
    expect(s.permanent.map((c) => c.id)).toEqual(['1']);
    expect(s.dismissedSuggestions).toEqual({ a: '2026-10-09' });
    expect(parseBackup(JSON.stringify({ ...s, adjustment: { fromWeek: 'x' } })).adjustment).toBeNull();
  });
  it('ייצוא/ייבוא שומר את הסיכומים וההתאמות', () => {
    actions.approveReview('2026-10-04', { fromWeek: '2026-10-04', until: '2026-10-17', priority: [{ group: 'legs', reason: 'r' }], boosts: [] }, '2026-10-09');
    actions.applyPermanentPriority('chest', '2026-10-09');
    const round = parseBackup(JSON.stringify({ app: 'moshe-fitness', data: getState() }));
    expect(round.reviews['2026-10-04'].decision).toBe('approved');
    expect(round.adjustment).toMatchObject({ approvedOn: '2026-10-09', until: '2026-10-17' });
    expect(round.permanent[0].group).toBe('chest');
    actions.reopenReview('2026-10-04');
    expect(getState().adjustment).toBeNull();
    expect(getState().reviews['2026-10-04']).toBeUndefined();
  });
});
