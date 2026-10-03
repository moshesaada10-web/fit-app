import { useState } from 'react';
import { ORDER, WORKOUTS, findExercise, type WorkoutId } from '../data/plan';
import { actions, useAppState } from '../store';
import { HE_DAYS_SHORT, HE_MONTHS, formatLong, parseISO, toISO, todayISO } from '../logic/dates';
import { cardioName, setsSummary } from '../logic/info';
import { PAIN_THRESHOLD, maxPain } from '../logic/pain';
import { nextWorkout, sortSessions } from '../logic/rotation';
import type { Session } from '../types';
import { Btn, Card, Chip, Confirm, Field, Icon, PageHeader, Sheet, go } from '../ui/kit';
import { PainPicker } from './Finish';

export default function Log() {
  const st = useAppState();
  const today = todayISO();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [adding, setAdding] = useState(false);

  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12);
  const lead = first.getDay();
  const dim = new Date(y, m, 0).getDate();
  const cells: string[] = [];
  for (let i = -lead; i < Math.ceil((lead + dim) / 7) * 7 - lead; i++) cells.push(toISO(new Date(y, m - 1, 1 + i, 12)));
  const shift = (n: number) => { const d = new Date(y, m - 1 + n, 1, 12); setMonth(toISO(d).slice(0, 7)); };

  const sessionsOn = (d: string) => sortSessions(st.sessions).filter((s) => s.date === d);
  const cardioOn = (d: string) => st.cardio.filter((c) => c.date === d);
  const monthSessions = st.sessions.filter((s) => s.date.startsWith(month)).length;
  const monthCardio = st.cardio.filter((c) => c.date.startsWith(month)).length;

  return (
    <>
      <PageHeader title="יומן" sub="אילו ימים התאמנת ואיזה אימון" />
      <Card>
        <div className="row between">
          <button className="icon-btn" aria-label="חודש קודם" onClick={() => shift(-1)}><Icon.back /></button>
          <h2>{HE_MONTHS[m - 1]} {y}</h2>
          <button className="icon-btn" aria-label="חודש הבא" onClick={() => shift(1)} style={{ transform: 'scaleX(-1)' }}><Icon.back /></button>
        </div>
        <div className="cal" role="grid">
          {HE_DAYS_SHORT.map((d) => <div key={d} className="dow">{d}</div>)}
          {cells.map((d) => {
            const ss = sessionsOn(d); const cs = cardioOn(d);
            const inM = d.startsWith(month);
            return (
              <button key={d} className={`day ${inM ? '' : 'out'} ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}`} onClick={() => { setSel(d); if (!inM) setMonth(d.slice(0, 7)); }}
                aria-label={`${formatLong(d)}${ss.length ? ', כוח ' + ss.map((s) => s.type).join('') : ''}${cs.length ? ', אירובי' : ''}`}>
                <span>{parseISO(d).getDate()}</span>
                <span className="marks">
                  {ss.map((s) => <span key={s.id} className={`mk ${s.type}`}>{s.type}</span>)}
                  {cs.map((c) => <span key={c.id} className="mk cardio">♥</span>)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="row wrap small muted">
          <span className="mk A">A</span><span className="mk B">B</span><span className="mk C">C</span> כוח <span className="mk cardio">♥</span> אירובי
          <span style={{ marginInlineStart: 'auto' }}>החודש: {monthSessions} כוח · {monthCardio} אירובי</span>
        </div>
      </Card>

      <Card>
        <div className="row between"><h3>{formatLong(sel)}</h3></div>
        {sessionsOn(sel).length === 0 && cardioOn(sel).length === 0 && <p className="muted">אין רישום ביום הזה.</p>}
        {sessionsOn(sel).map((s) => (
          <button key={s.id} className="list-item" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'start', width: '100%' }} onClick={() => go(`/session/${s.id}`)}>
            <span className={`badge ${s.type}`}>{s.type}</span>
            <span className="grow">
              <b>אימון {s.type}</b>{s.deload && <> <Chip tone="warn">שבוע קל</Chip></>}{s.manual && <> <Chip>נרשם בדיעבד</Chip></>}
              <div className="small muted">{s.manual ? 'ללא פירוט תרגילים' : `${s.exercises.filter((e) => !e.skipped).length} תרגילים`}{maxPain(s.pain) !== null ? ` · כאב מקס׳ ${maxPain(s.pain)}` : ''}</div>
            </span>
            <Icon.back />
          </button>
        ))}
        {cardioOn(sel).map((c) => (
          <button key={c.id} className="list-item" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'start', width: '100%' }} onClick={() => go(`/cardio/${c.id}`)}>
            <span className="badge cardio">♥</span>
            <span className="grow"><b>{cardioName(c.type)}</b><div className="small muted">{c.minutes} דק׳ · מאמץ {c.effort}/10{c.avgHr ? ` · דופק ${c.avgHr}` : ''}</div></span>
            <Icon.back />
          </button>
        ))}
        <div className="row wrap">
          <Btn kind="soft" onClick={() => setAdding(true)}><Icon.plus /> כוח</Btn>
          <Btn kind="soft" href={`/cardio/new?date=${sel}`}><Icon.plus /> אירובי</Btn>
        </div>
      </Card>
      <p className="tiny muted center">האימון הבא לפי הסדר: {nextWorkout(st.sessions)}. הסדר נקבע לפי האימון האחרון שהושלם, לא לפי יום בשבוע.</p>
      {adding && <AddSession date={sel} onClose={() => setAdding(false)} />}
    </>
  );
}

function AddSession({ date: d0, onClose }: { date: string; onClose: () => void }) {
  const st = useAppState();
  const [date, setDate] = useState(d0);
  const upto = st.sessions.filter((s) => s.date <= date);
  const suggested = nextWorkout(upto);
  const [type, setType] = useState<WorkoutId | null>(null);
  const t = type ?? suggested;
  return (
    <Sheet title="הוספת אימון כוח" onClose={onClose}>
      <p className="small muted">לרישום אימון שהוחמץ ברישום. בלי פירוט תרגילים; אפשר להוסיף הערה.</p>
      <Field label="תאריך"><input className="input" type="date" value={date} max={todayISO()} onChange={(e) => { setDate(e.target.value); setType(null); }} /></Field>
      <div className="field"><label>איזה אימון</label>
        <div className="row">{ORDER.map((o) => (
          <button key={o} className={`chip ${t === o ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center' }} aria-pressed={t === o} onClick={() => setType(o)}>{o}</button>
        ))}</div>
        <span className="tiny muted">לפי הסדר מוצע {suggested} ({WORKOUTS[suggested].subtitle})</span>
      </div>
      <Btn kind="primary" block disabled={!date || date > todayISO()} onClick={() => { actions.addSession({ date, type: t }); onClose(); }}>שמור</Btn>
    </Sheet>
  );
}

export function SessionDetail({ id }: { id: string }) {
  const st = useAppState();
  const s = st.sessions.find((x) => x.id === id);
  const [del, setDel] = useState(false);
  if (!s) return (<><PageHeader title="אימון" onBack={() => go('/log')} /><Card><p>האימון לא נמצא.</p></Card></>);
  const up = (p: Partial<Session>) => actions.updateSession(s.id, p);
  const pain = s.pain ?? { back: 0, shin: 0, knee: 0 };
  return (
    <>
      <PageHeader title={`אימון ${s.type}`} sub={formatLong(s.date)} onBack={() => go('/log')} />
      <Card>
        <Field label="תאריך"><input className="input" type="date" value={s.date} max={todayISO()} onChange={(e) => e.target.value && up({ date: e.target.value })} /></Field>
        <div className="field"><label>סוג האימון</label>
          <div className="row">{ORDER.map((o) => (<button key={o} className={`chip ${s.type === o ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center' }} aria-pressed={s.type === o} onClick={() => up({ type: o })}>{o}</button>))}</div>
        </div>
        <Field label="הערות"><textarea className="input" value={s.notes ?? ''} onChange={(e) => up({ notes: e.target.value })} /></Field>
      </Card>
      <Card>
        <h3>כאב</h3>
        {(['back', 'shin', 'knee'] as const).map((k) => (
          <div className="col" key={k}><div className="row between"><b>{{ back: 'גב', shin: 'שוק ימין', knee: 'ברך' }[k]}</b><span className="num">{s.pain ? pain[k] : '—'}</span></div>
            <PainPicker value={pain[k]} onChange={(n) => up({ pain: { ...pain, [k]: n } })} /></div>
        ))}
        <div className="field"><label>למחרת בבוקר</label>
          <div className="row wrap">{([['better', 'טוב יותר'], ['same', 'זהה'], ['worse', 'גרוע יותר']] as const).map(([k, l]) => (
            <button key={k} className={`chip ${s.nextMorning === k ? 'on' : ''}`} aria-pressed={s.nextMorning === k} onClick={() => up({ nextMorning: s.nextMorning === k ? undefined : k })}>{l}</button>))}</div>
        </div>
        {maxPain(s.pain) !== null && (maxPain(s.pain) as number) >= PAIN_THRESHOLD && <p className="small bold">כאב 4 ומעלה: סט אחד פחות ומשקל קל יותר באימון הבא.</p>}
      </Card>
      {s.exercises.length > 0 && (
        <Card>
          <h3>תרגילים</h3>
          {s.exercises.map((e, i) => (
            <div key={i} className="list-item" style={{ alignItems: 'flex-start' }}>
              <span className="grow"><b>{findExercise(e.exerciseId)?.he}</b>{e.exerciseId !== e.slotId && <div className="tiny muted">במקום {findExercise(e.slotId)?.he}</div>}{e.note && <div className="tiny">{e.note}</div>}</span>
              <span className="num small">{e.skipped ? 'דולג' : setsSummary(e, findExercise(e.exerciseId)?.unit === 'sec' ? '״' : '')}</span>
            </div>
          ))}
          <p className="tiny muted">משקל × חזרות לכל סט</p>
        </Card>
      )}
      <Btn kind="danger" block onClick={() => setDel(true)}>מחק אימון</Btn>
      {del && <Confirm title="למחוק את האימון?" text="האימון יוסר מהיומן ומסדר ההתקדמות." ok="מחק" danger onOk={() => { actions.deleteSession(s.id); go('/log'); }} onCancel={() => setDel(false)} />}
    </>
  );
}
