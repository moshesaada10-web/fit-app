// בלוק "הכנה לסקי" (12 שבועות לפני הטיול). בחירה של האפליקציה, לא מהחוברת.
// בלי קפיצות, בלי פליאומטריקה, בלי כיפוף ברך עמוק ובלי סיבוב עמוד שדרה בעומס.
import type { Exercise, WorkoutId } from './plan';

export interface SkiExercise extends Exercise {
  /** כמות בסיס לסט בכל שלב (שבועות 1–4, 5–8, 9–12) */
  dose: [number, number, number];
  /** מספר סטים בכל שלב */
  sets: [number, number, number];
  /** דגש לפי שלב (למשל התקדמות בשיווי משקל) */
  cue?: [string, string, string];
  /** חלופה כשאין אישור פיזיו לרגליים */
  subFor?: string;
}

const X = (e: Omit<SkiExercise, 'en' | 'step'> & { en?: string }): SkiExercise => ({ en: '', step: 0, ...e });

export const SKI_EXERCISES: Record<string, SkiExercise> = {
  'ski-band-walk': X({
    id: 'ski-band-walk', he: 'הליכה צידית עם גומייה', kind: 'bodyweight', unit: 'reps', perSide: true,
    setup: 'גומייה קלה מעל הברכיים. עמידה ברוחב אגן, ברכיים כפופות מעט מאוד (חצי כריעה רדודה), גב ישר.',
    doIt: 'צעדים קטנים הצידה, ברכיים מכוונות מעל אצבעות הרגליים. סופרים צעדים לכל כיוון.',
    emphasis: 'לא לתת לברכיים לקרוס פנימה. כיפוף ברך קטן בלבד; כאב בברך או בשוק: מקטינים צעד או מוותרים על הגומייה.',
    dose: [10, 12, 15], sets: [2, 3, 3],
  }),
  'ski-sl-bridge': X({
    id: 'ski-sl-bridge', he: 'גשר ישבן על רגל אחת', kind: 'bodyweight', unit: 'reps', perSide: true,
    setup: 'שכיבה על הגב, ברך אחת כפופה וכף רגל על הרצפה; הרגל השנייה ישרה באוויר או כפופה מעל המזרן.',
    doIt: 'להרים את האגן בעזרת הישבן, החזקה של 2 שניות למעלה, ולרדת לאט.',
    emphasis: 'האגן נשאר ישר (לא נוטה לצד). לא להקשית את הגב התחתון. אם קשה: לחזור לגשר על שתי רגליים.',
    dose: [6, 8, 10], sets: [2, 3, 3],
  }),
  'ski-side-plank': X({
    id: 'ski-side-plank', he: 'פלאנק צד (סקי)', kind: 'bodyweight', unit: 'sec', perSide: true, image: 'side-plank.webp',
    setup: 'על המרפק, ברכיים כפופות (גרסה מותאמת) או רגליים ישרות אם הגב נוח.',
    doIt: 'להרים את האגן לקו ישר ולהחזיק בנשימה רגועה.',
    emphasis: 'בלי סיבוב של הגו ובלי שקיעה של האגן. כאב בגב: מקצרים את ההחזקה.',
    dose: [20, 30, 40], sets: [2, 2, 3],
  }),
  'ski-pallof': X({
    id: 'ski-pallof', he: 'לחיצת פאלוף (סקי)', kind: 'cable', unit: 'reps', perSide: true, image: 'pallof-press.webp',
    setup: 'עמידה צידית לכבל או לגומייה בגובה החזה, ברכיים רכות.',
    doIt: 'לדחוף ידיים קדימה, להחזיק 2–3 שניות בלי להסתובב, ולהחזיר.',
    emphasis: 'זה תרגיל נגד סיבוב: הגו לא מסתובב. משקל קל.',
    dose: [8, 10, 12], sets: [2, 3, 3],
  }),
  'ski-dead-bug': X({
    id: 'ski-dead-bug', he: 'חרק מת (Dead Bug)', kind: 'bodyweight', unit: 'reps', perSide: true,
    setup: 'שכיבה על הגב, ידיים למעלה, ברכיים ב־90° מעל האגן. גב תחתון נוגע ברצפה.',
    doIt: 'להוריד יד ורגל נגדיות לאט, ולחזור. מחליפים צד.',
    emphasis: 'הגב התחתון לא מתרומם מהרצפה. טווח קטן אם צריך. נשיפה בהורדה.',
    dose: [6, 8, 10], sets: [2, 3, 3],
  }),
  'ski-balance': X({
    id: 'ski-balance', he: 'שיווי משקל על רגל אחת', kind: 'bodyweight', unit: 'sec', perSide: true,
    setup: 'ליד קיר או מוט לאחיזה במקרה הצורך. ברך העמידה רכה (לא נעולה).',
    doIt: 'עמידה על רגל אחת, אגן ישר, נשימה רגועה. מחליפים רגל.',
    emphasis: 'לא לקפוץ ולא לנחות. אם מאבדים שיווי משקל: נוגעים בקיר וממשיכים.',
    dose: [20, 30, 40], sets: [2, 2, 3],
    cue: ['מבט קדימה לנקודה קבועה, על רצפה יציבה', 'על משטח רך (מזרן מקופל או כרית איזון)', 'על משטח רך עם סיבובי ראש איטיים מצד לצד'],
  }),
  'ski-step-up': X({
    id: 'ski-step-up', he: 'עלייה איטית למדרגה נמוכה', kind: 'bodyweight', unit: 'reps', perSide: true, legs: true, subFor: 'ski-sub-clamshell',
    setup: 'מדרגה או משטח נמוך: 10–15 ס״מ בלבד. אחיזה במעקה או בקיר.',
    doIt: 'לעלות לאט (3 שניות) בעזרת הרגל העליונה, ולרדת לאט (3 שניות). בלי דחיפה מהרגל התחתונה.',
    emphasis: 'רק עם אישור פיזיותרפיסט. ברך מעל כף הרגל, לא קורסת פנימה. כאב בברך או בשוק: להפסיק.',
    dose: [6, 8, 10], sets: [2, 3, 3],
  }),
  'ski-wall-sit': X({
    id: 'ski-wall-sit', he: 'ישיבה רדודה על קיר (איזומטרי)', kind: 'bodyweight', unit: 'sec', legs: true, subFor: 'ski-sub-bridge',
    setup: 'גב צמוד לקיר, כפות רגליים מעט קדימה ברוחב אגן.',
    doIt: 'להחליק מעט למטה לישיבה רדודה בלבד (ברכיים פתוחות יותר מ־90°, בערך רבע כריעה) ולהחזיק.',
    emphasis: 'רק עם אישור פיזיותרפיסט. לא לרדת עמוק: הברך לא מגיעה ל־90°. כאב בברך: לעלות גבוה יותר או להפסיק.',
    dose: [20, 30, 45], sets: [2, 3, 3],
  }),
  // חלופות בלי אישור פיזיו
  'ski-sub-clamshell': X({
    id: 'ski-sub-clamshell', he: 'צדפה בשכיבה על הצד', kind: 'bodyweight', unit: 'reps', perSide: true,
    setup: 'שכיבה על הצד, ברכיים כפופות מעט, עקבים צמודים.',
    doIt: 'לפתוח את הברך העליונה בלי לגלגל את האגן לאחור, ולסגור לאט.',
    emphasis: 'טווח קטן ובלי כאב בברך. במקום עלייה למדרגה עד אישור פיזיו.',
    dose: [12, 15, 15], sets: [2, 3, 3],
  }),
  'ski-sub-bridge': X({
    id: 'ski-sub-bridge', he: 'גשר ישבן עם החזקה', kind: 'bodyweight', unit: 'sec', image: 'glute-bridge.webp',
    setup: 'שכיבה על הגב, ברכיים כפופות, כפות רגליים על הרצפה.',
    doIt: 'להרים את האגן ולהחזיק למעלה בנשימה רגועה.',
    emphasis: 'לא להקשית את הגב. במקום ישיבה על קיר עד אישור פיזיו.',
    dose: [20, 30, 40], sets: [2, 3, 3],
  }),
};

/** סיום סקי לכל אימון: 3 תרגילים, רוטציה כך שכל אחד מופיע פעם–פעמיים בשבוע */
export const SKI_FINISHERS: Record<WorkoutId, string[]> = {
  A: ['ski-band-walk', 'ski-side-plank', 'ski-balance'],
  B: ['ski-sl-bridge', 'ski-pallof', 'ski-step-up'],
  C: ['ski-dead-bug', 'ski-wall-sit', 'ski-balance'],
};

export const SKI_DEFAULT_TRIP = '2027-01-07';
export const SKI_WEEKS = 12;
