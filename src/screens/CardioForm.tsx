import { useState } from 'react';
import { CARDIO_TYPES } from '../data/plan';
import { actions, useAppState } from '../store';
import { todayISO } from '../logic/dates';
import { cardioTarget, intervalsAllowed, positionFor } from '../logic/rotation';
import { cardioPlanFor, SKI_INTERVALS_HE } from '../logic/ski';
import { generalPain } from '../logic/pain';
import { Btn, Card, Confirm, Field, NumField, PageHeader, go } from '../ui/kit';

export default function CardioForm({ id, date0 }: { id?: string; date0?: string }) {
  const st = useAppState();
  const ex = id ? st.cardio.find((c) => c.id === id) : undefined;
  const pos = positionFor(st.sessions, st.settings.earlyDeloadFrom);
  const cp = cardioPlanFor(st.settings, todayISO(), pos, cardioTarget(pos), generalPain(st.sessions).level !== 'none');
  const tgt = cp.target;
  const [date, setDate] = useState(ex?.date ?? date0 ?? todayISO());
  const [type, setType] = useState(ex?.type ?? 'bike');
  const [minutes, setMinutes] = useState<number | null>(ex?.minutes ?? tgt.min);
  const [hr, setHr] = useState<number | null>(ex?.avgHr ?? null);
  const [effort, setEffort] = useState<number | null>(ex?.effort ?? 3);
  const [dist, setDist] = useState<number | null>(ex?.distanceKm ?? null);
  const [incline, setIncline] = useState<number | null>(ex?.incline ?? null);
  const [easy, setEasy] = useState(ex?.easy ?? true);
  const [intervals, setIntervals] = useState(ex?.intervals ?? false);
  const [notes, setNotes] = useState(ex?.notes ?? '');
  const [del, setDel] = useState(false);
  const t = CARDIO_TYPES.find((c) => c.id === type)!;
  const canIntervals = intervalsAllowed(pos) || cp.skiIntervals;
  const hard = (effort ?? 0) > 5;

  const save = () => {
    if (!minutes || minutes <= 0) return;
    const e = { date, type, minutes, avgHr: hr, effort: effort ?? 3, distanceKm: dist, incline, easy: easy && !hard, intervals, notes: notes || undefined };
    if (ex) actions.updateCardio(ex.id, e); else actions.addCardio(e);
    go('/progress/cardio');
  };

  return (
    <>
      <PageHeader title={ex ? 'עריכת אירובי' : 'רישום אירובי'} sub={`יעד השבוע: ${tgt.min === tgt.max ? tgt.min : `${tgt.min}–${tgt.max}`} דק׳ בקצב שיחה`} onBack={() => history.back()} />
      <Card>
        <Field label="תאריך"><input className="input" type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        <div className="field"><label>סוג</label>
          <div className="row wrap">{CARDIO_TYPES.map((c) => (<button key={c.id} className={`chip ${type === c.id ? 'on' : ''}`} aria-pressed={type === c.id} onClick={() => setType(c.id)}>{c.he}</button>))}</div>
        </div>
        <p className="small muted">{t.tip}</p>
        <NumField label="משך" unit="דקות" value={minutes} step={5} onChange={setMinutes} />
        <NumField label="תחושת מאמץ 1–10" value={effort} step={1} min={1} max={10} onChange={setEffort} />
        <p className="tiny muted">Zone 2: מאמץ 3–4 מתוך 10, אפשר לדבר במשפטים שלמים.</p>
        {hard && <p className="small bold" style={{ color: 'var(--warn)' }}>זה יותר קשה מ־Zone 2. בפעם הבאה להאט, האירובי צריך להיות קל באמת.</p>}
        <div className="checkrow"><input id="easy" type="checkbox" checked={easy} onChange={(e) => setEasy(e.target.checked)} /><label htmlFor="easy">בקצב שיחה, בלי להתנשף</label></div>
        <NumField label="דופק ממוצע (רשות)" unit="פעימות" value={hr} step={5} onChange={setHr} ph="—" />
        <p className="tiny muted">הדופק הוא הערכה גסה. בדיקת השיחה חשובה יותר.</p>
        <NumField label="מרחק (רשות)" unit="ק״מ" value={dist} step={0.5} onChange={setDist} ph="—" />
        <NumField label="שיפוע (רשות, עד 3%)" unit="%" value={incline} step={0.5} max={3} onChange={setIncline} ph="0" />
        <div className={`checkrow`} style={{ opacity: canIntervals ? 1 : .55 }}>
          <input id="int" type="checkbox" disabled={!canIntervals} checked={intervals} onChange={(e) => setIntervals(e.target.checked)} />
          <label htmlFor="int">אינטרוולים עדינים{!canIntervals && ' (רק אחרי שבוע 8, ורק אם הברך, השוק והגב רגועים)'}</label>
        </div>
        {cp.skiIntervals && <p className="small muted"><b>הכנה לסקי:</b> {SKI_INTERVALS_HE}</p>}
        {canIntervals && !cp.skiIntervals && (
          <p className="small muted">אחרי 10 דק׳ חימום: 4–6 חזרות של דקה בקצב מעט גבוה (מדברים רק במשפטים קצרים), ו־2 דקות קלות ביניהן. לא ספרינטים. אם יש החמרה, חוזרים ל־Zone 2 בלבד.</p>
        )}
        <Field label="הערות"><textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <p className="small muted">בלי ריצה ובלי קפיצות. כאב בברך או בשוק: להפסיק.</p>
        <Btn kind="primary" block onClick={save} disabled={!minutes}>שמור</Btn>
        {ex && <Btn kind="danger" block onClick={() => setDel(true)}>מחק</Btn>}
      </Card>
      {del && ex && <Confirm title="למחוק את הרישום?" ok="מחק" danger onOk={() => { actions.deleteCardio(ex.id); go('/progress/cardio'); }} onCancel={() => setDel(false)} />}
    </>
  );
}
