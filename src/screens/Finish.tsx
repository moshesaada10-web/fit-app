import { useState } from 'react';
import { findExercise } from '../data/plan';
import { actions, getState, useAppState } from '../store';
import { adviceAfterWorkout, exercisePain, generalPain, isTriggered } from '../logic/pain';
import { setsSummary } from '../logic/info';
import type { Pain } from '../types';
import { Btn, Card, PageHeader, go } from '../ui/kit';

const AREAS: { k: keyof Pain; label: string }[] = [{ k: 'back', label: 'גב' }, { k: 'shin', label: 'שוק ימין' }, { k: 'knee', label: 'ברך' }];

export function PainPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="pain-grid" role="radiogroup">
      {Array.from({ length: 11 }, (_, n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} className={`${value === n ? 'on' : ''} ${n >= 4 ? 'hi' : ''}`} onClick={() => onChange(n)}>{n}</button>
      ))}
    </div>
  );
}

export default function Finish() {
  const st = useAppState();
  const d = st.draft;
  const [pain, setPain] = useState<Pain>({ back: 0, shin: 0, knee: 0 });
  const [trig, setTrig] = useState<string[]>([]);
  const [saved, setSaved] = useState<null | { advice: ReturnType<typeof adviceAfterWorkout>; type: string; paused: string[] }>(null);

  if (saved) {
    const tone = saved.advice.level === 'ok' ? 'ok' : saved.advice.level === 'pause' ? 'danger' : 'warn';
    return (
      <>
        <PageHeader title={`אימון ${saved.type} נשמר`} sub="כל הכבוד על ההתמדה" />
        <Card tone={tone}>
          <h3>{saved.advice.level === 'ok' ? 'הכאב ברמה נמוכה' : saved.advice.level === 'pause' ? 'כדאי לעצור ולבדוק' : 'כלל הכאב'}</h3>
          <p>{saved.advice.text}</p>
          {saved.paused.length > 0 && <p className="bold">מושהה: {saved.paused.join(', ')}</p>}
        </Card>
        <Card tone="tight"><p className="small">כאב חד או מקרין, נימול, חולשה, נפיחות או נעילת ברך: להפסיק ולפנות לבדיקה. מצבים דחופים: ראו עמוד בטיחות.</p><Btn sm href="/safety">בטיחות</Btn></Card>
        <Btn kind="primary" block href="/today">חזרה להיום</Btn>
      </>
    );
  }
  if (!d) return (<><PageHeader title="סיום אימון" onBack={() => go('/today')} /><Card><p>אין אימון פתוח.</p><Btn href="/today">להיום</Btn></Card></>);

  const maxP = Math.max(pain.back, pain.shin, pain.knee);
  const hi = maxP >= 4;
  const doneSets = d.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  const save = () => {
    const prevGeneral = generalPain(st.sessions);
    const s = actions.finishWorkout({ pain, painTriggers: hi ? trig : [] });
    if (!s) return;
    const triggered = isTriggered(s);
    const consecutive = triggered ? prevGeneral.consecutive + 1 : 0;
    const now = getState();
    const paused = hi && trig.length
      ? trig.filter((id) => exercisePain(now.sessions, id, now.settings.pauseCleared[id]).level === 'pause').map((id) => findExercise(id)?.he ?? id)
      : [];
    setSaved({ advice: adviceAfterWorkout(pain, triggered, consecutive), type: s.type, paused });
  };

  return (
    <>
      <PageHeader title="סיום אימון" sub={`אימון ${d.type} · ${doneSets} סטים`} onBack={() => go('/workout')} />
      <Card>
        <h3>כאב עכשיו, 0–10</h3>
        <p className="small muted">0 = אין כאב. 2–3 אי־נוחות קלה. 4 ומעלה: פועלים לפי הכלל.</p>
        {AREAS.map((a) => (
          <div className="col" key={a.k}>
            <div className="row between"><b>{a.label}</b><span className="num bold">{pain[a.k]}</span></div>
            <PainPicker value={pain[a.k]} onChange={(n) => setPain({ ...pain, [a.k]: n })} />
          </div>
        ))}
      </Card>

      {hi && (
        <Card tone="warn">
          <h3>כאב 4 ומעלה</h3>
          <p>באימון הבא: סט אחד פחות בתרגיל המעורר, ומשקל קל יותר. אם זה קורה בשני אימונים ברציפות: משהים את התרגיל ופונים לפיזיותרפיסט.</p>
          <p className="small">איזה תרגיל עורר את הכאב? (רשות)</p>
          <div className="row wrap">
            {d.exercises.filter((e) => !e.skipped).map((e) => (
              <button key={e.slotId} type="button" className={`chip ${trig.includes(e.slotId) ? 'on' : ''}`} aria-pressed={trig.includes(e.slotId)}
                onClick={() => setTrig(trig.includes(e.slotId) ? trig.filter((x) => x !== e.slotId) : [...trig, e.slotId])}>{findExercise(e.exerciseId)?.he}</button>
            ))}
          </div>
        </Card>
      )}
      {maxP >= 7 && <Card tone="danger"><p className="bold">כאב חזק. לא ממשיכים לאימון הבא בלי לבדוק את המצב.</p><p className="small">אם יש גם נימול, חולשה או שינוי בשליטה על שתן או צואה: מיון.</p></Card>}

      <Card tone="tight">
        <h3>סיכום</h3>
        {d.exercises.map((e, i) => (
          <div key={i} className="row between small"><span>{findExercise(e.exerciseId)?.he}</span><span className="num muted">{e.skipped ? 'דולג' : setsSummary(e)}</span></div>
        ))}
      </Card>
      <Btn kind="primary" block onClick={save}>שמור אימון</Btn>
    </>
  );
}

