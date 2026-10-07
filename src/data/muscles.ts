// תיוג קבוצות שרירים לכל תרגיל וחלופה. הקבוצה הראשונה היא העיקרית ורק היא נספרת בסיכום השבועי.
// בחירה של האפליקציה (לא מהחוברת), לצורך איזון שבועי בלבד.
import { ALTERNATIVES, EXERCISES } from './plan';
import { SKI_EXERCISES } from './ski';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'hamstrings' | 'arms' | 'core';

export const GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'legs', 'hamstrings', 'arms', 'core'];

/** שם בעברית + מין דקדוקי (לניסוח "עבד/עבדה/עבדו יפה") */
export const GROUP_HE: Record<MuscleGroup, { he: string; g: 'm' | 'f' | 'p'; short?: string }> = {
  chest: { he: 'חזה', g: 'm' },
  back: { he: 'גב', g: 'm' },
  shoulders: { he: 'כתפיים', g: 'p' },
  legs: { he: 'רגליים וישבן', g: 'p', short: 'רגליים' },
  hamstrings: { he: 'ירך אחורית', g: 'f' },
  arms: { he: 'ידיים', g: 'p' },
  core: { he: 'ליבה', g: 'f' },
};

/**
 * קבוצות שמותר להקדים לתחילת האימון. ליבה וידיים נשארות בסוף בכוונה:
 * עייפות של שרירי הליבה לפני תרגילים מורכבים מסוכנת לגב (פריצת דיסק), וידיים מעייפות את הלחיצות והמשיכות.
 */
export const REORDER_GROUPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'legs', 'hamstrings'];
/** קבוצות רגליים: בלי סט נוסף כל עוד אין אישור פיזיו */
export const LEG_GROUPS: MuscleGroup[] = ['legs', 'hamstrings'];

export const MUSCLES: Record<string, MuscleGroup[]> = {
  // תרגילי התוכנית
  'chest-press': ['chest', 'shoulders', 'arms'],
  'seated-row': ['back', 'arms'],
  'leg-press': ['legs'],
  'lat-pulldown': ['back', 'arms'],
  'lateral-raise': ['shoulders'],
  'leg-curl': ['hamstrings'],
  'bird-dog': ['core'],
  'side-plank': ['core'],
  'chest-supported-row': ['back', 'arms'],
  'glute-bridge': ['legs', 'hamstrings'],
  'shoulder-press': ['shoulders', 'arms'],
  'face-pull': ['shoulders', 'back'],
  'pallof-press': ['core'],
  'incline-press': ['chest', 'shoulders', 'arms'],
  'biceps-curl': ['arms'],
  'triceps-ext': ['arms'],
  // חלופות
  'alt-incline-machine': ['chest', 'shoulders'],
  'alt-cable-fly': ['chest'],
  'alt-pec-deck': ['chest'],
  'alt-incline-pushup': ['chest', 'arms', 'core'],
  'alt-machine-chest': ['chest', 'shoulders', 'arms'],
  'alt-csr': ['back', 'arms'],
  'alt-seated-row': ['back', 'arms'],
  'alt-one-arm-row': ['back', 'arms'],
  'alt-reverse-fly': ['shoulders', 'back'],
  'alt-neutral-pulldown': ['back', 'arms'],
  'alt-straight-arm': ['back'],
  'alt-glute-bridge': ['legs', 'hamstrings'],
  'alt-clamshell': ['legs'],
  'alt-hip-abduction': ['legs'],
  'alt-cable-lateral': ['shoulders'],
  'alt-seated-lateral': ['shoulders'],
  'alt-neutral-db-press': ['shoulders', 'arms'],
  'alt-band-pullapart': ['shoulders', 'back'],
  'alt-dead-bug': ['core'],
  'alt-birddog-arm': ['core'],
  'alt-pallof': ['core'],
  'alt-cable-curl': ['arms'],
  'alt-hammer': ['arms'],
  'alt-rope-pushdown': ['arms'],
  'alt-band-pushdown': ['arms'],
  // הכנה לסקי
  'ski-band-walk': ['legs'],
  'ski-sl-bridge': ['legs', 'hamstrings'],
  'ski-side-plank': ['core'],
  'ski-pallof': ['core'],
  'ski-dead-bug': ['core'],
  'ski-balance': ['legs'],
  'ski-step-up': ['legs'],
  'ski-wall-sit': ['legs'],
  'ski-sub-clamshell': ['legs'],
  'ski-sub-bridge': ['legs', 'hamstrings'],
};

export function musclesOf(id: string): MuscleGroup[] {
  return MUSCLES[id] ?? [];
}
/** הקבוצה העיקרית; ליבה כברירת מחדל לתרגיל לא מוכר (לא מוקדם ולא מקבל סט נוסף בטעות) */
export function primaryGroup(id: string): MuscleGroup {
  return MUSCLES[id]?.[0] ?? 'core';
}

/** כל המזהים שצריכים תיוג (לבדיקות) */
export function allExerciseIds(): string[] {
  const ids = new Set<string>(Object.keys(EXERCISES));
  for (const list of Object.values(ALTERNATIVES)) for (const a of list) ids.add(a.id);
  for (const id of Object.keys(SKI_EXERCISES)) ids.add(id);
  return [...ids];
}

/** "רגליים וחזה" / "חזה, גב וכתפיים" */
export function joinHe(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} ו${words[words.length - 1]}`;
}
/** רשימת קבוצות בעברית; short = שם קצר ("רגליים") כדי שהחיבור ב־ו׳ לא יתבלבל */
export function groupsHe(gs: MuscleGroup[], short = false): string { return joinHe(gs.map((g) => (short && GROUP_HE[g].short) || GROUP_HE[g].he)); }
