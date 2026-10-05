// בדיקת נגישות בסיסית: יעדי מגע קטנים, טקסט שנחתך, גלישה אופקית — ב-390x844
import { chromium } from 'playwright-core';
import { REVIEW_NOW, reviewSeed } from './review-seed.mjs';
const BASE = process.env.BASE || 'http://localhost:4173/';
const routes = ['#/today', '#/workout', '#/workout/finish', '#/log', '#/session/s3', '#/cardio/new', '#/progress/body', '#/progress/nutrition', '#/progress/strength', '#/progress/cardio', '#/progress/plan', '#/safety', '#/safety/physio', '#/settings', '#/review'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
await page.addInitScript((a) => localStorage.setItem('moshe-fitness-v1', JSON.stringify({ version: 1, settings: { heightCm: 175, baselineKg: 90, baselineDate: a, goalKg: 85, pastKg: 114, legsCleared: false, earlyDeloadFrom: null, stepOverrides: {}, pauseCleared: {}, physioChecked: {} }, sessions: [{ id: 's3', date: a, type: 'A', createdAt: 1, exercises: [], manual: true }], cardio: [], body: [], daily: {}, draft: null, swapPrefs: {} })), ago(5));
await page.goto(BASE + '#/today');
await page.getByRole('button', { name: /התחל אימון/ }).click();
async function check(page, r) {
  const res = await page.evaluate(() => {
    const out = { small: [], clipped: [], overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, narrowInputs: [] };
    document.querySelectorAll('button, a, input:not([type=hidden]), select, summary, [role=radio]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (el.tagName === 'INPUT' && el.type === 'checkbox') { if (r.width < 24) out.small.push('checkbox ' + r.width); return; }
      if (r.height < 43.5 || r.width < 43.5) out.small.push(`${el.tagName} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      if (el.tagName === 'INPUT' && el.type !== 'checkbox' && r.width < 56 && cs.display !== 'none') out.narrowInputs.push(Math.round(r.width));
    });
    document.querySelectorAll('body *').forEach((el) => {
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') out.clipped.push((el.textContent || '').slice(0, 30));
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && !el.closest('.scroll-x') && !el.closest('.seg') && !el.closest('svg')) out.clipped.push('outside:' + el.tagName + '.' + el.className + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    });
    return out;
  });
  console.log(r.padEnd(24), 'overflow', res.overflow, '| small', JSON.stringify([...new Set(res.small)]), '| clipped', JSON.stringify([...new Set(res.clipped)].slice(0, 6)), '| narrowInputs', JSON.stringify(res.narrowInputs));
}
for (const r of routes) {
  await page.evaluate((h) => { location.hash = h; }, r);
  await page.waitForTimeout(250);
  // פתח את כל התרגילים באימון כדי לבדוק גם אותם
  if (r === '#/workout') { for (const b of await page.locator('.ex-head[aria-expanded="false"]').all()) await b.click(); await page.waitForTimeout(200); }
  await check(page, r);
}
// סיכום שבועי עם נתוני הדגמה (שישי 9.10.2026)
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Jerusalem', serviceWorkers: 'block' });
const p2 = await ctx2.newPage();
await p2.clock.setFixedTime(new Date(REVIEW_NOW));
await p2.addInitScript((s) => { if (!localStorage.getItem('moshe-fitness-v1')) localStorage.setItem('moshe-fitness-v1', JSON.stringify(s)); }, reviewSeed());
await p2.goto(BASE + '#/today'); await p2.waitForTimeout(300);
await check(p2, 'demo #/today');
await p2.evaluate(() => { location.hash = '#/review'; }); await p2.waitForTimeout(300);
await p2.locator('details summary').click().catch(() => {});
await check(p2, 'demo #/review');
await p2.getByRole('button', { name: 'אשר שינויים' }).click();
await p2.getByRole('button', { name: 'השאר ראשון קבוע' }).first().click();
await check(p2, 'demo #/review approved');
await p2.evaluate(() => { location.hash = '#/settings'; }); await p2.waitForTimeout(300);
await check(p2, 'demo #/settings');
await p2.evaluate(() => { location.hash = '#/today'; }); await p2.waitForTimeout(300);
await p2.getByRole('button', { name: /התחל אימון/ }).click(); await p2.waitForTimeout(300);
await check(p2, 'demo #/workout');
await browser.close();
