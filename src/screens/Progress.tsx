import { useState } from 'react';
import { ORDER, WEEKS, WORKOUTS, findExercise, slotLabel, EXERCISES, type Phase } from '../data/plan';
import { actions, useAppState } from '../store';
import { addDays, formatLong, formatShort, todayISO } from '../logic/dates';
import { GOAL_BAND_KG, expectedGoalDate, goalReached, movingAverage, trendStatus, weeklySeries } from '../logic/body';
import { cardioName, PHASE_HE, phaseText } from '../logic/info';
import { cardioPlanFor } from '../logic/ski';
import { cardioTarget, positionFor, sortSessions } from '../logic/rotation';
import { exerciseHistory } from '../logic/workout';
import { workingWeight } from '../logic/progression';
import { maxPain } from '../logic/pain';
import type { AppState, BodyEntry } from '../types';
import { BarChart, Btn, Card, Chip, Confirm, Field, Icon, LineChart, NumField, PageHeader, Seg, Sheet, go } from '../ui/kit';

type Tab = 'body' | 'nutrition' | 'strength' | 'cardio' | 'plan';
const TABS: { id: Tab; label: string }[] = [
  { id: 'body', label: 'גוף' }, { id: 'nutrition', label: 'תזונה' }, { id: 'strength', label: 'כוח' }, { id: 'cardio', label: 'אירובי' }, { id: 'plan', label: '12 שבועות' },
];

export default function Progress({ tab }: { tab: Tab }) {
  return (
    <>
      <PageHeader title="התקדמות" />
      <Seg value={tab} options={TABS} onChange={(t) => go(`/progress/${t}`)} />
      {tab === 'body' && <BodyTab />}
      {tab === 'nutrition' && <NutritionTab />}
      {tab === 'strength' && <StrengthTab />}
      {tab === 'cardio' && <CardioTab />}
      {tab === 'plan' && <PlanTab />}
    </>
  );
}

/* ---------------- גוף ---------------- */
function BodyTab() {
  const st = useAppState();
  const s = st.settings;
  const [edit, setEdit] = useState<BodyEntry | 'new' | null>(null);
  const series = weeklySeries(st.body, { date: s.baselineDate, kg: s.baselineKg });
  const ma = movingAverage(series.map((p) => p.kg), 4);
  const cur = series[series.length - 1];
  const { status, rate } = trendStatus(series);
  const reached = goalReached(series, s.goalKg);
  const total = s.baselineKg - s.goalKg;
  const lost = s.baselineKg - cur.kg;
  const pct = Math.max(0, Math.min(100, (lost / total) * 100));
  const eta = expectedGoalDate(cur.kg, s.goalKg, rate, cur.date);
  const labels = series.map((p, i) => (i === 0 && p.date === s.baselineDate ? 'התחלה' : formatShort(p.date)));
  const waist = [...st.body].filter((b) => b.waistCm).sort((a, b) => a.date.localeCompare(b.date));
  const sorted = [...st.body].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Card tone={reached ? 'ok' : 'brand'}>
        <div className="row between">
          <div><div className="label">משקל נוכחי</div><div style={{ fontSize: 40, fontWeight: 800 }}><span className="num">{cur.kg}</span> <span className="small">ק״ג</span></div></div>
          <div style={{ textAlign: 'end' }}><div className="label">יעד</div><div style={{ fontSize: 28, fontWeight: 800 }}><span className="num">{s.goalKg}</span></div></div>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <div className="small">
          {reached ? 'הגעת ליעד. עוברים לשלב שמירה (ראו למטה).' : <>נשארו <b className="num">{Math.max(0, Math.round((cur.kg - s.goalKg) * 10) / 10)}</b> ק״ג מתוך <span className="num">{total}</span> מנקודת ההתחלה ({s.baselineKg}).</>}
          {' '}קצב יעד: 0.3–0.5 ק״ג בשבוע.{rate !== null && <> קצב אחרון: <b className="num">{rate}</b> ק״ג בשבוע.</>}
          {eta && !reached && <> בקצב הזה: בערך {formatShort(eta)}.</>}
        </div>
        <p className="tiny muted">לפני כשמונה חודשים: {s.pastKg} ק״ג. גובה {s.heightCm} ס״מ.</p>
        <Btn kind="primary" block onClick={() => setEdit('new')}>שקילה / מותניים</Btn>
      </Card>

      <TrendCard status={status} rate={rate} />

      <Card>
        <h3>משקל וממוצע נע (4 שבועות)</h3>
        <LineChart labels={labels} unit="ק״ג" refY={{ y: s.goalKg, label: `יעד ${s.goalKg}` }}
          lines={[{ name: 'משקל', values: series.map((p) => p.kg), color: 'var(--brand)' }, { name: 'ממוצע', values: ma, color: 'var(--warn)', dash: true, dots: false }]} />
        <div className="row small"><span style={{ color: 'var(--brand)' }}>● שקילה שבועית</span><span style={{ color: 'var(--warn)' }}>┅ ממוצע נע 4 שבועות</span></div>
        <p className="tiny muted">שוקלים פעם בשבוע: בבוקר, אחרי שירותים, לפני אוכל ושתייה, באותם בגדים. מסתכלים על מגמה ולא על שקילה בודדת.</p>
      </Card>

      <Card>
        <h3>היקף מותניים (בגובה הטבור)</h3>
        {waist.length < 1 ? <p className="muted small">עדיין אין מדידות. פעם בשבוע, בנשיפה רגועה, בלי להכניס בטן.</p> : (
          <LineChart labels={waist.map((w) => formatShort(w.date))} unit="ס״מ" lines={[{ name: 'מותניים', values: waist.map((w) => w.waistCm as number), color: 'var(--info)' }]} />
        )}
      </Card>

      <Card>
        <h3>רישומים</h3>
        {sorted.length === 0 && <p className="muted small">עוד לא נרשמו שקילות. ההתחלה: {s.baselineKg} ק״ג.</p>}
        {sorted.map((b) => (
          <button key={b.id} className="list-item" onClick={() => setEdit(b)} style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'start', width: '100%' }}>
            <span className="grow"><b className="num">{b.kg} ק״ג</b>{b.waistCm ? <span className="num"> · מותניים {b.waistCm}</span> : null}<div className="small muted">{formatLong(b.date)}{b.note ? ` · ${b.note}` : ''}</div></span>
            <span className="chip">עריכה</span>
          </button>
        ))}
        <p className="tiny muted">תמונות התקדמות: פעם בחודש, מלפנים, מהצד ומאחור, באותה תאורה. האפליקציה שומרת רק הערה, לא תמונות.</p>
      </Card>

      <MounjaroCard />
      <MaintenanceCard reached={reached} goal={s.goalKg} />
      {edit && <BodySheet entry={edit === 'new' ? null : edit} st={st} onClose={() => setEdit(null)} />}
    </>
  );
}

function TrendCard({ status, rate }: { status: ReturnType<typeof trendStatus>['status']; rate: number | null }) {
  const m: Record<string, { tone: 'info' | 'ok' | 'warn' | 'brand'; title: string; text: string }> = {
    few: { tone: 'info', title: 'עוד מעט יהיה אפשר לראות מגמה', text: 'צריך עוד שקילה או שתיים, בהפרש של שבוע לפחות. לא מסיקים משקילה אחת.' },
    'on-pace': { tone: 'ok', title: 'בקצב טוב', text: 'ירידה של 0.3–0.7 ק״ג בשבוע. ממשיכים כך: חלבון, אימוני כוח והליכה.' },
    slow: { tone: 'brand', title: 'קצב איטי אבל תקין', text: 'מסתכלים על מגמה של 2–3 שבועות לפני שמשנים משהו. קודם בודקים חלבון, שינה וצעדים.' },
    flat: { tone: 'warn', title: 'שבועיים ללא שינוי', text: 'קודם מוסיפים הליכה (500–1,000 צעדים ביום), ולא חותכים אוכל. אפשר גם 1–2 שבועות שמירה ללא גירעון. אם נשאר תקוע, מקטינים לכל היותר 100–150 קק״ל ביום, ולא מתחת ל־1,900–2,000 בזמן מוג׳רו.' },
    up: { tone: 'warn', title: 'עלייה בשקילות האחרונות', text: 'משקל משתנה מנוזלים ומשעות. לא מתרגשים משקילה אחת; בודקים מגמה של 2–3 שבועות ומחזירים סדר בצעדים ובחלבון.' },
    'too-fast': { tone: 'warn', title: 'ירידה מהירה מדי', text: 'יותר מ־0.7 ק״ג בשבוע. כדאי להוסיף 100–200 קק״ל ביום, בעיקר מפחמימה, לשמור חלבון, ולהתייעץ עם הרופא, במיוחד אם יש חולשה, סחרחורת או בחילה חזקה.' },
  };
  const x = m[status];
  return (
    <Card tone={x.tone}>
      <h3>{x.title}</h3>
      <p>{x.text}</p>
      {rate !== null && <p className="tiny muted">ההערכה גסה וכללית. אינה תחליף לייעוץ של רופא או דיאטנית.</p>}
    </Card>
  );
}

export function MounjaroCard() {
  return (
    <Card tone="info">
      <h3>בזמן טיפול במוג׳רו</h3>
      <ul className="clean small">
        <li>ממשיכים עם חלבון (150–180 גרם ביום) ועם אימוני הכוח.</li>
        <li>קלוריות: לא לרדת מתחת ל־1,900–2,000 ביום.</li>
        <li>מינון, שינוי או הפסקה: לדבר עם הרופא. האפליקציה לא ממליצה על זה.</li>
        <li><b>לפנות לרופא:</b> בחילה או הקאות חזקות, סחרחורת, חולשה, עצירות קשה, או ירידה מהירה מדי במשקל.</li>
      </ul>
      <p className="tiny muted">הנחיות כלליות ולא ייעוץ רפואי.</p>
    </Card>
  );
}

function MaintenanceCard({ reached, goal }: { reached: boolean; goal: number }) {
  return (
    <Card tone={reached ? 'ok' : undefined}>
      <details open={reached}>
        <summary>שלב שמירה: אחרי שמגיעים ליעד</summary>
        <div className="col small" style={{ paddingTop: 6 }}>
          <p>מוסיפים בהדרגה 100–150 קק״ל בשבוע, עד שהמשקל יציב (מסתכלים על ממוצע 3–4 שבועות).</p>
          <p>טווח שמירה: ±{GOAL_BAND_KG} ק״ג מהיעד, כלומר {goal - GOAL_BAND_KG}–{goal + GOAL_BAND_KG} ק״ג.</p>
          <ul className="clean">
            <li>ממשיכים שקילה שבועית, חלבון ואימוני כוח.</li>
            <li>אם המשקל עולה מעל הטווח לכמה שבועות: חוזרים בעדינות לגירעון קטן או מוסיפים הליכה.</li>
            <li>בזמן מוג׳רו: מינון והפסקה בתיאום עם הרופא, ולא לבד.</li>
          </ul>
        </div>
      </details>
    </Card>
  );
}

function BodySheet({ entry, st, onClose }: { entry: BodyEntry | null; st: AppState; onClose: () => void }) {
  const [date, setDate] = useState(entry?.date ?? todayISO());
  const [kg, setKg] = useState<number | null>(entry?.kg ?? [...st.body].sort((a, b) => b.date.localeCompare(a.date))[0]?.kg ?? st.settings.baselineKg);
  const [waist, setWaist] = useState<number | null>(entry?.waistCm ?? null);
  const [note, setNote] = useState(entry?.note ?? '');
  const [del, setDel] = useState(false);
  return (
    <Sheet title={entry ? 'עריכת שקילה' : 'שקילה חדשה'} onClose={onClose}>
      <Field label="תאריך"><input className="input" type="date" max={todayISO()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
      <NumField label="משקל" unit="ק״ג" value={kg} step={0.1} decimals={1} onChange={setKg} />
      <NumField label="היקף מותניים בטבור (רשות)" unit="ס״מ" value={waist} step={0.5} decimals={1} onChange={setWaist} ph="—" />
      <Field label="הערת תמונות / תחושה (רשות)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: צילמתי חזית וצד" /></Field>
      <Btn kind="primary" block disabled={!kg} onClick={() => { const e = { date, kg: kg as number, waistCm: waist, note: note || undefined }; if (entry) actions.updateBody(entry.id, e); else actions.addBody(e); onClose(); }}>שמור</Btn>
      {entry && <Btn kind="danger" block onClick={() => setDel(true)}>מחק</Btn>}
      {del && entry && <Confirm title="למחוק את הרישום?" ok="מחק" danger onOk={() => { actions.deleteBody(entry.id); onClose(); }} onCancel={() => setDel(false)} />}
    </Sheet>
  );
}

/* ---------------- תזונה ---------------- */
function avg(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
function NutritionTab() {
  const st = useAppState();
  const today = todayISO();
  const [date, setDate] = useState(today);
  const d = st.daily[date] ?? { date };
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const labels = days.map((x) => String(Number(x.slice(8))));
  const logs = days.map((x) => st.daily[x]);
  const last7 = logs.slice(-7);
  const kcalLow = typeof d.kcal === 'number' && d.kcal > 0 && d.kcal < 1900;
  return (
    <>
      <Card>
        <div className="row between">
          <h3>יומן יומי</h3>
          <div className="row">
            <button className="icon-btn" aria-label="יום קודם" onClick={() => setDate(addDays(date, -1))}><Icon.back /></button>
            <span className="bold" style={{ minWidth: 48, textAlign: 'center' }}>{date === today ? 'היום' : formatShort(date)}</span>
            <button className="icon-btn" aria-label="יום הבא" disabled={date >= today} onClick={() => setDate(addDays(date, 1) > today ? date : addDays(date, 1))} style={{ transform: 'scaleX(-1)' }}><Icon.back /></button>
          </div>
        </div>
        <NumField label="חלבון (יעד 150–180)" unit="גרם" value={d.protein} step={10} onChange={(v) => actions.setDaily(date, { protein: v })} ph="—" />
        <NumField label="קלוריות (לא מתחת ל־1,900–2,000)" value={d.kcal} step={50} onChange={(v) => actions.setDaily(date, { kcal: v })} ph="—" />
        {kcalLow && <p className="small bold" style={{ color: 'var(--warn)' }}>מתחת לרצפה של 1,900. בזמן מוג׳רו לא יורדים מתחת, גם אם אין תיאבון. כדאי להוסיף ארוחה קטנה עם חלבון.</p>}
        <NumField label="צעדים (יעד 8,000–10,000)" value={d.steps} step={500} onChange={(v) => actions.setDaily(date, { steps: v })} ph="—" />
        <NumField label="מים" unit="ליטר" value={d.waterL} step={0.25} decimals={2} onChange={(v) => actions.setDaily(date, { waterL: v })} ph="—" />
        <NumField label="שינה (7–8)" unit="שעות" value={d.sleepH} step={0.5} decimals={1} onChange={(v) => actions.setDaily(date, { sleepH: v })} ph="—" />
        <p className="tiny muted">נשמר אוטומטית. חלבון: כ־35–50 גרם בארוחה, 3–4 ארוחות.</p>
      </Card>

      <Card>
        <h3>14 ימים אחרונים</h3>
        <div className="small bold">חלבון (גרם) · ממוצע שבוע: {avg(last7.map((l) => l?.protein)) ?? '—'}</div>
        <BarChart labels={labels} values={logs.map((l) => l?.protein ?? null)} goal={{ from: 150, to: 180 }} />
        <div className="small bold">צעדים · ממוצע שבוע: {avg(last7.map((l) => l?.steps))?.toLocaleString('en-US') ?? '—'}</div>
        <BarChart labels={labels} values={logs.map((l) => l?.steps ?? null)} goal={{ from: 8000, to: 10000 }} />
        <div className="small bold">קלוריות · ממוצע שבוע: {avg(last7.map((l) => l?.kcal))?.toLocaleString('en-US') ?? '—'}</div>
        <BarChart labels={labels} values={logs.map((l) => l?.kcal ?? null)} colors={logs.map((l) => (l?.kcal && l.kcal < 1900 ? 'var(--warn)' : 'var(--brand)'))} goal={{ from: 1900, to: 2000 }} />
        <div className="small bold">שינה (שעות) · ממוצע: {(() => { const v = last7.map((l) => l?.sleepH).filter((x): x is number => typeof x === 'number'); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '—'; })()}</div>
        <BarChart labels={labels} values={logs.map((l) => l?.sleepH ?? null)} goal={{ from: 7, to: 8 }} />
        <p className="tiny muted">הרצועה הירוקה היא טווח היעד. בלי "להשלים בכוח": בשבוע קל לא מורידים קלוריות נוספות.</p>
      </Card>

      <Card>
        <h3>כלל אצבע</h3>
        <ul className="clean small">
          <li>צלחת: חצי ירקות, רבע חלבון, רבע פחמימה, שומן במידה.</li>
          <li>גירעון מתון, בלי דיאטה קיצונית ובלי לדלג על ארוחות.</li>
          <li>נוזלים עם קלוריות ואלכוהול: להגביל.</li>
          <li>אפשר ארוחה חופשית אחת בשבוע, ללא אשמה.</li>
        </ul>
        <p className="tiny muted">הנחיות כלליות ולא תפריט רפואי. עם מחלות רקע או שאלות על כמות החלבון: דיאטנית קלינית או רופא.</p>
      </Card>
      <MounjaroCard />
    </>
  );
}

/* ---------------- כוח ---------------- */
function StrengthTab() {
  const st = useAppState();
  const sorted = sortSessions(st.sessions);
  const pos = positionFor(st.sessions, st.settings.earlyDeloadFrom);
  const ids = [...new Set(sorted.flatMap((s) => s.exercises.filter((e) => !e.skipped && e.sets.some((x) => x.done)).map((e) => e.exerciseId)))];
  const [pick, setPick] = useState<string | null>(null);
  const cur = pick && ids.includes(pick) ? pick : ids[0];
  const hist = cur ? exerciseHistory(st.sessions, cur) : [];
  const ex = cur ? findExercise(cur) : null;
  const withPain = sorted.filter((s) => s.pain).slice(-10).reverse();
  return (
    <>
      <Card tone="brand">
        <div className="row between"><h3>{sorted.length} אימוני כוח הושלמו</h3><Chip>{phaseText(pos)}</Chip></div>
        <div className="bar"><i style={{ width: `${((sorted.length % 36) / 36) * 100}%` }} /></div>
        <p className="small">{pos.deload ? 'עכשיו שבוע קל.' : `עוד ${pos.untilDeload} אימונים עד שבוע קל (כל 18 אימונים).`}</p>
      </Card>
      <Card>
        <h3>משקל לפי תרגיל</h3>
        {ids.length === 0 ? <p className="muted small">אחרי האימון הראשון יופיעו כאן המשקלים והחזרות.</p> : (
          <>
            <div className="row wrap">{ids.map((id) => (<button key={id} className={`chip ${cur === id ? 'on' : ''}`} aria-pressed={cur === id} onClick={() => setPick(id)}>{findExercise(id)?.he}</button>))}</div>
            {ex && ex.kind !== 'bodyweight' ? (
              <LineChart labels={hist.map((h) => formatShort(h.date))} unit="ק״ג" lines={[{ name: 'משקל', values: hist.map((h) => workingWeight(h)), color: 'var(--brand)' }]} />
            ) : (
              <LineChart labels={hist.map((h) => formatShort(h.date))} unit={ex?.unit === 'sec' ? 'שניות' : 'חזרות'} lines={[{ name: 'חזרות', values: hist.map((h) => Math.max(...h.sets.filter((s) => s.done).map((s) => s.r ?? 0))), color: 'var(--brand)' }]} />
            )}
            <div className="small muted">שיפור בטכניקה ובשליטה הוא התקדמות גם בלי להוסיף משקל.</div>
          </>
        )}
      </Card>
      <Card>
        <h3>יומן כאב (0–10)</h3>
        {withPain.length === 0 ? <p className="muted small">עדיין אין רישומי כאב.</p> : (
          <div className="scroll-x"><table className="tbl"><thead><tr><th>תאריך</th><th>אימון</th><th>גב</th><th>שוק</th><th>ברך</th><th>בוקר</th></tr></thead><tbody>
            {withPain.map((s) => (<tr key={s.id} className={(maxPain(s.pain) ?? 0) >= 4 ? 'deload' : ''}><td>{formatShort(s.date)}</td><td>{s.type}</td><td>{s.pain?.back}</td><td>{s.pain?.shin}</td><td>{s.pain?.knee}</td><td>{s.nextMorning ? { better: 'טוב', same: 'זהה', worse: 'גרוע' }[s.nextMorning] : '—'}</td></tr>))}
          </tbody></table></div>
        )}
        <p className="tiny muted">4 ומעלה, או החמרה בבוקר: סט אחד פחות וקל יותר. נמשך 2 אימונים: משהים ופונים לפיזיותרפיסט.</p>
      </Card>
    </>
  );
}

/* ---------------- אירובי ---------------- */
function CardioTab() {
  const st = useAppState();
  const pos = positionFor(st.sessions, st.settings.earlyDeloadFrom);
  const t = cardioPlanFor(st.settings, todayISO(), pos, cardioTarget(pos), false).target;
  const list = [...st.cardio].sort((a, b) => a.date.localeCompare(b.date));
  const recent = list.slice(-12);
  const hrs = recent.map((c) => c.avgHr ?? null);
  return (
    <>
      <Card tone="info">
        <h3>היעד השבוע: {t.min === t.max ? t.min : `${t.min}–${t.max}`} דק׳</h3>
        <p className="small">Zone 2, בקצב שיחה, פעמיים בשבוע. התקדמות בדקות היא יעד ולא חובה; אם שבוע היה קשה, חוזרים לשבוע הקודם.{pos.deload ? ' עכשיו שבוע קל.' : ''}</p>
        <Btn kind="primary" block href="/cardio/new">רשום אירובי</Btn>
      </Card>
      <Card>
        <h3>דקות בכל אימון</h3>
        <BarChart labels={recent.map((c) => formatShort(c.date))} values={recent.map((c) => c.minutes)} colors={recent.map((c) => (c.easy ? 'var(--brand)' : 'var(--warn)'))} goal={{ from: 25, to: 40 }} unit="דק׳" />
        <p className="tiny muted">ירוק = בקצב קל (שיחה). כתום = קשה מ־Zone 2. הרצועה: 25–40 דק׳.</p>
      </Card>
      <Card>
        <h3>דופק ממוצע</h3>
        {hrs.some((h) => h) ? <LineChart labels={recent.map((c) => formatShort(c.date))} unit="פעימות" lines={[{ name: 'דופק', values: hrs, color: 'var(--danger)' }]} /> : <p className="muted small">אפשר להוסיף דופק בכל רישום. זה רשות.</p>}
        <p className="tiny muted">במגמה טובה, אותו מאמץ קל מגיע לדופק נמוך יותר עם הזמן. הדופק הוא הערכה גסה בלבד.</p>
      </Card>
      <Card>
        <h3>רישומים</h3>
        {list.length === 0 && <p className="muted small">עדיין אין רישומי אירובי.</p>}
        {[...list].reverse().map((c) => (
          <button key={c.id} className="list-item" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'start', width: '100%' }} onClick={() => go(`/cardio/${c.id}`)}>
            <span className="badge cardio sm">♥</span>
            <span className="grow"><b>{cardioName(c.type)} · {c.minutes} דק׳</b>{c.intervals && <> <Chip tone="info">אינטרוולים</Chip></>}<div className="small muted">{formatShort(c.date)} · מאמץ {c.effort}/10{c.avgHr ? ` · דופק ${c.avgHr}` : ''}{c.distanceKm ? ` · ${c.distanceKm} ק״מ` : ''}{c.incline ? ` · שיפוע ${c.incline}%` : ''}</div></span>
          </button>
        ))}
      </Card>
      <Card tone="warn"><h3>בלי ריצה ובלי קפיצות</h3><p className="small">לא רצים, לא קופצים ולא עושים אינטרוולים עם זעזוע. גם אופניים, אליפטי, שיפוע ושחייה כדאי לאשר עם הפיזיותרפיסט או האורתופד.</p></Card>
    </>
  );
}

/* ---------------- תוכנית 12 שבועות ---------------- */
const PHASE_TONE: Record<Phase, string> = { intro: '', build: '', deload: 'deload' };
function PlanTab() {
  const st = useAppState();
  const pos = positionFor(st.sessions, st.settings.earlyDeloadFrom);
  return (
    <>
      <Card tone="brand">
        <h3>איפה אתה עכשיו</h3>
        <p><b>{phaseText(pos)}</b> · {st.sessions.length} אימוני כוח הושלמו.</p>
        <p className="small muted">השבוע נקבע לפי אימוני כוח שהושלמו (3 אימונים = שבוע), לא לפי תאריכים. 18 אימונים = 6 שבועות.</p>
      </Card>
      <Card>
        <h3>לוח 12 שבועות</h3>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>שבוע</th><th>שלב</th><th>סטים</th><th>אירובי</th><th>צעדים</th></tr></thead>
            <tbody>
              {WEEKS.map((w) => (
                <tr key={w.week} className={`${PHASE_TONE[w.phase]} ${w.week === pos.week ? 'cur' : ''}`}>
                  <td className="bold">{w.week}</td><td>{PHASE_HE[w.phase]}</td><td>{w.sets}</td><td>{w.cardio}</td><td className="small">{w.steps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted">השורות הצהובות הן שבועות קלים. הסטים מתייחסים לתרגילי הכוח והליבה בטבלאות A/B/C.</p>
      </Card>
      <Card tone="warn">
        <h3>שבוע קל (6 ו־12)</h3>
        <ul className="clean small">
          <li>סטים: כ־40% פחות, בדרך כלל 2 לכל תרגיל.</li>
          <li>משקל: כ־10% פחות.</li>
          <li>אירובי: נשאר קל, בדרך כלל 25 דקות.</li>
          <li>בשבוע שאחרי חוזרים למשקל לפני השבוע הקל, ולא מעלים מעבר לו.</li>
          <li>אפשר להקדים שבוע קל אם הגב, השוק או הברך לא רגועים או שהעייפות חריגה.</li>
        </ul>
      </Card>
      <Card>
        <h3>כללי התקדמות</h3>
        <ul className="clean small">
          <li>שבועות 1–2: 2 סטים לכל תרגיל, משקל קל, עוד 3–4 חזרות טובות בסוף הסט.</li>
          <li>משבוע 3: מוסיפים סט בהדרגה עד המספר בטבלה, אם הטכניקה יציבה ולא הייתה החמרה בזמן האימון או למחרת.</li>
          <li>קצה עליון של טווח החזרות בכל הסטים בשני אימונים: מוסיפים את מדרגת המשקל הקטנה ביותר וחוזרים לקצה התחתון.</li>
          <li>לא עד כשל. כל חזרה בשליטה, בלי תנופה ובלי לעצור נשימה.</li>
          <li>אינטרוולים עדינים באירובי: רק אחרי שבוע 8.</li>
        </ul>
      </Card>
      {ORDER.map((k) => (
        <Card key={k}>
          <div className="row between"><h3>{WORKOUTS[k].title}</h3><span className="small muted">{WORKOUTS[k].subtitle}</span></div>
          {WORKOUTS[k].slots.map((s, i) => { const ex = EXERCISES[s.exerciseId]; return (
            <div key={i} className="row between small" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{i + 1}. {ex.he}{ex.legs && <span className="muted"> · באישור פיזיו</span>}</span><span className="num bold">{slotLabel(s, ex)}</span>
            </div>); })}
        </Card>
      ))}
    </>
  );
}
