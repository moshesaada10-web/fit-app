// בדיקת זרימה מלאה בדפדפן + אופליין. דורש vite preview על 4173.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { REVIEW_NOW, reviewSeed } from './review-seed.mjs';
const BASE = process.env.BASE || 'http://localhost:4173/';
let fails = 0;
const vis = (loc) => loc.first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false);
const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(BASE);
await page.waitForSelector('h1');
ok(await vis(page.getByText('אימון A', { exact: true })), 'אימון ראשון הוא A');

// ---- אימון A
await page.getByRole('button', { name: /התחל אימון A/ }).click();
await page.waitForSelector('.ex');
const names = await page.locator('.ex-head .bold').allTextContents();
ok(names.length === 11, `8 תרגילים + 3 סיום סקי באימון A (${names.length})`);
ok(names.slice(8).join('|') === 'הליכה צידית עם גומייה|פלאנק צד (סקי)|שיווי משקל על רגל אחת', 'סיום סקי בסוף אימון A');
ok(await vis(page.getByText('סיום: הכנה לסקי')), 'כותרת סיום סקי');
ok(!names.includes('לחיצת רגליים') && !names.includes('כפיפת ברך במכונה בישיבה'), 'רגליים מוחלפות בלי אישור פיזיו');
// מלא את הסט הראשון בתרגיל הפתוח
await page.locator('.set').first().locator('input').nth(0).fill('40');
await page.locator('.set').first().locator('input').nth(1).fill('10');
await page.locator('.set').first().locator('.check').click();
ok(await page.locator('.set.done').count() === 1, 'סט סומן כבוצע');
// החלפת תרגיל
await page.getByRole('button', { name: /החלף תרגיל/ }).first().click();
ok(await vis(page.getByText('לחיצה בשיפוע במכונה')), 'חלופות מוצגות');
await page.getByRole('button', { name: /פרפר בכבל/ }).click();
ok((await page.locator('.ex-head .bold').first().textContent()).includes('פרפר בכבל'), 'החלפה בוצעה');
ok(await vis(page.getByText('אין איור לתרגיל הזה')), 'כרטיס טקסט בלבד לחלופה בלי איור');
// רענון: הטיוטה נשמרת
await page.reload(); await page.waitForSelector('.ex');
ok((await page.locator('.ex-head .bold').first().textContent()).includes('פרפר בכבל'), 'טיוטה נשמרה אחרי רענון');
// החזרה לתרגיל המקורי ומילוי
await page.getByRole('button', { name: /החלף תרגיל/ }).first().click();
await page.getByRole('button', { name: /לחיצת חזה במכונה/ }).first().click();
await page.locator('.set').first().locator('input').nth(0).fill('40');
await page.locator('.set').first().locator('input').nth(1).fill('12');
await page.locator('.set').first().locator('.check').click();
await page.locator('.set').nth(1).locator('input').nth(1).fill('12');
await page.locator('.set').nth(1).locator('.check').click();
await page.getByRole('button', { name: 'סיים אימון' }).click();
await page.waitForSelector('text=כאב עכשיו');
await page.locator('.pain-grid').first().getByRole('radio', { name: '5', exact: true }).click();
ok(await vis(page.getByText('איזה תרגיל עורר את הכאב')), 'כאב ≥4 מציג כלל הכאב');
await page.getByRole('button', { name: 'לחיצת חזה במכונה' }).click();
await page.getByRole('button', { name: 'שמור אימון' }).click();
ok(await vis(page.getByText('סט אחד פחות')), 'המלצת כאב: סט אחד פחות');
await page.getByRole('link', { name: 'חזרה להיום' }).click();
ok(await vis(page.getByText('אימון B', { exact: true })), 'אחרי A הבא B');

// ---- אימון בדיעבד: C מוקדם לא משנה? מוסיפים B בתאריך עתידי-קרוב -> הבא C
await page.getByRole('link', { name: 'יומן' }).click();
await page.getByRole('button', { name: 'כוח', exact: true }).click();
ok(await vis(page.getByText('לפי הסדר מוצע')), 'הוספת אימון בדיעבד: מוצע לפי הסדר');
await page.getByRole('button', { name: 'שמור' }).click();
ok((await page.locator('.cal .mk').count()) >= 2, 'שני אימונים בלוח');
await page.getByRole('link', { name: 'היום' }).click();
ok(await vis(page.getByText('אימון C', { exact: true })), 'אחרי A,B הבא C');

// ---- הקדמת שבוע קל
await page.getByRole('button', { name: 'הקדם שבוע קל' }).click();
await page.getByRole('button', { name: 'כן, הקדם' }).click();
ok(await vis(page.getByText('שבוע קל שהקדמת')), 'שבוע קל הוקדם');
await page.getByRole('button', { name: 'בטל הקדמה' }).click();

// ---- אירובי
await page.getByRole('link', { name: 'רשום אירובי' }).click();
await page.getByRole('button', { name: 'אליפטי' }).click();
ok(await page.locator('#int').isDisabled(), 'אינטרוולים חסומים לפני שבוע 9');
await page.getByRole('button', { name: 'שמור' }).click();
await page.waitForSelector('text=דקות בכל אימון');
ok(await vis(page.getByText('אליפטי · 25 דק׳')), 'אירובי נשמר (25 דק׳ בשבוע 1)');

// ---- שקילה
await page.getByRole('button', { name: 'גוף' }).click();
await page.getByRole('button', { name: 'שקילה / מותניים' }).click();
await page.locator('.sheet .input').nth(1).fill('89.6');
await page.getByRole('button', { name: 'שמור' }).click();
ok(await vis(page.getByText('89.6')), 'שקילה נשמרה');

// ---- גיבוי/ייבוא/איפוס
await page.goto(BASE + '#/settings');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /ייצוא גיבוי/ }).click()]);
const path = '/tmp/backup.json'; await dl.saveAs(path);
const j = JSON.parse(fs.readFileSync(path, 'utf8'));
ok(j.data.sessions.length === 2 && j.data.cardio.length === 1 && j.data.body.length === 1, 'הגיבוי כולל את הנתונים');
await page.getByRole('button', { name: 'מחק הכול' }).first().click();
await page.getByRole('button', { name: 'מחק הכול' }).last().click();
await page.waitForTimeout(200);
ok((await page.evaluate(() => JSON.parse(localStorage.getItem('moshe-fitness-v1')).sessions.length)) === 0, 'איפוס מחק נתונים');
await page.locator('input[type=file]').setInputFiles(path);
await page.getByRole('button', { name: 'ייבא והחלף' }).click();
await page.waitForTimeout(200);
ok((await page.evaluate(() => JSON.parse(localStorage.getItem('moshe-fitness-v1')).sessions.length)) === 2, 'ייבוא שחזר נתונים');
fs.writeFileSync('/tmp/bad.json', '{"hello":1}');
await page.locator('input[type=file]').setInputFiles('/tmp/bad.json');
ok(await vis(page.getByText('זה לא קובץ גיבוי של האפליקציה')), 'קובץ לא תקין נדחה');

// ---- בטיחות
await page.getByRole('link', { name: 'בטיחות' }).click();
ok(await vis(page.getByText('שליטה בשתן או בצואה')), 'עמוד בטיחות עם דגלים אדומים');
await page.getByRole('button', { name: /רשימה לפיזיותרפיסט/ }).click();
ok(await vis(page.getByText('מה להביא')), 'רשימת פיזיו');

// ---- PWA / אופליין
await page.goto(BASE);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(1500);
const man = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
ok(man.dir === 'rtl' && man.lang === 'he' && man.display === 'standalone' && man.icons.length >= 3, 'manifest תקין');
await page.reload(); await page.waitForTimeout(800);
ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker שולט בדף');
await ctx.setOffline(true);
await page.reload();
await page.waitForSelector('h1');
ok(await vis(page.getByText('שלום משה')), 'נטען אופליין');
await page.evaluate(() => { location.hash = '#/workout'; });
await page.waitForTimeout(300);
await page.evaluate(() => { location.hash = '#/today'; });
await page.getByRole('button', { name: /התחל אימון|המשך אימון/ }).click();
await page.waitForSelector('.ex-head');
await page.locator('.ex-head').nth(1).click();
const imgOk = await page.evaluate(async () => { const im = document.querySelector('img.demo'); if (!im) return 'none'; await im.decode().catch(() => {}); return im.naturalWidth > 0; });
ok(imgOk === true, 'איור דמו נטען אופליין');

// ---- סיכום שבועי: שעון קבוע (שישי), נתוני הדגמה בפורמט הישן (בלי השדות החדשים) = בדיקת הגירה
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Jerusalem', serviceWorkers: 'block', acceptDownloads: true });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errs.push(String(e)));
await p2.clock.setFixedTime(new Date(REVIEW_NOW));
await p2.addInitScript((s) => { if (!localStorage.getItem('moshe-fitness-v1')) localStorage.setItem('moshe-fitness-v1', JSON.stringify(s)); }, reviewSeed());
await p2.goto(BASE + '#/today');
await p2.waitForSelector('.nav');
ok(await vis(p2.getByRole('heading', { name: 'סיכום שבועי' })), 'כרטיס סיכום שבועי ביום שישי');
await p2.getByRole('button', { name: 'לסיכום השבוע' }).click();
ok(await vis(p2.getByText(/פספסת רגליים, חזה וכתפיים. גב, ידיים וליבה עבדו יפה/)), 'פסיקה: פספסת רגליים, חזה וכתפיים; גב עבד יפה');
ok(await vis(p2.getByText('15/15')), 'גב: 15/15 סטים');
ok(await vis(p2.getByText('תרגילים שדילגת עליהם')), 'רשימת דילוגים');
ok(await vis(p2.getByText('דילגתי על הגשר', { exact: false })), 'הערות כאב מוצגות');
ok(await vis(p2.getByText('סט אחד נוסף בהרחקת כתפיים לצדדים')), 'הצעת סט נוסף (כתפיים, אימון C)');
ok(await vis(p2.getByText(/בלי סט נוסף לחזה: כבר במקסימום/)), 'חזה: אין סט מעל מקסימום התוכנית');
ok(await vis(p2.getByText(/השאר ראשון קבוע|החלף לצמיתות/)), 'הצעות דפוס אחרי 3+ שבועות');
await p2.getByRole('button', { name: 'אשר שינויים' }).click();
ok(await vis(p2.getByText(/השינויים פעילים עד שבת 17.10/)), 'ההתאמה אושרה עד שבת הבאה');
await p2.getByRole('button', { name: 'השאר ראשון קבוע' }).first().click();
await p2.getByRole('link', { name: 'חזרה להיום' }).click();
ok(!(await p2.getByRole('button', { name: 'לסיכום השבוע' }).isVisible()), 'הכרטיס נעלם אחרי החלטה');
await p2.locator('.card.brand .tag').first().waitFor({ timeout: 3000 }).catch(() => {});
ok((await p2.locator('.card.brand .tag').count()) >= 2, 'תגי "הוקדם" בתצוגה המקדימה');
await p2.getByRole('button', { name: /התחל אימון C/ }).click();
await p2.waitForSelector('.ex');
const first = await p2.locator('.ex-head .bold').first().textContent();
ok(first.includes('צדפה'), `רגליים הוקדמו לתחילת אימון C (${first})`);
ok(await vis(p2.locator('.ex-head .tag', { hasText: 'הוקדם' })), 'תג הסבר על תרגיל שהוקדם');
ok(await vis(p2.locator('.ex-head .tag', { hasText: '+1 סט' })), 'תג סט נוסף');
ok((await p2.evaluate(() => JSON.parse(localStorage.getItem('moshe-fitness-v1')).draft.exercises.find((e) => e.slotId === 'lateral-raise').sets.length)) === 4, 'הרחקת כתפיים: 4 סטים (מקסימום התוכנית)');
await p2.goto(BASE + '#/settings');
ok(await vis(p2.getByText('התאמה שבועית פעילה עד שבת 17.10', { exact: false })), 'ההתאמה מוצגת בהגדרות');
ok(await vis(p2.getByText('תמיד בתחילת האימון', { exact: false })), 'שינוי קבוע מוצג בהגדרות');
const [dl2] = await Promise.all([p2.waitForEvent('download'), p2.getByRole('button', { name: /ייצוא גיבוי/ }).click()]);
await dl2.saveAs('/tmp/backup2.json');
const j2 = JSON.parse(fs.readFileSync('/tmp/backup2.json', 'utf8')).data;
ok(j2.adjustment && j2.adjustment.until === '2026-10-17' && j2.permanent.length === 1 && j2.reviews['2026-10-04'].decision === 'approved', 'הגיבוי כולל סיכום, התאמה ושינוי קבוע');
await p2.locator('.perm').getByRole('button', { name: 'בטל' }).click();
ok((await p2.evaluate(() => JSON.parse(localStorage.getItem('moshe-fitness-v1')).permanent.length)) === 0, 'ביטול שינוי קבוע');
await p2.locator('input[type=file]').setInputFiles('/tmp/backup2.json');
await p2.getByRole('button', { name: 'ייבא והחלף' }).click();
await p2.waitForTimeout(200);
ok((await p2.evaluate(() => JSON.parse(localStorage.getItem('moshe-fitness-v1')).permanent.length)) === 1, 'ייבוא החזיר את השינוי הקבוע');
await ctx2.close();

ok(errs.length === 0, 'אין שגיאות JS ' + errs.join('|'));
await browser.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
