import { describe, expect, it } from 'vitest';
import { SKI_EXERCISES, SKI_FINISHERS } from '../src/data/ski';
import { PHYSIO_QUESTIONS, findExercise } from '../src/data/plan';
import { musclesOf, primaryGroup } from '../src/data/muscles';
import { cardioPlanFor, skiCardio, skiFinisher, skiIntervalsAllowed, skiWeek } from '../src/logic/ski';
import { buildDraft } from '../src/logic/workout';
import { orderByPriority } from '../src/logic/adjust';
import { emptyState, parseBackup } from '../src/store';
import { addDays } from '../src/logic/dates';
import type { AppState } from '../src/types';

const TRIP = '2027-01-07';
const START = addDays(TRIP, -84); // 2026-10-15
const st = (over: Partial<AppState['settings']> = {}): AppState => { const s = emptyState(); s.settings = { ...s.settings, ...over }; return s; };
const noDeload = { deload: false };

describe('ski prep: settings', () => {
  it('defaults on with trip 2027-01-07', () => {
    const s = emptyState().settings;
    expect(s.skiPrep).toBe(true);
    expect(s.skiTripDate).toBe(TRIP);
  });
  it('old backup without ski fields gets defaults; bad date repaired; explicit off kept', () => {
    const old = { version: 1, sessions: [], cardio: [], body: [], settings: { legsCleared: true } };
    expect(parseBackup(JSON.stringify(old)).settings).toMatchObject({ skiPrep: true, skiTripDate: TRIP, legsCleared: true });
    const bad = { ...old, settings: { skiPrep: false, skiTripDate: 'xx' } };
    expect(parseBackup(JSON.stringify(bad)).settings).toMatchObject({ skiPrep: false, skiTripDate: TRIP });
  });
  it('round-trips through export JSON', () => {
    const s = st({ skiPrep: false, skiTripDate: '2027-02-01' });
    expect(parseBackup(JSON.stringify(s)).settings).toMatchObject({ skiPrep: false, skiTripDate: '2027-02-01' });
  });
});

describe('ski prep: weeks and taper', () => {
  const S = st().settings;
  it('off or after trip -> null', () => {
    expect(skiWeek({ ...S, skiPrep: false }, '2026-11-01')).toBeNull();
    expect(skiWeek(S, '2027-01-08')).toBeNull();
  });
  it('before block start = week 1, before', () => {
    expect(skiWeek(S, '2026-10-07')).toMatchObject({ week: 1, before: true, daysLeft: 92, stage: 0 });
  });
  it('week boundaries and stages', () => {
    expect(skiWeek(S, START)).toMatchObject({ week: 1, stage: 0, before: false });
    expect(skiWeek(S, addDays(START, 27))?.week).toBe(4);
    expect(skiWeek(S, addDays(START, 28))).toMatchObject({ week: 5, stage: 1 });
    expect(skiWeek(S, addDays(START, 56))).toMatchObject({ week: 9, stage: 2 });
    expect(skiWeek(S, TRIP)).toMatchObject({ week: 12, daysLeft: 0, taper: true });
  });
  it('taper = last 7 days', () => {
    expect(skiWeek(S, addDays(TRIP, -8))?.taper).toBe(false);
    expect(skiWeek(S, addDays(TRIP, -7))?.taper).toBe(true);
  });
  it('trip date is editable', () => {
    expect(skiWeek({ ...S, skiTripDate: '2027-02-04' }, '2027-01-08')).toMatchObject({ week: 9, daysLeft: 27 });
  });
});

describe('ski prep: finisher', () => {
  it('2-3 items per workout, every listed exercise used, safe movement list', () => {
    for (const t of ['A', 'B', 'C'] as const) expect(SKI_FINISHERS[t].length).toBeGreaterThanOrEqual(2);
    const all = new Set(Object.values(SKI_FINISHERS).flat());
    for (const id of ['ski-band-walk', 'ski-sl-bridge', 'ski-side-plank', 'ski-pallof', 'ski-dead-bug', 'ski-balance', 'ski-step-up', 'ski-wall-sit']) expect(all.has(id)).toBe(true);
    const txt = Object.values(SKI_EXERCISES).map((e) => e.he + e.doIt).join(' ');
    expect(txt).not.toMatch(/קפיצ(ה|ות)(?! )|ניתור|סקוואט עמוק/);
  });
  it('every ski exercise has muscle tags and resolves via findExercise', () => {
    for (const id of Object.keys(SKI_EXERCISES)) { expect(musclesOf(id).length).toBeGreaterThan(0); expect(findExercise(id)?.he).toBeTruthy(); }
    expect(primaryGroup('ski-side-plank')).toBe('core');
  });
  it('images only where an existing illustration matches', () => {
    const withImg = Object.values(SKI_EXERCISES).filter((e) => e.image).map((e) => e.id).sort();
    expect(withImg).toEqual(['ski-pallof', 'ski-side-plank', 'ski-sub-bridge']);
  });
  it('legs gating: step-up/wall sit substituted without clearance', () => {
    const b = skiFinisher(st({ legsCleared: false }).settings, 'B', '2026-11-01', noDeload);
    expect(b.map((x) => x.exerciseId)).toEqual(['ski-sl-bridge', 'ski-pallof', 'ski-sub-clamshell']);
    expect(b[2].swapped).toBe(true);
    const c = skiFinisher(st({ legsCleared: false }).settings, 'C', '2026-11-01', noDeload);
    expect(c.map((x) => x.exerciseId)).toContain('ski-sub-bridge');
    expect(c.map((x) => x.exerciseId)).not.toContain('ski-wall-sit');
    const cl = skiFinisher(st({ legsCleared: true }).settings, 'C', '2026-11-01', noDeload);
    expect(cl.map((x) => x.exerciseId)).toContain('ski-wall-sit');
    expect(SKI_EXERCISES['ski-wall-sit'].legs && SKI_EXERCISES['ski-step-up'].legs).toBe(true);
  });
  it('progression: holds and sets grow by stage; balance cue progresses', () => {
    const S = st().settings;
    const at = (d: string) => skiFinisher(S, 'A', d, noDeload);
    const w1 = at(START), w5 = at(addDays(START, 28)), w9 = at(addDays(START, 56));
    const plank = (l: ReturnType<typeof at>) => l.find((x) => x.slotId === 'ski-side-plank')!;
    expect(plank(w1).dose).toBeLessThan(plank(w5).dose);
    expect(plank(w5).dose).toBeLessThan(plank(w9).dose);
    const sets = (l: ReturnType<typeof at>) => l.reduce((n, x) => n + x.sets, 0);
    expect(sets(w1)).toBeLessThan(sets(w5));
    const bal = (l: ReturnType<typeof at>) => l.find((x) => x.slotId === 'ski-balance')!.cue;
    expect(bal(w1)).toMatch(/מבט קדימה/);
    expect(bal(w5)).toMatch(/רך/);
    expect(bal(w9)).toMatch(/סיבובי ראש/);
  });
  it('deload week and taper reduce sets ~40%, not stacked', () => {
    const S = st().settings;
    const d = addDays(START, 60);
    const full = skiFinisher(S, 'A', d, noDeload).reduce((n, x) => n + x.sets, 0);
    const del = skiFinisher(S, 'A', d, { deload: true }).reduce((n, x) => n + x.sets, 0);
    expect(del).toBeLessThanOrEqual(Math.ceil(full * 0.7));
    const taper = skiFinisher(S, 'A', addDays(TRIP, -3), noDeload).reduce((n, x) => n + x.sets, 0);
    const both = skiFinisher(S, 'A', addDays(TRIP, -3), { deload: true }).reduce((n, x) => n + x.sets, 0);
    expect(taper).toBe(del); expect(both).toBe(taper);
  });
  it('off -> no finisher', () => {
    expect(skiFinisher(st({ skiPrep: false }).settings, 'A', '2026-11-01', noDeload)).toEqual([]);
  });
});

describe('ski prep: draft and reorder', () => {
  it('finisher appended after main lifts, flagged ski', () => {
    const s = st();
    const d = buildDraft(s, 'A', '2026-11-01');
    const idx = d.exercises.findIndex((e) => e.ski);
    expect(idx).toBe(8);
    expect(d.exercises.slice(idx).every((e) => e.ski)).toBe(true);
    expect(d.exercises.slice(0, idx).some((e) => e.ski)).toBe(false);
  });
  it('weekly legs priority does not move ski items before main lifts', () => {
    const s = st();
    s.adjustment = { fromWeek: '2026-10-25', approvedOn: '2026-11-01', until: '2026-11-07', priority: [{ group: 'legs', reason: 'x' }], boosts: [] };
    const d = buildDraft(s, 'A', '2026-11-02');
    const first = d.exercises.findIndex((e) => e.ski);
    expect(d.exercises.slice(first).every((e) => e.ski)).toBe(true);
    expect(d.exercises.length).toBe(11);
    expect(orderByPriority([{ exerciseId: 'ski-band-walk' }], [{ group: 'legs', reason: 'x' }])).toHaveLength(1);
  });
  it('no ski items when off', () => {
    expect(buildDraft(st({ skiPrep: false }), 'A', '2026-11-01').exercises.some((e) => e.ski)).toBe(false);
  });
});

describe('ski prep: cardio', () => {
  const S = st().settings;
  const base = { min: 30, max: 30, easy: false };
  it('bike progresses to 40-45, taper reduces', () => {
    expect(skiCardio(skiWeek(S, addDays(START, 60)), base, false)).toEqual({ min: 40, max: 45, easy: false });
    expect(skiCardio(skiWeek(S, addDays(TRIP, -2)), base, false).max).toBeLessThan(30);
    expect(skiCardio(skiWeek(S, addDays(START, 60)), base, true)).toEqual(base);
    expect(skiCardio(null, base, false)).toEqual(base);
  });
  it('intervals from week 7, not with pain/deload/taper', () => {
    expect(skiIntervalsAllowed(skiWeek(S, addDays(START, 35)), false, false)).toBe(false); // week 6
    expect(skiIntervalsAllowed(skiWeek(S, addDays(START, 42)), false, false)).toBe(true); // week 7
    expect(skiIntervalsAllowed(skiWeek(S, addDays(START, 42)), false, true)).toBe(false);
    expect(skiIntervalsAllowed(skiWeek(S, addDays(START, 42)), true, false)).toBe(false);
    expect(skiIntervalsAllowed(skiWeek(S, addDays(TRIP, -1)), false, false)).toBe(false);
    expect(cardioPlanFor(S, addDays(START, 42), { deload: false, early: false } as never, base, false).skiIntervals).toBe(true);
  });
});

describe('physio checklist', () => {
  it('includes ski questions', () => {
    const t = PHYSIO_QUESTIONS.join(' ');
    expect(t).toMatch(/סקי.*OCD/); expect(t).toMatch(/סד|מגן ברך/); expect(t).toMatch(/אילו תרגילי רגליים מותרים/);
  });
});
