// נתוני הדגמה לסיכום השבועי: 4 שבועות, "היום" = שישי 9.10.2026.
// מדלג קבוע על לחיצת חזה ועל הצדפה; בשבוע האחרון פספס חזה ורגליים (וחלק מהכתפיים), גב מלא.
export const REVIEW_NOW = '2026-10-09T10:00:00+03:00';

const SLOTS = {
  A: [['chest-press', 'chest-press', 3, 8, 12, 40], ['seated-row', 'seated-row', 3, 10, 12, 35], ['leg-press', 'alt-glute-bridge', 3, 10, 12, 0], ['lat-pulldown', 'lat-pulldown', 3, 10, 12, 35],
    ['lateral-raise', 'lateral-raise', 3, 12, 15, 4], ['leg-curl', 'alt-clamshell', 3, 10, 15, 0], ['bird-dog', 'bird-dog', 3, 8, 8, 0], ['side-plank', 'side-plank', 3, 20, 30, 0]],
  B: [['chest-supported-row', 'chest-supported-row', 4, 8, 12, 30], ['glute-bridge', 'glute-bridge', 3, 10, 12, 0], ['shoulder-press', 'shoulder-press', 3, 8, 12, 20], ['lat-pulldown', 'lat-pulldown', 3, 8, 12, 35],
    ['face-pull', 'face-pull', 3, 12, 15, 15], ['leg-curl', 'alt-clamshell', 3, 12, 12, 0], ['pallof-press', 'pallof-press', 3, 10, 10, 5], ['bird-dog', 'bird-dog', 2, 8, 8, 0]],
  C: [['incline-press', 'incline-press', 3, 8, 12, 30], ['seated-row', 'seated-row', 3, 10, 12, 35], ['leg-press', 'alt-clamshell', 3, 12, 12, 0], ['lateral-raise', 'lateral-raise', 4, 12, 15, 4],
    ['biceps-curl', 'biceps-curl', 3, 10, 12, 6], ['triceps-ext', 'triceps-ext', 3, 10, 12, 15], ['glute-bridge', 'glute-bridge', 3, 12, 12, 0], ['side-plank', 'side-plank', 3, 20, 30, 0]],
};

// [תאריך, סוג, מספר סטים מתוכנן, דילוגים {slot: סטים שבוצעו}, כאב, הערה]
const PLAN = [
  ['2026-09-13', 'A', 2, { 'chest-press': 0, 'leg-curl': 0 }],
  ['2026-09-15', 'B', 2, { 'leg-curl': 0 }],
  ['2026-09-17', 'C', 2, {}],
  ['2026-09-20', 'A', 2, { 'chest-press': 0, 'leg-curl': 0 }],
  ['2026-09-22', 'B', 2, { 'leg-curl': 0 }],
  ['2026-09-24', 'C', 2, {}],
  ['2026-09-27', 'A', 3, { 'chest-press': 0, 'leg-curl': 0 }],
  ['2026-09-29', 'B', 3, { 'leg-curl': 0 }],
  // השבוע (4–10.10)
  ['2026-10-04', 'C', 3, { 'incline-press': 1, 'leg-press': 0, 'glute-bridge': 0, 'lateral-raise': 0 }],
  ['2026-10-06', 'A', 3, { 'chest-press': 0, 'leg-press': 0, 'leg-curl': 0, 'lateral-raise': 1 }, { back: 2, shin: 0, knee: 1 }],
  ['2026-10-08', 'B', 3, { 'glute-bridge': 0, 'leg-curl': 0 }, { back: 3, shin: 0, knee: 2 }, 'דילגתי על הגשר, הברך לא הייתה נוחה'],
];

export function reviewSeed() {
  const sessions = PLAN.map(([date, type, n, skip, pain, notes], k) => ({
    id: 'r' + k, date, type, createdAt: k + 1, deload: false,
    pain: pain ?? { back: 1, shin: 0, knee: 0 }, painTriggers: [], nextMorning: 'same', notes,
    exercises: SLOTS[type].map(([slotId, exerciseId, full, a, b, w]) => {
      const planned = Math.min(full, n);
      const d = skip[slotId] ?? planned;
      return {
        slotId, exerciseId, repMin: a, repMax: b, plannedSets: planned, ...(d === 0 ? { skipped: true } : {}),
        sets: Array.from({ length: d }, (_, i) => ({ w: w || null, r: Math.min(b, a + 1 + (k >> 1) + i), done: true })),
      };
    }),
  }));
  const cardio = [['2026-09-14', 'bike'], ['2026-09-18', 'elliptical'], ['2026-09-21', 'bike'], ['2026-09-25', 'swim'], ['2026-09-30', 'incline-walk'], ['2026-10-05', 'bike']]
    .map(([date, type], i) => ({ id: 'c' + i, date, type, minutes: 25 + (i > 3 ? 5 : 0), avgHr: 115, effort: 3, easy: true, createdAt: i }));
  const body = [['2026-09-13', 90.0], ['2026-09-20', 89.6], ['2026-09-27', 89.3], ['2026-10-04', 88.9]].map(([date, kg], i) => ({ id: 'b' + i, date, kg }));
  return {
    version: 1,
    settings: { heightCm: 175, baselineKg: 90, baselineDate: '2026-09-13', goalKg: 85, pastKg: 114, legsCleared: false, earlyDeloadFrom: null, stepOverrides: {}, pauseCleared: {}, physioChecked: {} },
    sessions, cardio, body, daily: {}, draft: null, swapPrefs: {},
  };
}
