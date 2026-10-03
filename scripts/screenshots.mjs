// צילומי מסך 390x844 של המסכים המרכזיים. דורש: npm run build, ואז vite preview רץ על 4173.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:4173/';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(12); return iso(d); };

function seed() {
  const slots = {
    A: [['chest-press', 8, 12, 40], ['seated-row', 10, 12, 35], ['glute-bridge', 12, 12, 0], ['lat-pulldown', 10, 12, 35], ['lateral-raise', 12, 15, 4], ['clamshell', 10, 10, 0], ['bird-dog', 8, 8, 0], ['side-plank', 20, 30, 0]],
    B: [['chest-supported-row', 8, 12, 30], ['glute-bridge', 10, 12, 0], ['shoulder-press', 8, 12, 20], ['lat-pulldown', 8, 12, 35], ['face-pull', 12, 15, 15]],
    C: [['incline-press', 8, 12, 30], ['seated-row', 10, 12, 35], ['lateral-raise', 12, 15, 4], ['biceps-curl', 10, 12, 6], ['triceps-ext', 10, 12, 15]],
  };
  const plan = [[17, 'A'], [15, 'B'], [13, 'C'], [10, 'A'], [8, 'B'], [6, 'C'], [3, 'A']];
  let t = 1;
  const sessions = plan.map(([ago, type], k) => ({
    id: 's' + k, date: daysAgo(ago), type, createdAt: t++, deload: false,
    pain: { back: k === 4 ? 4 : 1, shin: 0, knee: k === 2 ? 2 : 0 }, painTriggers: k === 4 ? ['shoulder-press'] : [], nextMorning: k < 6 ? (k === 4 ? 'same' : 'better') : undefined,
    exercises: slots[type].map(([id, a, b, w]) => ({
      slotId: id, exerciseId: id, repMin: a, repMax: b, plannedSets: 2,
      sets: [0, 1].map((i) => ({ w: w || null, r: Math.min(b, a + 1 + k + i), done: true })),
    })),
  }));
  const cardio = [[16, 'bike', 25, 118, 3], [12, 'incline-walk', 25, 112, 3], [9, 'elliptical', 30, 121, 4], [5, 'bike', 30, 116, 3], [2, 'swim', 30, null, 4]].map(([ago, type, minutes, hr, effort], i) => ({
    id: 'c' + i, date: daysAgo(ago), type, minutes, avgHr: hr, effort, easy: effort <= 4, createdAt: i,
  }));
  const body = [[21, 90.0, 99.0], [14, 89.7, 98.5], [7, 89.2, 98.0], [0, 88.9, 97.5]].map(([ago, kg, waist], i) => ({ id: 'b' + i, date: daysAgo(ago), kg, waistCm: waist }));
  const daily = {};
  for (let i = 0; i < 12; i++) daily[daysAgo(i)] = { date: daysAgo(i), protein: 130 + ((i * 17) % 50), kcal: 1850 + ((i * 53) % 250), steps: 6500 + ((i * 731) % 4200), sleepH: 6.5 + ((i * 3) % 4) / 2, waterL: 2 };
  return {
    version: 1,
    settings: { heightCm: 175, baselineKg: 90, baselineDate: daysAgo(21), goalKg: 85, pastKg: 114, legsCleared: false, earlyDeloadFrom: null, stepOverrides: {}, pauseCleared: {}, physioChecked: { b0: true } },
    sessions, cardio, body, daily, draft: null, swapPrefs: {},
  };
}

const shots = [
  ['01-today-empty', '#/today', { seed: false }],
  ['02-today', '#/today', {}],
  ['02b-today-scrolled', '#/today', { scrollY: 560 }],
  ['03-workout-chest-press', '#/workout', { start: true, openIdx: 0 }],
  ['03b-workout-set-logging', '#/workout', { start: true, openIdx: 0, toSets: true }],
  ['04-workout-swap', '#/workout', { start: true, openIdx: 0, click: 'החלף תרגיל' }],
  ['05-workout-text-only-card', '#/workout', { start: true, openIdx: 5, forceScroll: true }],
  ['06-finish-pain', '#/workout/finish', { start: true, fill: true, pain: true }],
  ['07-log-calendar', '#/log', {}],
  ['08-session-detail', '#/session/s3', {}],
  ['09-cardio-form', '#/cardio/new', {}],
  ['10-progress-body', '#/progress/body', {}],
  ['11-progress-nutrition', '#/progress/nutrition', {}],
  ['12-progress-strength', '#/progress/strength', {}],
  ['13-progress-cardio', '#/progress/cardio', {}],
  ['14-plan-12-weeks', '#/progress/plan', {}],
  ['15-safety', '#/safety', {}],
  ['16-physio-checklist', '#/safety/physio', {}],
  ['17-settings', '#/settings', {}],
  ['18-today-dark', '#/today', { dark: true }],
  ['19-workout-dark', '#/workout', { dark: true, start: true, openIdx: 0 }],
];

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [name, hash, o] of shots) {
  if (process.env.ONLY && !name.startsWith(process.env.ONLY)) continue;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', colorScheme: o.dark ? 'dark' : 'light', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  if (o.seed !== false) await page.addInitScript((s) => { if (!localStorage.getItem('moshe-fitness-v1')) localStorage.setItem('moshe-fitness-v1', JSON.stringify(s)); }, seed());
  await page.goto(BASE + '#/today');
  await page.waitForSelector('.nav');
  if (o.start) {
    await page.getByRole('button', { name: /התחל אימון/ }).click();
    await page.waitForSelector('.ex');
    if (o.fill) {
      // סימון סטים ראשונים
      for (let k = 0; k < 3; k++) { await page.locator('.ex-head').nth(k).click(); await page.locator('.check').first().click().catch(() => {}); await page.locator('.check').nth(1).click().catch(() => {}); }
    }
  }
  if (hash !== '#/today' && !(o.start && hash === '#/workout')) await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(300);
  if (o.start && hash === '#/workout') {
    const heads = page.locator('.ex-head');
    const i = o.openIdx ?? 0;
    // סגור הפתוח, פתח הרצוי
    await page.evaluate(() => document.querySelectorAll('.ex-head[aria-expanded="true"]').forEach((b) => b.click()));
    await heads.nth(i).click();
    await page.waitForTimeout(250);
    if (o.click) { await page.getByRole('button', { name: o.click }).first().click(); await page.waitForTimeout(250); }
    else if (o.toSets) { await page.locator('.set').first().locator('input').nth(0).fill('30'); await page.locator('.set').first().locator('input').nth(1).fill('10'); await page.locator('.set').first().locator('.check').click(); await page.locator('.set').first().evaluate((el) => el.scrollIntoView({ block: 'center' })); }
    else if (i === 0) await page.evaluate(() => window.scrollTo(0, 260));
    else await page.evaluate((n) => document.querySelectorAll('.ex')[n].scrollIntoView(), i);
    await page.waitForTimeout(200);
  }
  if (o.pain) {
    await page.locator('.pain-grid').first().getByRole('radio', { name: '5', exact: true }).click();
    await page.locator('.pain-grid').nth(2).getByRole('radio', { name: '2', exact: true }).click();
    await page.locator('.chip.on, button.chip').first().click().catch(() => {});
    await page.getByText('כאב עכשיו').first().scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 80));
  }
  if (o.scrollY) await page.evaluate((y) => window.scrollTo(0, y), o.scrollY);
  if (o.scrollTo) { await page.getByText(o.scrollTo).first().scrollIntoViewIfNeeded(); }
  await page.waitForTimeout(300);
  if (process.env.DEBUG_SCROLL) console.log('scrollY', await page.evaluate(() => [scrollY, document.querySelector('.set')?.getBoundingClientRect().top]));
  await page.screenshot({ path: `${OUT}${name}.png` });
  // בדיקת גלישה אופקית
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(name.padEnd(30), overflow > 0 ? `OVERFLOW ${overflow}px` : 'ok', errors.length ? 'ERR ' + errors.join('|') : '');
  await ctx.close();
}
await browser.close();
