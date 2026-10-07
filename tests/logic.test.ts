import { describe, expect, it } from 'vitest';
import { WORKOUTS } from '../src/data/plan';
import { nextWorkout, programPosition, targetSets, cardioTarget, intervalsAllowed } from '../src/logic/rotation';
import { suggestProgression, roundToStep, type HistoryEntry } from '../src/logic/progression';
import { adviceAfterWorkout, exercisePain, generalPain, isTriggered } from '../src/logic/pain';
import { isPlateau, movingAverage, trendStatus, weeklySeries, goalReached } from '../src/logic/body';
import { buildDraft } from '../src/logic/workout';
import { emptyState, parseBackup } from '../src/store';
import { addDays, weekStart } from '../src/logic/dates';
import type { ExLog, Session } from '../src/types';

let t = 0;
const sess = (date: string, type: 'A' | 'B' | 'C', extra: Partial<Session> = {}): Session => ({ id: `s${t}`, date, type, createdAt: t++, exercises: [], ...extra });

describe('סיבוב אימונים לפי רצף', () => {
  it('מתחיל ב-A', () => expect(nextWorkout([])).toBe('A'));
  it('A→B→C→A', () => {
    expect(nextWorkout([sess('2026-10-01', 'A')])).toBe('B');
    expect(nextWorkout([sess('2026-10-01', 'A'), sess('2026-10-03', 'B')])).toBe('C');
    expect(nextWorkout([sess('2026-10-01', 'C')])).toBe('A');
  });
  it('שבוע עם 2 אימונים בלבד: השבוע הבא מתחיל מהשלישי', () => {
    const s = [sess('2026-09-20', 'A'), sess('2026-09-22', 'B')];
    expect(nextWorkout(s)).toBe('C');
    // גם אם עובר שבוע שלם בלי אימון, האימון הבא נשאר C
    expect(nextWorkout(s)).toBe('C');
  });
  it('הסדר לפי התאריך האחרון, לא לפי סדר ההוספה', () => {
    const s = [sess('2026-10-03', 'B'), sess('2026-10-01', 'A')];
    expect(nextWorkout(s)).toBe('C');
  });
  it('רישום בדיעבד של אימון מוקדם לא משנה את ההמשך', () => {
    const s = [sess('2026-10-01', 'A'), sess('2026-10-03', 'B'), sess('2026-09-28', 'C')];
    expect(nextWorkout(s)).toBe('C');
  });
});

describe('שבוע קל לפי מספר אימוני כוח שהושלמו', () => {
  it('3 אימונים = שבוע', () => {
    expect(programPosition(0).week).toBe(1);
    expect(programPosition(2).week).toBe(1);
    expect(programPosition(3).week).toBe(2);
    expect(programPosition(14).week).toBe(5);
  });
  it('שבוע 6 הוא אחרי 15 אימונים, עד 17 (כל 18 אימונים = 6 שבועות)', () => {
    expect(programPosition(14).deload).toBe(false);
    expect(programPosition(15).deload).toBe(true);
    expect(programPosition(15).week).toBe(6);
    expect(programPosition(17).deload).toBe(true);
    expect(programPosition(18).deload).toBe(false);
    expect(programPosition(18).week).toBe(7);
  });
  it('שבוע 12 הוא אחרי 33 אימונים', () => {
    expect(programPosition(32).deload).toBe(false);
    expect(programPosition(33).deload).toBe(true);
    expect(programPosition(33).week).toBe(12);
    expect(programPosition(35).deload).toBe(true);
    const next = programPosition(36);
    expect(next.deload).toBe(false);
    expect(next.cycle).toBe(1);
    expect(next.week).toBe(1);
    expect(next.intro).toBe(false);
  });
  it('לא תלוי בתאריכים: אותו מספר אימונים, אותו שבוע', () => {
    const a = programPosition([sess('2026-01-01', 'A'), sess('2026-01-02', 'B'), sess('2026-06-01', 'C')].length);
    expect(a.week).toBe(2);
  });
  it('כמה אימונים נשארו עד שבוע קל', () => {
    expect(programPosition(0).untilDeload).toBe(15);
    expect(programPosition(12).untilDeload).toBe(3);
    expect(programPosition(15).untilDeload).toBe(0);
    expect(programPosition(18).untilDeload).toBe(15);
  });
  it('הקדמת שבוע קל: 3 אימונים בלבד', () => {
    expect(programPosition(7, 7).deload).toBe(true);
    expect(programPosition(9, 7).deload).toBe(true);
    expect(programPosition(10, 7).deload).toBe(false);
    expect(programPosition(6, 7).deload).toBe(false);
  });
  it('סטים: 2 בהיכרות, הדרגתי משבוע 3, כ-40% פחות בשבוע קל', () => {
    const slot3 = { exerciseId: 'x', sets: 3, repMin: 8, repMax: 12 };
    const slot4 = { ...slot3, sets: 4 };
    expect(targetSets(slot3, programPosition(0)).sets).toBe(2);
    expect(targetSets(slot4, programPosition(3)).sets).toBe(2);
    expect(targetSets(slot3, programPosition(6))).toEqual({ sets: 3, optionalLast: true });
    expect(targetSets(slot3, programPosition(9)).sets).toBe(3);
    expect(targetSets(slot4, programPosition(9)).sets).toBe(3); // שבוע 4
    expect(targetSets(slot4, programPosition(12)).sets).toBe(4); // שבוע 5: המספר המלא
    expect(targetSets(slot4, programPosition(21)).sets).toBe(4);
    expect(targetSets(slot3, programPosition(15)).sets).toBe(2);
    expect(targetSets(slot4, programPosition(15)).sets).toBe(2);
    expect(targetSets({ ...slot3, sets: 2 }, programPosition(15)).sets).toBe(2);
  });
  it('אירובי: 25→40 ואינטרוולים רק אחרי שבוע 8', () => {
    expect(cardioTarget(programPosition(0)).min).toBe(25);
    expect(cardioTarget(programPosition(6)).min).toBe(30);
    expect(cardioTarget(programPosition(24)).min).toBe(40);
    expect(cardioTarget(programPosition(15))).toEqual({ min: 25, max: 25, easy: true });
    expect(intervalsAllowed(programPosition(21))).toBe(false); // שבוע 8
    expect(intervalsAllowed(programPosition(24))).toBe(true); // שבוע 9
    expect(intervalsAllowed(programPosition(33))).toBe(false); // שבוע קל
  });
});

const log = (date: string, w: number, reps: number[], extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
  date, slotId: 'x', exerciseId: 'x', repMin: 8, repMax: 12, plannedSets: reps.length,
  sets: reps.map((r) => ({ w, r, done: true })), ...extra,
});
const base = { step: 2.5, repMin: 8, repMax: 12, isDeloadNow: false, bodyweight: false, unit: 'reps' as const };

describe('הצעת התקדמות', () => {
  it('בלי היסטוריה: מתחילים קל', () => {
    const s = suggestProgression({ ...base, history: [] });
    expect(s.kind).toBe('start');
    expect(s.weight).toBeNull();
  });
  it('אימון אחד בקצה העליון: עוד לא מעלים', () => {
    const s = suggestProgression({ ...base, history: [log('2026-10-01', 40, [12, 12, 12])] });
    expect(s.kind).toBe('hold');
    expect(s.weight).toBe(40);
  });
  it('קצה עליון בכל הסטים ב-2 אימונים: מדרגה קטנה אחת', () => {
    const s = suggestProgression({ ...base, history: [log('2026-10-01', 40, [12, 12, 12]), log('2026-10-03', 40, [12, 12, 12])] });
    expect(s.kind).toBe('increase');
    expect(s.weight).toBe(42.5);
    expect(s.reps).toBe(8);
  });
  it('סט אחד לא הגיע לקצה: אין העלאה', () => {
    const s = suggestProgression({ ...base, history: [log('a', 40, [12, 12, 12]), log('b', 40, [12, 12, 11])] });
    expect(s.kind).toBe('hold');
    expect(s.weight).toBe(40);
  });
  it('אם המשקל השתנה בין האימונים, לא מעלים', () => {
    const s = suggestProgression({ ...base, history: [log('a', 37.5, [12, 12, 12]), log('b', 40, [12, 12, 12])] });
    expect(s.kind).toBe('hold');
  });
  it('שבוע קל: 10% פחות, מעוגל למדרגה', () => {
    const s = suggestProgression({ ...base, isDeloadNow: true, history: [log('a', 40, [10, 10, 10])] });
    expect(s.kind).toBe('deload');
    expect(s.weight).toBe(roundToStep(36, 2.5));
    expect(s.weight).toBe(35);
  });
  it('אחרי שבוע קל: חוזרים למשקל לפני, לא מעבר, גם אם הושג קצה עליון', () => {
    const s = suggestProgression({ ...base, history: [log('a', 40, [12, 12, 12]), log('b', 40, [12, 12, 12]), log('c', 35, [12, 12], { deload: true })] });
    expect(s.kind).toBe('return');
    expect(s.weight).toBe(40);
  });
  it('שבוע קל לא נספר כאחד משני האימונים להעלאה', () => {
    const s = suggestProgression({ ...base, history: [log('a', 40, [12, 12, 12]), log('b', 35, [12, 12], { deload: true }), log('c', 40, [12, 12, 12])] });
    // לפני c היה דלוד, אבל האחרון הוא רגיל; שני האחרונים הרגילים (a,c) בקצה העליון באותו משקל
    expect(s.kind).toBe('increase');
    expect(s.weight).toBe(42.5);
  });
  it('אחרי כאב: משקל קל יותר במדרגה אחת', () => {
    const s = suggestProgression({ ...base, painLevel: 'reduce', history: [log('a', 40, [10, 10, 10])] });
    expect(s.kind).toBe('reduce');
    expect(s.weight).toBe(37.5);
  });
  it('תרגיל מושהה: אין הצעה', () => {
    const s = suggestProgression({ ...base, painLevel: 'pause', history: [log('a', 40, [10, 10, 10])] });
    expect(s.kind).toBe('paused');
    expect(s.weight).toBeNull();
  });
  it('משקל גוף: בלי משקל, מציע חזרות', () => {
    const s = suggestProgression({ ...base, bodyweight: true, history: [log('a', 0, [8, 9, 9])] });
    expect(s.kind).toBe('hold');
    expect(s.weight).toBeNull();
  });
});

describe('כלל הכאב', () => {
  const ex = (slotId: string): ExLog => ({ slotId, exerciseId: slotId, repMin: 8, repMax: 12, plannedSets: 3, sets: [{ w: 10, r: 10, done: true }] });
  it('4 ומעלה, או החמרה בבוקר, מפעילים את הכלל', () => {
    expect(isTriggered({ pain: { back: 3, shin: 3, knee: 3 } })).toBe(false);
    expect(isTriggered({ pain: { back: 4, shin: 0, knee: 0 } })).toBe(true);
    expect(isTriggered({ pain: { back: 0, shin: 0, knee: 0 }, nextMorning: 'worse' })).toBe(true);
    expect(isTriggered({ pain: { back: 0, shin: 0, knee: 0 }, nextMorning: 'same' })).toBe(false);
  });
  it('פעם אחת: סט אחד פחות וקל יותר', () => {
    const s = [sess('2026-10-01', 'A', { exercises: [ex('chest-press')], pain: { back: 5, shin: 0, knee: 0 }, painTriggers: ['chest-press'] })];
    expect(exercisePain(s, 'chest-press').level).toBe('reduce');
    expect(exercisePain(s, 'seated-row').level).toBe('none');
  });
  it('שני אימונים ברציפות עם אותו תרגיל מסומן: השהיה', () => {
    const s = [
      sess('2026-10-01', 'A', { exercises: [ex('chest-press')], pain: { back: 5, shin: 0, knee: 0 }, painTriggers: ['chest-press'] }),
      sess('2026-10-03', 'C', { exercises: [ex('chest-press')], pain: { back: 4, shin: 0, knee: 0 }, painTriggers: ['chest-press'] }),
    ];
    expect(exercisePain(s, 'chest-press').level).toBe('pause');
    expect(generalPain(s).level).toBe('pause');
  });
  it('אימון נקי באמצע מאפס את הספירה', () => {
    const s = [
      sess('2026-10-01', 'A', { exercises: [ex('chest-press')], pain: { back: 6, shin: 0, knee: 0 }, painTriggers: ['chest-press'] }),
      sess('2026-10-03', 'C', { exercises: [ex('chest-press')], pain: { back: 1, shin: 0, knee: 0 } }),
    ];
    expect(exercisePain(s, 'chest-press').level).toBe('none');
    expect(generalPain(s).level).toBe('none');
  });
  it('אישור המשך אחרי השהיה מאפס', () => {
    const s = [
      sess('2026-10-01', 'A', { exercises: [ex('chest-press')], pain: { back: 5, shin: 0, knee: 0 }, painTriggers: ['chest-press'] }),
      sess('2026-10-03', 'C', { exercises: [ex('chest-press')], pain: { back: 5, shin: 0, knee: 0 }, painTriggers: ['chest-press'] }),
    ];
    expect(exercisePain(s, 'chest-press', '2026-10-04').level).toBe('none');
  });
  it('ניסוח ההמלצה', () => {
    expect(adviceAfterWorkout({ back: 2, shin: 0, knee: 0 }, false, 0).level).toBe('ok');
    expect(adviceAfterWorkout({ back: 5, shin: 0, knee: 0 }, true, 1).level).toBe('reduce');
    expect(adviceAfterWorkout({ back: 5, shin: 0, knee: 0 }, true, 2).level).toBe('pause');
  });
});

describe('בניית אימון', () => {
  it('שבועות 1-2: 2 סטים; רגליים מוחלפות בלי אישור', () => {
    const st = emptyState();
    const d = buildDraft(st, 'A', '2026-10-04');
    expect(d.exercises.filter((e) => !e.ski)).toHaveLength(8);
    expect(d.exercises.filter((e) => !e.ski).every((e) => e.sets.length === 2)).toBe(true);
    const lp = d.exercises.find((e) => e.slotId === 'leg-press')!;
    expect(lp.exerciseId).not.toBe('leg-press');
    const lc = d.exercises.find((e) => e.slotId === 'leg-curl')!;
    expect(lc.exerciseId).not.toBe('leg-curl');
  });
  it('עם אישור: לחיצת רגליים מקורית', () => {
    const st = emptyState();
    st.settings.legsCleared = true;
    const d = buildDraft(st, 'A', '2026-10-04');
    expect(d.exercises.find((e) => e.slotId === 'leg-press')!.exerciseId).toBe('leg-press');
  });
  it('התרגילים והסטים תואמים לתוכנית', () => {
    expect(WORKOUTS.A.slots.map((s) => `${s.exerciseId}:${s.sets}`)).toEqual(['chest-press:3', 'seated-row:3', 'leg-press:3', 'lat-pulldown:3', 'lateral-raise:3', 'leg-curl:3', 'bird-dog:3', 'side-plank:3']);
    expect(WORKOUTS.B.slots[0]).toMatchObject({ exerciseId: 'chest-supported-row', sets: 4, repMin: 8, repMax: 12 });
    expect(WORKOUTS.C.slots[3]).toMatchObject({ exerciseId: 'lateral-raise', sets: 4, repMin: 12, repMax: 15 });
  });
  it('שבוע קל: פחות סטים', () => {
    const st = emptyState();
    st.settings.legsCleared = true;
    st.sessions = Array.from({ length: 15 }, (_, i) => sess(`2026-08-${String(i + 1).padStart(2, '0')}`, (['A', 'B', 'C'] as const)[i % 3]));
    const d = buildDraft(st, 'A', '2026-10-04');
    expect(d.deload).toBe(true);
    expect(d.exercises.filter((e) => !e.ski).every((e) => e.sets.length === 2)).toBe(true);
  });
});

describe('גוף', () => {
  const e = (date: string, kg: number) => ({ id: date, date, kg });
  it('ממוצע נע של 4', () => {
    expect(movingAverage([90, 89, 88, 87, 86], 4)).toEqual([90, 89.5, 89, 88.5, 87.5]);
  });
  it('שבוע מתחיל ביום ראשון', () => {
    expect(weekStart('2026-10-04')).toBe('2026-10-04'); // ראשון
    expect(weekStart('2026-10-10')).toBe('2026-10-04');
  });
  it('קצב תקין 0.3-0.5', () => {
    const s = weeklySeries([e('2026-10-11', 89.6), e('2026-10-18', 89.2)], { date: '2026-10-04', kg: 90 });
    const r = trendStatus(s);
    expect(r.status).toBe('on-pace');
    expect(r.rate).toBeCloseTo(0.4, 1);
  });
  it('ירידה מהירה', () => {
    const s = weeklySeries([e('2026-10-11', 89), e('2026-10-18', 88)], { date: '2026-10-04', kg: 90 });
    expect(trendStatus(s).status).toBe('too-fast');
  });
  it('פלטו: שבועיים ללא שינוי', () => {
    const s = weeklySeries([e('2026-10-11', 89.9), e('2026-10-18', 89.9)], { date: '2026-10-04', kg: 90 });
    expect(isPlateau(s)).toBe(true);
    expect(trendStatus(s).status).toBe('flat');
  });
  it('אין פלטו עם ירידה', () => {
    const s = weeklySeries([e('2026-10-11', 89.5), e('2026-10-18', 89)], { date: '2026-10-04', kg: 90 });
    expect(isPlateau(s)).toBe(false);
  });
  it('נתונים מעטים', () => {
    expect(trendStatus(weeklySeries([], { date: '2026-10-04', kg: 90 })).status).toBe('few');
  });
  it('יעד הושג אחרי שתי שקילות רצופות', () => {
    const s = weeklySeries([e('2026-10-11', 85), e('2026-10-18', 84.8)], { date: '2026-10-04', kg: 90 });
    expect(goalReached(s, 85)).toBe(true);
    expect(goalReached(weeklySeries([e('2026-10-11', 85)], { date: '2026-10-04', kg: 90 }), 85)).toBe(false);
  });
});

describe('גיבוי', () => {
  it('מקבל מבנה תקין ודוחה זבל', () => {
    const st = emptyState();
    const out = parseBackup(JSON.stringify({ app: 'moshe-fitness', data: st }));
    expect(out.version).toBe(1);
    expect(() => parseBackup('לא json')).toThrow();
    expect(() => parseBackup('{"x":1}')).toThrow();
  });
  it('תאריכים', () => { expect(addDays('2026-10-31', 1)).toBe('2026-11-01'); });
});
