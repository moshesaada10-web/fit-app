import type { WorkoutId } from './data/plan';

export interface SetLog { w: number | null; r: number | null; done: boolean }

export interface ExLog {
  /** התרגיל המקורי בתוכנית (המשבצת) */
  slotId: string;
  /** מה שבוצע בפועל (יכול להיות חלופה) */
  exerciseId: string;
  repMin: number;
  repMax: number;
  plannedSets: number;
  sets: SetLog[];
  skipped?: boolean;
  note?: string;
}

export interface Pain { back: number; shin: number; knee: number }

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  type: WorkoutId;
  createdAt: number;
  exercises: ExLog[];
  notes?: string;
  pain?: Pain;
  /** תרגילים (slotId) שסומנו כמעוררי כאב */
  painTriggers?: string[];
  nextMorning?: 'better' | 'same' | 'worse';
  deload?: boolean;
  /** נרשם בדיעבד, בלי פירוט תרגילים */
  manual?: boolean;
}

export interface CardioEntry {
  id: string;
  date: string;
  type: string;
  minutes: number;
  avgHr?: number | null;
  effort: number;
  distanceKm?: number | null;
  incline?: number | null;
  easy: boolean;
  intervals?: boolean;
  notes?: string;
  createdAt: number;
}

export interface BodyEntry { id: string; date: string; kg: number; waistCm?: number | null; note?: string }

export interface DailyLog {
  date: string;
  protein?: number | null;
  kcal?: number | null;
  steps?: number | null;
  waterL?: number | null;
  sleepH?: number | null;
}

export interface Settings {
  heightCm: number;
  baselineKg: number;
  baselineDate: string;
  goalKg: number;
  /** משקל לפני שמונה חודשים, להקשר בלבד */
  pastKg: number;
  legsCleared: boolean;
  /** מספר אימוני הכוח שהושלמו כשהוחלט להקדים שבוע קל */
  earlyDeloadFrom: number | null;
  stepOverrides: Record<string, number>;
  /** תרגיל -> תאריך שבו המשתמש אישר להמשיך אחרי השהיה */
  pauseCleared: Record<string, string>;
  physioChecked: Record<string, boolean>;
}

export interface Draft {
  type: WorkoutId;
  date: string;
  startedAt: number;
  exercises: ExLog[];
  notes: string;
  deload: boolean;
}

export interface AppState {
  version: 1;
  settings: Settings;
  sessions: Session[];
  cardio: CardioEntry[];
  body: BodyEntry[];
  daily: Record<string, DailyLog>;
  draft: Draft | null;
  /** חלופה מועדפת לכל תרגיל מקורי */
  swapPrefs: Record<string, string>;
}
