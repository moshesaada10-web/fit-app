// מקור האמת: moshe-training-plan-v2 (HTML/PDF). התרגילים, הסטים והחזרות נלקחו משם ללא שינוי.
import { SKI_EXERCISES } from './ski';
export type WorkoutId = 'A' | 'B' | 'C';
export type Unit = 'reps' | 'sec';
export type Kind = 'machine' | 'cable' | 'dumbbell' | 'bodyweight';

export interface Exercise {
  id: string;
  he: string;
  en: string;
  kind: Kind;
  unit: Unit;
  /** מדרגת המשקל הקטנה ביותר בק״ג (0 = בלי משקל) */
  step: number;
  setup: string;
  doIt: string;
  emphasis: string;
  /** שם קובץ ב-public/img (איור סכמטי מהחוברת הקודמת). אם חסר: כרטיס טקסט בלבד */
  image?: string;
  /** תרגיל רגליים התלוי באישור פיזיותרפיסט/אורתופד (OCD בברך) */
  legs?: boolean;
  perSide?: boolean;
}

export interface Slot {
  exerciseId: string;
  /** מספר הסטים המלא בטבלה */
  sets: number;
  /** מינימום סטים (לטווחים כמו 2–3) */
  setsMin?: number;
  repMin: number;
  repMax: number;
}

export interface Alternative {
  id: string;
  he: string;
  /** שימוש בתמונה של תרגיל קיים */
  ref?: string;
  kind: Kind;
  unit: Unit;
  step: number;
  setup: string;
  doIt: string;
  emphasis: string;
  legs?: boolean;
  perSide?: boolean;
}

export const EXERCISES: Record<string, Exercise> = {
  'chest-press': {
    id: 'chest-press', he: 'לחיצת חזה במכונה', en: 'Machine Chest Press', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'לכוון מושב כך שהידיות בערך בגובה אמצע החזה; להצמיד גב למשענת.',
    doIt: 'לדחוף קדימה בלי לנעול מרפקים, ואז לחזור לאט.',
    emphasis: 'לא להקשית את הגב כדי להשלים חזרה. לעצור לפני טווח שמכאיב בכתף.',
    image: 'chest-press.webp',
  },
  'seated-row': {
    id: 'seated-row', he: 'חתירה בישיבה בכבל', en: 'Seated Cable Row', kind: 'cable', unit: 'reps', step: 2.5,
    setup: 'לשבת יציב עם ברכיים מעט כפופות, גב נוח וידית אחיזה קרובה.',
    doIt: 'למשוך לכיוון הצלעות התחתונות ולהחזיר בשליטה.',
    emphasis: 'הגוף נשאר יציב: לא להתנדנד קדימה ואחורה. אם קשה לייצב, להשתמש בחתירה עם תמיכת חזה.',
    image: 'seated-row.webp',
  },
  'leg-press': {
    id: 'leg-press', he: 'לחיצת רגליים', en: 'Leg Press', kind: 'machine', unit: 'reps', step: 5, legs: true,
    setup: 'לכוון משענת ולשים את כפות הרגליים ברוחב נוח. להתחיל בעומס קל.',
    doIt: 'לכופף ברכיים רק בטווח מאושר ונוח, ולדחוף בלי לנעול אותן.',
    emphasis: 'לבצע רק לאחר בירור מגבלות ה־OCD. האגן נשאר צמוד למשענת; לא לרדת עד שהגב מתעגל. כאב, נפיחות או נעילה: להפסיק.',
    image: 'leg-press.webp',
  },
  'lat-pulldown': {
    id: 'lat-pulldown', he: 'משיכת פולי עליון לחזה', en: 'Lat Pulldown', kind: 'cable', unit: 'reps', step: 2.5,
    setup: 'לקבע ירכיים מתחת לכרית ולאחוז ברוחב נוח; אפשר אחיזה ניטרלית.',
    doIt: 'למשוך אל החלק העליון של החזה ולהעלות חזרה לאט.',
    emphasis: 'לא למשוך מאחורי הראש ולא לזרוק את הגוף לאחור.',
    image: 'lat-pulldown.webp',
  },
  'lateral-raise': {
    id: 'lateral-raise', he: 'הרחקת כתפיים לצדדים', en: 'Lateral Raise', kind: 'dumbbell', unit: 'reps', step: 1,
    setup: 'לעמוד יציב עם משקולות קלות ומרפקים מעט כפופים.',
    doIt: 'להרים לצדדים עד סמוך לגובה כתפיים ולהוריד באיטיות.',
    emphasis: 'בלי תנופה או הרמת כתפיים לאוזניים. אפשר לשבת עם משענת אם נוח יותר לגב.',
    image: 'lateral-raise.webp',
  },
  'leg-curl': {
    id: 'leg-curl', he: 'כפיפת ברך במכונה בישיבה', en: 'Seated Leg Curl', kind: 'machine', unit: 'reps', step: 2.5, legs: true,
    setup: 'ליישר את ציר המכשיר עם הברך, ואת הגליל להניח מעל העקב.',
    doIt: 'לכופף את הברכיים ולהחזיר לאט, בלי להרים את האגן.',
    emphasis: 'המכשיר אינו מתאים אוטומטית לכל מצב של OCD. לבצע בטווח שאושר, בלי כאב בברך או לחץ לא נוח.',
    image: 'leg-curl.webp',
  },
  'bird-dog': {
    id: 'bird-dog', he: 'בירד דוג', en: 'Bird Dog', kind: 'bodyweight', unit: 'reps', step: 0, perSide: true,
    setup: 'לעמוד על ארבע, ידיים מתחת לכתפיים וברכיים מתחת לאגן.',
    doIt: 'להושיט יד ורגל נגדית עד קו הגוף, להחזיק 3–5 שניות ולהחזיר.',
    emphasis: 'לא להרים את הרגל מעבר לקו הגב ולא לסובב אגן. להתחיל ביד או רגל בלבד אם קשה. כרית לברכיים; אם הלחץ כואב, לבקש חלופה.',
    image: 'bird-dog.webp',
  },
  'side-plank': {
    id: 'side-plank', he: 'פלאנק צד מותאם', en: 'Modified Side Plank', kind: 'bodyweight', unit: 'sec', step: 0, perSide: true,
    setup: 'לשכב על הצד, ברכיים כפופות ומרפק מתחת לכתף.',
    doIt: 'להרים אגן כך שהראש, הכתפיים והאגן בקו אחד; לנשום רגיל.',
    emphasis: 'להתחיל ב־10–15 שניות אם צריך. לא לקרוס בכתף. אם מגע הברך במזרן כואב, לא להמשיך.',
    image: 'side-plank.webp',
  },
  'chest-supported-row': {
    id: 'chest-supported-row', he: 'חתירה עם תמיכת חזה', en: 'Chest-Supported Row', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'לכוון כרית כך שהחזה נתמך והנשימה נוחה; כפות רגליים יציבות.',
    doIt: 'למשוך ידיות לכיוון הגוף ולהחזיר בלי להרים חזה מהתמיכה.',
    emphasis: 'צורת המכשיר יכולה להשתנות. בלי משיכה מהגב התחתון.',
    image: 'chest-supported-row.webp',
  },
  'glute-bridge': {
    id: 'glute-bridge', he: 'גשר ישבן על מזרן', en: 'Glute Bridge', kind: 'bodyweight', unit: 'reps', step: 0,
    setup: 'לשכב על הגב, ברכיים כפופות וכפות רגליים יציבות ברוחב אגן.',
    doIt: 'לכווץ ישבן ולהרים אגן עד קו נוח בין כתפיים, אגן וברכיים.',
    emphasis: 'לא לדחוף את הבטן לתקרה ולא להקשית גב. נבחר כגרסת התחלה במקום Hip Thrust עמוס.',
    image: 'glute-bridge.webp',
  },
  'shoulder-press': {
    id: 'shoulder-press', he: 'לחיצת כתפיים עם משענת', en: 'Seated Shoulder Press', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'לשבת עם תמיכת גב; להתחיל עם ידיות או משקולות בגובה כתפיים.',
    doIt: 'לדחוף למעלה בטווח נוח ולהוריד לאט.',
    emphasis: 'במכונה או בישיבה נתמכת, לפי הציוד. אם הגב מתקשה או הכתף כואבת, להפחית עומס וטווח.',
    image: 'shoulder-press.webp',
  },
  'face-pull': {
    id: 'face-pull', he: 'משיכה לפנים בכבל', en: 'Face Pull', kind: 'cable', unit: 'reps', step: 2.5,
    setup: 'לחבר חבל לכבל בגובה פנים ולעמוד יציב בעומס קל.',
    doIt: 'למשוך את החבל לכיוון הפנים ולפצל את הקצוות לצדי הראש.',
    emphasis: 'לא להישען אחורה כדי להזיז משקל; לשמור צוואר נוח. התנועה מהכתפיים והגב העליון.',
    image: 'face-pull.webp',
  },
  'pallof-press': {
    id: 'pallof-press', he: 'לחיצת פאלוף', en: 'Pallof Press', kind: 'cable', unit: 'reps', step: 2.5, perSide: true,
    setup: 'לעמוד עם הצד אל הכבל; להחזיק ידית בשתי ידיים מול החזה.',
    doIt: 'להושיט ידיים קדימה, להחזיק 1–2 שניות ולהחזיר בלי לסובב גוף.',
    emphasis: 'להחליף צד. עומס קל מספיק: המטרה להתנגד לסיבוב, לא למשוך משקל גדול.',
    image: 'pallof-press.webp',
  },
  'incline-press': {
    id: 'incline-press', he: 'לחיצת חזה בשיפוע', en: 'Incline Chest Press', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'להשתמש במכונה בשיפוע או ספסל בשיפוע מתון עם תמיכת גב.',
    doIt: 'לדחוף קדימה ולמעלה ולהחזיר בשליטה.',
    emphasis: 'להעדיף מכונה אם קשה להרים ולהניח משקולות. לא ליצור קשת גדולה בגב.',
    image: 'incline-press.webp',
  },
  'biceps-curl': {
    id: 'biceps-curl', he: 'כפיפת מרפקים', en: 'Biceps Curl', kind: 'dumbbell', unit: 'reps', step: 1,
    setup: 'לאחוז משקולות קלות, מרפקים סמוך לגוף וכפות רגליים יציבות.',
    doIt: 'לכופף מרפקים בלי להזיז כתפיים, ולהוריד לאט.',
    emphasis: 'בלי תנופה מהגב. אפשר לבצע בישיבה עם תמיכה.',
    image: 'biceps-curl.webp',
  },
  'triceps-ext': {
    id: 'triceps-ext', he: 'פשיטת מרפקים בכבל', en: 'Triceps Cable Extension', kind: 'cable', unit: 'reps', step: 2.5,
    setup: 'לעמוד מול כבל עליון, מרפקים צמודים לגוף ואחיזה נוחה.',
    doIt: 'ליישר מרפקים כלפי מטה ולהחזיר בלי להזיז את הזרוע העליונה.',
    emphasis: 'לא להתכופף ולהעמיס משקל גוף על הידית; להשאיר את הגב יציב.',
    image: 'triceps-pushdown.webp',
  },
};

const S = (exerciseId: string, sets: number, repMin: number, repMax: number, setsMin?: number): Slot => ({
  exerciseId, sets, repMin, repMax, ...(setsMin ? { setsMin } : {}),
});

export interface WorkoutDef {
  id: WorkoutId;
  title: string;
  subtitle: string;
  slots: Slot[];
}

export const WORKOUTS: Record<WorkoutId, WorkoutDef> = {
  A: {
    id: 'A', title: 'אימון A', subtitle: 'גוף מלא · חזה וגב',
    slots: [
      S('chest-press', 3, 8, 12), S('seated-row', 3, 10, 12), S('leg-press', 3, 10, 12), S('lat-pulldown', 3, 10, 12),
      S('lateral-raise', 3, 12, 15), S('leg-curl', 3, 10, 15), S('bird-dog', 3, 8, 8), S('side-plank', 3, 20, 30),
    ],
  },
  B: {
    id: 'B', title: 'אימון B', subtitle: 'דגש גב · ישבן וכתפיים',
    slots: [
      S('chest-supported-row', 4, 8, 12), S('glute-bridge', 3, 10, 12), S('shoulder-press', 3, 8, 12), S('lat-pulldown', 3, 8, 12),
      S('face-pull', 3, 12, 15), S('leg-curl', 3, 12, 12), S('pallof-press', 3, 10, 10), S('bird-dog', 2, 8, 8),
    ],
  },
  C: {
    id: 'C', title: 'אימון C', subtitle: 'גוף מלא · כתפיים וידיים',
    slots: [
      S('incline-press', 3, 8, 12), S('seated-row', 3, 10, 12), S('leg-press', 3, 12, 12), S('lateral-raise', 4, 12, 15),
      S('biceps-curl', 3, 10, 12), S('triceps-ext', 3, 10, 12), S('glute-bridge', 3, 12, 12), S('side-plank', 3, 20, 30, 2),
    ],
  },
};

export const ORDER: WorkoutId[] = ['A', 'B', 'C'];

/** תיאור הסטים×חזרות כפי שמופיע בטבלה */
export function slotLabel(s: Slot, ex: { perSide?: boolean; unit: Unit }): string {
  const sets = s.setsMin ? `${s.setsMin}–${s.sets}` : `${s.sets}`;
  const reps = s.repMin === s.repMax ? `${s.repMin}` : `${s.repMin}–${s.repMax}`;
  const unit = ex.unit === 'sec' ? ' שנ׳' : '';
  const side = ex.perSide ? ' לצד' : '';
  return `${sets} × ${reps}${unit}${side}`;
}

/* ---------- חלופות בטוחות (עד 3 לכל תרגיל). בחירות של האפליקציה, לא חלק מהחוברת ---------- */
const ALT = {
  inclineMachine: {
    id: 'alt-incline-machine', he: 'לחיצה בשיפוע במכונה', ref: 'incline-press', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'מכונה בשיפוע מתון עם משענת גב מלאה.', doIt: 'לדחוף קדימה ולמעלה ולחזור לאט.',
    emphasis: 'גב צמוד למשענת, בלי קשת. לעצור לפני טווח שמכאיב בכתף.',
  },
  cableFly: {
    id: 'alt-cable-fly', he: 'פרפר בכבל, קל', kind: 'cable', unit: 'reps', step: 1.25,
    setup: 'כבלים בגובה חזה, משקל קל מאוד. עמידה יציבה (רגל אחת מעט קדימה) או ישיבה נתמכת אם יש.',
    doIt: 'ידיים מעט כפופות; לקרב את הידיות מול החזה ולהחזיר לאט.',
    emphasis: 'הגוף לא זז קדימה ואחורה ולא מקשיתים גב. אם מרגישים את הגב התחתון, לעבור לפרפר במכונה בישיבה.',
  },
  peckDeck: {
    id: 'alt-pec-deck', he: 'פרפר במכונה בישיבה, קל', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'לכוון מושב כך שהזרועות בגובה החזה, גב צמוד למשענת.',
    doIt: 'לקרב את הזרועות מול החזה ולהחזיר בשליטה.',
    emphasis: 'טווח נוח, בלי למתוח את הכתף אחורה.',
  },
  pushUpIncline: {
    id: 'alt-incline-pushup', he: 'שכיבות סמיכה בשיפוע', kind: 'bodyweight', unit: 'reps', step: 0,
    setup: 'ידיים על ספסל או מעקה יציב, גוף בקו ישר. ככל שהמשטח גבוה יותר, התרגיל קל יותר.',
    doIt: 'להוריד חזה לכיוון המשטח ולדחוף חזרה, בטן עדינה ללא קשת.',
    emphasis: 'אם האגן יורד או הגב מקשת, מגבירים את גובה המשטח או עוצרים.',
  },
  chestSupportedRow: {
    id: 'alt-csr', he: 'חתירה עם תמיכת חזה', ref: 'chest-supported-row', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'כרית לחזה, כפות רגליים יציבות.', doIt: 'למשוך ידיות לגוף ולהחזיר בלי להרים חזה.',
    emphasis: 'בלי משיכה מהגב התחתון. מתאים כשקשה לייצב את הגב בכבל.',
  },
  singleArmCable: {
    id: 'alt-one-arm-row', he: 'חתירה חד־צדדית בכבל בישיבה', kind: 'cable', unit: 'reps', step: 1.25, perSide: true,
    setup: 'לשבת יציב מול כבל נמוך, יד אחת באחיזה, יד שנייה על הירך.',
    doIt: 'למשוך את המרפק לצד הצלעות ולהחזיר לאט. לחזור על הצד השני.',
    emphasis: 'לא לסובב את הגוף. החזרות הן לכל צד.',
  },
  reverseFly: {
    id: 'alt-reverse-fly', he: 'פרפר הפוך במכונה', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'לשבת עם החזה מול הכרית; ידיות בגובה כתפיים.',
    doIt: 'לפתוח את הזרועות לצדדים בקשת קטנה ולהחזיר לאט.',
    emphasis: 'משקל קל. תנועה מהגב העליון, בלי למשוך כתפיים לאוזניים.',
  },
  glute: {
    id: 'alt-glute-bridge', he: 'גשר ישבן על מזרן', ref: 'glute-bridge', kind: 'bodyweight', unit: 'reps', step: 0,
    setup: 'לשכב על הגב, ברכיים כפופות וכפות רגליים ברוחב אגן.',
    doIt: 'לכווץ ישבן ולהרים אגן עד קו נוח; להחזיק שנייה ולרדת לאט.',
    emphasis: 'בטווח נוח לברך בלבד. בלי להקשית גב.',
  },
  clamshell: {
    id: 'alt-clamshell', he: 'צדפה בשכיבה על הצד', kind: 'bodyweight', unit: 'reps', step: 0, perSide: true,
    setup: 'שכיבה על הצד, ירכיים וברכיים כפופות, כפות רגליים צמודות.',
    doIt: 'לפתוח את הברך העליונה כמו צדפה בלי לסובב אגן, ולהחזיר לאט.',
    emphasis: 'טווח קטן ובלי כאב בברך. החזרות לכל צד.',
  },
  hipAbduction: {
    id: 'alt-hip-abduction', he: 'הרחקת ירך במכונה, קל', kind: 'machine', unit: 'reps', step: 2.5, legs: true,
    setup: 'ישיבה עם גב צמוד למשענת; כריות בצד החיצוני של הברכיים.',
    doIt: 'לפתוח את הרגליים לצדדים בטווח קטן ולהחזיר לאט.',
    emphasis: 'דורש בדיקה מול הפיזיותרפיסט/אורתופד בגלל לחץ על הברכיים. אם לא נוח, לוותר.',
  },
  neutralPulldown: {
    id: 'alt-neutral-pulldown', he: 'משיכת פולי עליון באחיזה ניטרלית', ref: 'lat-pulldown', kind: 'cable', unit: 'reps', step: 2.5,
    setup: 'ידית עם אחיזה ניטרלית (כפות ידיים זו מול זו), ירכיים מקובעות.',
    doIt: 'למשוך לחלק העליון של החזה ולהחזיר לאט.',
    emphasis: 'לא למשוך מאחורי הראש; בלי לזרוק את הגוף לאחור.',
  },
  straightArm: {
    id: 'alt-straight-arm', he: 'משיכת זרועות ישרות בכבל, קל', kind: 'cable', unit: 'reps', step: 1.25,
    setup: 'כבל עליון, עמידה יציבה, גב ניטרלי, ברכיים מעט כפופות.',
    doIt: 'עם מרפקים כמעט ישרים, למשוך את הידית כלפי הירכיים ולהחזיר לאט.',
    emphasis: 'משקל קל. אם הגב התחתון מקשת, להפסיק או לעבור לאחיזה ניטרלית.',
  },
  cableLateral: {
    id: 'alt-cable-lateral', he: 'הרחקת כתף בכבל נמוך', kind: 'cable', unit: 'reps', step: 1.25, perSide: true,
    setup: 'כבל נמוך, ידית ביד הרחוקה מהכבל. עמידה יציבה.',
    doIt: 'להרים הצידה עד סמוך לגובה כתף ולהוריד לאט.',
    emphasis: 'בלי תנופה ובלי להישען. לכל צד.',
  },
  seatedLateral: {
    id: 'alt-seated-lateral', he: 'הרחקת כתפיים בישיבה עם משענת', ref: 'lateral-raise', kind: 'dumbbell', unit: 'reps', step: 1,
    setup: 'לשבת על ספסל עם משענת גב, משקולות קלות.',
    doIt: 'להרים לצדדים עד סמוך לגובה כתפיים ולהוריד באיטיות.',
    emphasis: 'הגב צמוד למשענת. נוח יותר לגב מעמידה.',
  },
  deadBug: {
    id: 'alt-dead-bug', he: 'חרק מת (Dead Bug)', kind: 'bodyweight', unit: 'reps', step: 0, perSide: true,
    setup: 'שכיבה על הגב, ירכיים וברכיים ב־90 מעלות, ידיים למעלה.',
    doIt: 'להוריד לאט יד אחת ורגל נגדית לכיוון הרצפה, בלי לאבד את מגע הגב, ולחזור.',
    emphasis: 'הגב התחתון נשאר יציב. אם הוא מתרומם או כואב, מקצרים טווח או מפסיקים.',
  },
  birdDogArm: {
    id: 'alt-birddog-arm', he: 'בירד דוג: יד בלבד או רגל בלבד', ref: 'bird-dog', kind: 'bodyweight', unit: 'reps', step: 0, perSide: true,
    setup: 'על ארבע עם כרית לברכיים; מושיטים רק יד, או רק רגל.',
    doIt: 'להושיט עד קו הגוף, להחזיק 3 שניות ולהחזיר.',
    emphasis: 'גרסה קלה יותר כשקשה לייצב את האגן או כשהברכיים כואבות.',
  },
  pallofHold: {
    id: 'alt-pallof', he: 'לחיצת פאלוף', ref: 'pallof-press', kind: 'cable', unit: 'reps', step: 2.5, perSide: true,
    setup: 'עמידה עם הצד אל הכבל; ידית בשתי ידיים מול החזה.',
    doIt: 'להושיט קדימה, להחזיק שנייה-שתיים ולהחזיר.',
    emphasis: 'עומס קל. התנגדות לסיבוב.',
  },
  shoulderDb: {
    id: 'alt-neutral-db-press', he: 'לחיצת כתפיים במשקולות באחיזה ניטרלית', kind: 'dumbbell', unit: 'reps', step: 1,
    setup: 'ספסל עם משענת גב מלאה, משקולות קלות בגובה כתפיים, כפות ידיים זו מול זו.',
    doIt: 'לדחוף למעלה בטווח נוח ולהוריד לאט.',
    emphasis: 'אם הגב מתעגל או מקשת, להפחית משקל או להשתמש במכונה.',
  },
  bandPull: {
    id: 'alt-band-pullapart', he: 'פתיחת גומייה (Band Pull-Apart)', kind: 'bodyweight', unit: 'reps', step: 0,
    setup: 'גומייה קלה בגובה החזה, ידיים ישרות קדימה.',
    doIt: 'למשוך את הגומייה לצדדים עד הרמת החזה ולהחזיר לאט.',
    emphasis: 'בלי הרמת כתפיים לאוזניים ובלי קשת בגב.',
  },
  machineChest: {
    id: 'alt-machine-chest', he: 'לחיצת חזה במכונה', ref: 'chest-press', kind: 'machine', unit: 'reps', step: 2.5,
    setup: 'לכוון מושב כך שהידיות בגובה אמצע החזה.', doIt: 'לדחוף בלי לנעול מרפקים ולחזור לאט.',
    emphasis: 'לא להקשית גב. לעצור לפני טווח שמכאיב בכתף.',
  },
  cableCurl: {
    id: 'alt-cable-curl', he: 'כפיפת מרפקים בכבל נמוך', kind: 'cable', unit: 'reps', step: 1.25,
    setup: 'כבל נמוך עם ידית ישרה, עמידה יציבה, מרפקים צמודים.',
    doIt: 'לכופף עד הכתפיים ולהוריד לאט.', emphasis: 'בלי תנופה מהגב.',
  },
  hammerSeated: {
    id: 'alt-hammer', he: 'כפיפת פטיש בישיבה', kind: 'dumbbell', unit: 'reps', step: 1,
    setup: 'ישיבה עם משענת, משקולות באחיזה ניטרלית.', doIt: 'לכופף מרפקים ולהוריד לאט.', emphasis: 'הגב נשאר צמוד למשענת.',
  },
  ropePushdown: {
    id: 'alt-rope-pushdown', he: 'פשיטת מרפקים עם חבל', ref: 'triceps-ext', kind: 'cable', unit: 'reps', step: 1.25,
    setup: 'כבל עליון עם חבל, מרפקים צמודים לגוף.', doIt: 'ליישר מרפקים ולפתוח מעט את החבל בתחתית.',
    emphasis: 'הגב יציב, בלי להישען על הידית.',
  },
  bandPushdown: {
    id: 'alt-band-pushdown', he: 'פשיטת מרפקים בגומייה', kind: 'bodyweight', unit: 'reps', step: 0,
    setup: 'גומייה מקובעת גבוה, מרפקים צמודים.', doIt: 'ליישר מרפקים למטה ולהחזיר לאט.', emphasis: 'ללא תנופה, גב יציב.',
  },
} satisfies Record<string, Alternative>;

export const ALTERNATIVES: Record<string, Alternative[]> = {
  'chest-press': [ALT.inclineMachine, ALT.cableFly, ALT.pushUpIncline],
  'incline-press': [ALT.machineChest, ALT.peckDeck, ALT.pushUpIncline],
  'seated-row': [ALT.chestSupportedRow, ALT.singleArmCable, ALT.reverseFly],
  'chest-supported-row': [{ ...ALT.chestSupportedRow, id: 'alt-seated-row', he: 'חתירה בישיבה בכבל', ref: 'seated-row' }, ALT.singleArmCable, ALT.reverseFly],
  'leg-press': [ALT.glute, ALT.clamshell, ALT.hipAbduction],
  'leg-curl': [ALT.clamshell, ALT.glute, ALT.hipAbduction],
  'lat-pulldown': [ALT.neutralPulldown, ALT.straightArm],
  'lateral-raise': [ALT.seatedLateral, ALT.cableLateral],
  'bird-dog': [ALT.birdDogArm, ALT.deadBug],
  'side-plank': [ALT.pallofHold, ALT.deadBug],
  'glute-bridge': [ALT.clamshell, ALT.hipAbduction],
  'shoulder-press': [ALT.shoulderDb, ALT.seatedLateral],
  'face-pull': [ALT.reverseFly, ALT.bandPull],
  'pallof-press': [ALT.deadBug, ALT.birdDogArm],
  'biceps-curl': [ALT.cableCurl, ALT.hammerSeated],
  'triceps-ext': [ALT.ropePushdown, ALT.bandPushdown],
};

/** המרת חלופה לצורת תרגיל לצורך תצוגה ורישום */
export function altAsExercise(a: Alternative): Exercise {
  const img = a.ref ? EXERCISES[a.ref]?.image : undefined;
  return {
    id: a.id, he: a.he, en: '', kind: a.kind, unit: a.unit, step: a.step, setup: a.setup, doIt: a.doIt, emphasis: a.emphasis,
    image: img, legs: a.legs, perSide: a.perSide,
  };
}

export function findExercise(id: string): Exercise | undefined {
  if (EXERCISES[id]) return EXERCISES[id];
  if (SKI_EXERCISES[id]) return SKI_EXERCISES[id];
  for (const list of Object.values(ALTERNATIVES)) {
    const a = list.find((x) => x.id === id);
    if (a) return altAsExercise(a);
  }
  return undefined;
}

/* ---------- לוח 12 שבועות ---------- */
export type Phase = 'intro' | 'build' | 'deload';
export interface WeekRow {
  week: number;
  phase: Phase;
  sets: string;
  cardio: string;
  cardioMin: number;
  cardioMax: number;
  steps: string;
  note: string;
}
export const WEEKS: WeekRow[] = [
  { week: 1, phase: 'intro', sets: '2', cardio: '25', cardioMin: 25, cardioMax: 25, steps: 'הממוצע שלך +500', note: 'שבועות היכרות: 2 סטים, טכניקה ומשקל קל' },
  { week: 2, phase: 'intro', sets: '2', cardio: '25', cardioMin: 25, cardioMax: 25, steps: '500–1,000+ צעדים', note: 'שבועות היכרות: 2 סטים, טכניקה ומשקל קל' },
  { week: 3, phase: 'build', sets: '2→3', cardio: '30', cardioMin: 30, cardioMax: 30, steps: '500–1,000+ צעדים', note: 'מוסיפים סט בהדרגה' },
  { week: 4, phase: 'build', sets: '3', cardio: '30', cardioMin: 30, cardioMax: 30, steps: 'בדרך ל־8,000', note: '3 סטים אם הכול רגוע' },
  { week: 5, phase: 'build', sets: '3', cardio: '35', cardioMin: 35, cardioMax: 35, steps: '8,000–9,000', note: 'משקל: מדרגה קטנה' },
  { week: 6, phase: 'deload', sets: '2', cardio: '25 קל', cardioMin: 25, cardioMax: 25, steps: '8,000', note: 'שבוע קל: סטים −40%, משקל −10%' },
  { week: 7, phase: 'build', sets: '3', cardio: '35', cardioMin: 35, cardioMax: 35, steps: '8,000–10,000', note: 'חוזרים למשקל לפני השבוע הקל' },
  { week: 8, phase: 'build', sets: '3', cardio: '35', cardioMin: 35, cardioMax: 35, steps: '8,000–10,000', note: 'בדיקת מצב: גב, שוק, ברך' },
  { week: 9, phase: 'build', sets: '3', cardio: '40', cardioMin: 40, cardioMax: 40, steps: '8,000–10,000', note: 'אפשר אינטרוולים עדינים' },
  { week: 10, phase: 'build', sets: '3', cardio: '40', cardioMin: 40, cardioMax: 40, steps: '8,000–10,000', note: 'מדרגת משקל קטנה' },
  { week: 11, phase: 'build', sets: '3', cardio: '40', cardioMin: 40, cardioMax: 40, steps: '8,000–10,000', note: 'שבוע אחרון לפני השבוע הקל' },
  { week: 12, phase: 'deload', sets: '2', cardio: '25–30 קל', cardioMin: 25, cardioMax: 30, steps: '8,000–10,000', note: 'שבוע קל: סטים −40%, משקל −10%; סיכום' },
];

export const CARDIO_TYPES = [
  { id: 'bike', he: 'אופני כושר', tip: 'התנגדות נמוכה וסיבובים חלקים. גובה אוכף כך שהברך לא מתכופפת יותר מדי בתחתית. אם הברך כואבת, להפסיק.' },
  { id: 'elliptical', he: 'אליפטי', tip: 'תנועה חלקה בלי קפיצה, התנגדות נמוכה, בלי לנעול ברכיים, גב זקוף. אם יש כאב בברך או בשוק, להפסיק.' },
  { id: 'incline-walk', he: 'הליכה בשיפוע קל', tip: 'שיפוע בערך 1–3%, בלי אחיזה חזקה בידיות. אם יש כאב, להוריד לשיפוע 0 או לעבור למכשיר אחר.' },
  { id: 'swim', he: 'שחייה', tip: 'שחייה רגועה בקצב שיחה. אם בעיטת חזה מכאיבה בברך, להימנע או להשתמש בציפה בין הרגליים.' },
  { id: 'row-machine', he: 'חתירה במכונה (זהיר)', tip: 'אופציונלי, רק אם הגב נוח וברור שאין החמרה. קצב נמוך וטווח קצר, 5–10 דקות להתחלה. לא בשבועות 1–4. כיפוף ברך עמוק עלול לא להתאים ל־OCD: לברר לפני.' },
] as const;

/* ---------- טקסטי בטיחות (מהחוברת) ---------- */
export const SAFETY = {
  stop: [
    'כאב חד או מקרין',
    'נימול',
    'חולשה',
    'כאב מפרקי, נפיחות או נעילת ברך',
    'כאב בשוק שחוזר או מתגבר: לפנות לבדיקה. אין דרך לקבוע כאן אם מקורו בגב, בשריר או בגורם אחר.',
  ],
  urgent: [
    'הפרעה חדשה בשליטה בשתן או בצואה',
    'קושי חדש לתת שתן',
    'ירידה בתחושה באזור המפשעה',
    'חולשה חדשה או מתקדמת ברגל',
  ],
  painRule: [
    'כאב 4 ומעלה (מתוך 10), או החמרה בבוקר שאחרי לעומת הבסיס שלך: מורידים סט אחד מהתרגיל ומקלים את העומס.',
    'נמשך 2 אימונים ברציפות: משהים את התרגיל שמעורר את הכאב ופונים לפיזיותרפיסט.',
  ],
};

export const PHYSIO_BRING = [
  'החוברת הזו (במיוחד עמודי A / B / C)',
  'דוחות ובדיקות הדמיה: MRI, CT, צילומים של הברך והגב',
  'סיכום רפואי על ה־OCD: מיקום, האם יציב, האם היה ניתוח או קיבוע',
  'רשימת תרופות ותוספים',
  'יומן הכאב של השבועות האחרונים (גב, שוק ימין, ברך)',
  'רשימת המכשירים הזמינים בחדר הכושר',
  'נעליים ובגדי אימון, כדי להראות תנועה',
];
export const PHYSIO_QUESTIONS = [
  'עומס על הרגליים: איזה עומס מותר? האם לחיצת רגליים וכפיפת ברך במכונה מתאימות לי, ובאיזה משקל התחלתי?',
  'טווח כיפוף הברך: עד איזו זווית מותר לכופף בעומס (לחיצת רגליים, גשר, כפיפת ברך)?',
  'עומק בלחיצת רגליים: עד איזה עומק לרדת? האם להגביל את הטווח?',
  'אופניים ושחייה: האם אופניים (ובאיזו התנגדות), אליפטי ושחייה מתאימים? האם בעיטת חזה בסדר?',
  'הליכון בשיפוע: האם מותר שיפוע קל? איזו כמות הליכה ביום סבירה?',
  'הגבלות על עומסי זעזוע: האם יש הגבלה על ריצה, קפיצות, ירידות או מדרגות? למשך כמה זמן?',
  'כאב בשוק ימין: מה הסיבה האפשרית? האם צריך בדיקה נוספת לפני העלאת עומס?',
  'הגב: האם התרגילים בתוכנית (חתירה, לחיצות, גשר, בירד דוג, פאלוף) מתאימים לפריצת L1–L2 ולבלט L4–L5? האם לשנות משהו?',
  'חתירה במכונה: האם מותרת כאירובי?',
  'סימני אזהרה: מה הסימנים שאחריהם צריך לעצור ולהתקשר, ומתי לגשת למיון?',
  'סקי: האם סקי מתאים לי עם ה־OCD בברך? באיזו רמה ובאילו מסלולים?',
  'סד/מגן ברך לסקי: האם צריך, ואיזה סוג?',
  'הכנה לסקי: אילו תרגילי רגליים מותרים — עלייה איטית למדרגה נמוכה (10–15 ס״מ), ישיבה רדודה על קיר (ברך מעל 90°), הליכה צידית עם גומייה, גשר על רגל אחת, שיווי משקל על רגל אחת?',
  'המשך: מתי לחזור לבדיקה, ומה צריך להשתנות כדי להעלות עומס?',
];

export const WARMUP = [
  { t: 'אירובי קל · 3–5 דק׳', d: 'אופניים, הליכון או אליפטי בקצב נוח. מרגישים חום, לא מתנשפים.' },
  { t: 'הפעלת ישבן · 1–2 סטים', d: 'גשר ישבן קל: 8–10 חזרות עם החזקה של שנייה למעלה. אפשר גם צדפה: 8–10 לכל צד, בטווח קטן ובלי כאב בברך.' },
  { t: 'חתול־גמל · 8–10 חזרות', d: 'על ארבע, להקשית ולעגל את הגב לאט, בטווח קטן ונוח. לא לכפות טווח.' },
  { t: 'ניידות ירך עדינה · 30–60 שניות', d: 'עיגולי ירך קטנים על ארבע, או נדנוד אגן עדין בשכיבה עם ברכיים כפופות.' },
  { t: 'סט הכנה', d: 'בתרגיל הכוח הראשון: סט קל עם 8–10 חזרות לפני סטים העבודה.' },
];
export const COOLDOWN = [
  'הליכה קלה או אופניים בהתנגדות נמוכה, 3–5 דקות, עד שהנשימה רגועה',
  'מתיחות עדינות, 20–30 שניות לכל מתיחה, בלי כאב ובלי קפיצות',
  'מתיחת שרירי הירך האחוריים בשכיבה על הגב (אפשר עם רצועה)',
  'מתיחת ישבן: קרסול על הברך הנגדית בשכיבה, בטווח נוח לברך',
  'מתיחת חזה וכתף בפתח דלת',
];
