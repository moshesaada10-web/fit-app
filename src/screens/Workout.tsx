import { useMemo, useState } from 'react';
import { ALTERNATIVES, COOLDOWN, WARMUP, WORKOUTS, altAsExercise, findExercise, type Exercise } from '../data/plan';
import { actions, useAppState } from '../store';
import { formatShort, todayISO } from '../logic/dates';
import { exercisePain } from '../logic/pain';
import { positionFor } from '../logic/rotation';
import { PHASE_HE } from '../logic/info';
import { exerciseHistory, stepFor, suggestFor } from '../logic/workout';
import type { AppState, ExLog, SetLog } from '../types';
import { Btn, Card, Chip, Confirm, Icon, NumField, PageHeader, Sheet, go } from '../ui/kit';

export default function Workout() {
  const st = useAppState();
  const d = st.draft;
  const [open, setOpen] = useState<number>(() => {
    const dd = st.draft; if (!dd) return 0;
    const i = dd.exercises.findIndex((e) => !e.skipped && e.sets.some((s) => !s.done));
    return i < 0 ? 0 : i;
  });
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [showWarm, setShowWarm] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const pos = positionFor(st.sessions, st.settings.earlyDeloadFrom);

  if (!d) {
    return (
      <>
        <PageHeader title="אימון" onBack={() => go('/today')} />
        <Card><p>אין אימון פתוח.</p><Btn kind="primary" href="/today">חזרה להיום</Btn></Card>
      </>
    );
  }
  const def = WORKOUTS[d.type];
  const totalDone = d.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const totalSets = d.exercises.reduce((n, e) => n + (e.skipped ? 0 : e.sets.length), 0);

  const setEx = (i: number, fn: (e: ExLog) => ExLog) => actions.updateDraft((dr) => ({ ...dr, exercises: dr.exercises.map((e, k) => (k === i ? fn(e) : e)) }));

  return (
    <>
      <PageHeader title={def.title} sub={`${def.subtitle} · שבוע ${pos.week} · ${PHASE_HE[d.deload ? 'deload' : pos.phase]}`} onBack={() => go('/today')}
        right={<Btn sm href="/safety">בטיחות</Btn>} />

      <Card tone={d.deload ? 'warn' : 'tight'}>
        <div className="row between">
          <span className="bold">{totalDone}/{totalSets} סטים</span>
          <button className="chip" onClick={() => setShowWarm((v) => !v)}>{showWarm ? 'הסתר חימום' : 'חימום וקירור'}</button>
        </div>
        <div className="bar" aria-hidden><i style={{ width: `${totalSets ? (100 * totalDone) / totalSets : 0}%` }} /></div>
        {d.deload && <p className="small">שבוע קל: פחות סטים ו־10% פחות משקל. עוד 4 חזרות טובות בכל סט.</p>}
        <p className="tiny muted">מנוחה: 90–120 שניות בתרגילים הגדולים, 60–90 בבידוד ובליבה. בלי כשל, בלי תנופה, בלי לעצור נשימה.</p>
        {showWarm && (
          <div className="col">
            <h3>חימום 5–10 דק׳</h3>
            <ul className="clean small">{WARMUP.map((w) => <li key={w.t}><b>{w.t}.</b> {w.d}</li>)}</ul>
            <h3>קירור 5 דק׳</h3>
            <ul className="clean small">{COOLDOWN.map((c) => <li key={c}>{c}</li>)}</ul>
            <p className="small">אם ברך או שוק ימין כואבות בחימום, מקצרים או מקלים. בתנועות על ארבע אפשר כרית לברכיים; אם הלחץ כואב, לדלג.</p>
          </div>
        )}
      </Card>

      {d.exercises.map((e, i) => (
        <ExerciseCard key={i} idx={i} e={e} st={st} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)}
          onSwap={() => setSwapFor(i)} setEx={(fn) => setEx(i, fn)} onNext={() => setOpen(Math.min(i + 1, d.exercises.length - 1))} />
      ))}

      <Card>
        <div className="field"><label htmlFor="notes">הערות לאימון</label>
          <textarea id="notes" className="input" value={d.notes} placeholder="איך הרגיש, התאמות במכונה, משהו לזכור…"
            onChange={(e) => actions.updateDraft((dr) => ({ ...dr, notes: e.target.value }))} /></div>
        <Btn kind="primary" block onClick={() => go('/workout/finish')} disabled={totalDone === 0}>סיים אימון</Btn>
        {totalDone === 0 && <p className="tiny muted center">סמן לפחות סט אחד כדי לסיים.</p>}
        <Btn kind="ghost" block onClick={() => setConfirmCancel(true)}>בטל אימון (בלי לשמור)</Btn>
      </Card>

      {swapFor !== null && <SwapSheet idx={swapFor} e={d.exercises[swapFor]} st={st} onClose={() => setSwapFor(null)} setEx={(fn) => setEx(swapFor, fn)} />}
      {confirmCancel && <Confirm title="לבטל את האימון?" text="הנתונים שהוזנו באימון הזה יימחקו." ok="כן, בטל" danger onOk={() => { actions.discardDraft(); go('/today'); }} onCancel={() => setConfirmCancel(false)} />}
    </>
  );
}

function ExerciseCard({ idx, e, st, open, onToggle, onSwap, setEx, onNext }: {
  idx: number; e: ExLog; st: AppState; open: boolean; onToggle: () => void; onSwap: () => void; setEx: (fn: (e: ExLog) => ExLog) => void; onNext: () => void;
}) {
  const ex = findExercise(e.exerciseId)!;
  const orig = findExercise(e.slotId)!;
  const pos = positionFor(st.sessions, st.settings.earlyDeloadFrom);
  const slot = useMemo(() => ({ exerciseId: e.slotId, sets: e.plannedSets, repMin: e.repMin, repMax: e.repMax }), [e]);
  const { sug } = suggestFor(st, slot, e.exerciseId, pos);
  const hist = exerciseHistory(st.sessions, e.exerciseId);
  const last = hist[hist.length - 1];
  const done = e.sets.filter((s) => s.done).length;
  const swapped = e.exerciseId !== e.slotId;
  const step = stepFor(st, ex);
  const unit = ex.unit === 'sec' ? 'שנ׳' : 'חזרות';
  const painInfo = exercisePain(st.sessions, e.slotId, st.settings.pauseCleared[e.slotId]);
  const legsNotCleared = (orig.legs || ex.legs) && !st.settings.legsCleared;

  const upd = (si: number, p: Partial<SetLog>) => setEx((x) => ({ ...x, sets: x.sets.map((s, k) => (k === si ? { ...s, ...p } : s)) }));
  const toggleDone = (si: number) => {
    const s = e.sets[si];
    if (s.done) { upd(si, { done: false }); return; }
    const lastR = last?.sets[si]?.r ?? last?.sets.find((q) => q.r)?.r ?? null;
    const r = s.r ?? lastR ?? e.repMin;
    upd(si, { done: true, r });
    if (si === e.sets.length - 1 && e.sets.every((q, k) => k === si || q.done)) setTimeout(onNext, 250);
  };

  return (
    <section className="card ex" aria-label={ex.he}>
      <button className="ex-head" onClick={onToggle} aria-expanded={open}>
        <span className={`idx ${done === e.sets.length && !e.skipped && e.sets.length > 0 ? 'done' : ''}`}>{done === e.sets.length && !e.skipped && e.sets.length > 0 ? <Icon.check /> : idx + 1}</span>
        <span className="grow">
          <span className="bold" style={{ display: 'block' }}>{ex.he}</span>
          <span className="small muted">
            {e.skipped ? 'מדולג' : `${e.plannedSets} × ${e.repMin === e.repMax ? e.repMin : `${e.repMin}–${e.repMax}`}${ex.unit === 'sec' ? ' שנ׳' : ''}${ex.perSide ? ' לצד' : ''} · ${done}/${e.sets.length}`}
            {swapped && ' · חלופה'}
          </span>
        </span>
        <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(-90deg)', display: 'grid' }}><Icon.back /></span>
      </button>
      {open && (
        <div className="ex-body">
          <div className="row wrap">
            {legsNotCleared && <Chip tone="warn">תלוי באישור פיזיותרפיסט</Chip>}
            {swapped && <Chip tone="info">במקום: {orig.he}</Chip>}
            {painInfo.level === 'reduce' && <Chip tone="warn">אחרי כאב: סט פחות, קל יותר</Chip>}
            {painInfo.level === 'pause' && <Chip tone="danger">מושהה · פיזיותרפיסט</Chip>}
          </div>

          {ex.image ? (
            <img className="demo" src={`./img/${ex.image}`} alt={`איור סכמטי: ${ex.he}`} loading="lazy" width={720} height={370} />
          ) : (
            <div className="textcard">אין איור לתרגיל הזה. ההסבר בטקסט בלבד. מומלץ לבקש הדגמה ממדריך.</div>
          )}
          {ex.image && <p className="tiny muted">איור סכמטי מהחוברת הקודמת. דגם המכשיר שלך עשוי להיראות אחרת.</p>}

          <div className="col small">
            <div><b>מתארגנים:</b> {ex.setup}</div>
            <div><b>מבצעים:</b> {ex.doIt}</div>
          </div>
          <div className="emph"><b>הדגש שלך</b>{ex.emphasis}</div>

          <div className={`sug ${sug.kind === 'increase' ? 'up' : sug.kind === 'reduce' || sug.kind === 'paused' ? sug.kind : ''}`}>
            <b>הצעה: </b>{sug.text}
          </div>
          {last && (
            <div className="last">אימון קודם ({formatShort(last.date)}): <span className="num">{last.sets.filter((s) => s.done).map((s) => (s.w ? `${s.w}×${s.r}` : `${s.r}`)).join(' · ') || '—'}</span>{last.deload ? ' (שבוע קל)' : ''}</div>
          )}

          {e.skipped ? (
            <>
              {painInfo.level === 'pause' && (
                <Btn onClick={() => { actions.setSettings({ pauseCleared: { ...st.settings.pauseCleared, [e.slotId]: todayISO() } }); setEx((x) => ({ ...x, skipped: false })); }}>
                  פיזיותרפיסט אישר, להמשיך
                </Btn>
              )}
              <Btn kind="ghost" onClick={() => setEx((x) => ({ ...x, skipped: false }))}>בטל דילוג</Btn>
            </>
          ) : (
            <>
              <div className="sets">
                {e.sets.map((s, si) => {
                  const lastSet = last?.sets[si];
                  return (
                    <div className={`set ${s.done ? 'done' : ''}`} key={si}>
                      <div className="set-head">
                        <b>סט {si + 1}</b>
                        <button className={`check ${s.done ? 'on' : ''}`} aria-pressed={s.done} aria-label={`סט ${si + 1} בוצע`} onClick={() => toggleDone(si)}><Icon.check />{s.done ? 'בוצע' : 'סמן'}</button>
                      </div>
                      <div className="set-fields">
                        {ex.kind !== 'bodyweight' ? (
                          <div className="field"><label>ק״ג</label>
                            <NumField value={s.w} step={step || 1} ph={lastSet?.w ? String(lastSet.w) : ''}
                              onChange={(v) => setEx((x) => ({ ...x, sets: x.sets.map((q, k) => (k === si ? { ...q, w: v } : (k > si && !q.done && (q.w === x.sets[si].w) ? { ...q, w: v } : q))) }))} />
                          </div>
                        ) : <div className="field"><label>משקל</label><div className="input muted" style={{ display: 'grid', alignItems: 'center' }}>משקל גוף</div></div>}
                        <div className="field"><label>{unit}{ex.perSide ? ' (לצד)' : ''}</label>
                          <NumField value={s.r} step={ex.unit === 'sec' ? 5 : 1} min={0} ph={lastSet?.r ? String(lastSet.r) : String(e.repMin)} onChange={(v) => upd(si, { r: v, ...(v === null ? { done: false } : {}) })} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="row wrap">
                <Btn sm onClick={() => setEx((x) => ({ ...x, sets: [...x.sets, { w: x.sets[x.sets.length - 1]?.w ?? null, r: null, done: false }] }))}>+ סט</Btn>
                {e.sets.length > 1 && <Btn sm onClick={() => setEx((x) => ({ ...x, sets: x.sets.slice(0, -1) }))}>− סט</Btn>}
                <Btn sm onClick={onSwap}><Icon.swap /> החלף תרגיל</Btn>
                <Btn sm kind="ghost" onClick={() => setEx((x) => ({ ...x, skipped: true }))}>דלג</Btn>
              </div>
              {ex.kind !== 'bodyweight' && (
                <div className="row small">
                  <span className="muted">מדרגת משקל קטנה:</span>
                  {[1, 1.25, 2.5, 5].map((v) => (
                    <button key={v} className={`chip ${step === v ? 'brand' : ''}`} aria-pressed={step === v} style={{ minHeight: 40, padding: '0 12px' }}
                      onClick={() => actions.setSettings({ stepOverrides: { ...st.settings.stepOverrides, [ex.id]: v } })}>{v}</button>
                  ))}
                </div>
              )}
            </>
          )}
          <input className="input" value={e.note ?? ''} placeholder="הערה לתרגיל (כוונון מכונה, תחושה…)" aria-label="הערה לתרגיל" onChange={(ev) => setEx((x) => ({ ...x, note: ev.target.value }))} />
        </div>
      )}
    </section>
  );
}

function SwapSheet({ idx: _i, e, st, onClose, setEx }: { idx: number; e: ExLog; st: AppState; onClose: () => void; setEx: (fn: (e: ExLog) => ExLog) => void }) {
  const orig = findExercise(e.slotId)!;
  const alts = ALTERNATIVES[e.slotId] ?? [];
  const choose = (id: string) => {
    actions.setSwap(e.slotId, id === e.slotId ? 'orig' : id);
    setEx((x) => ({ ...x, exerciseId: id, sets: x.sets.map((s) => ({ ...s, w: null, r: null, done: false })) }));
    onClose();
  };
  const Option = ({ id, ex, tag }: { id: string; ex: Exercise; tag?: string }) => (
    <button className="card tight" style={{ textAlign: 'start', border: e.exerciseId === id ? '2px solid var(--brand)' : undefined }} onClick={() => choose(id)} aria-pressed={e.exerciseId === id}>
      <div className="row between"><b>{ex.he}</b>{tag && <Chip tone="warn">{tag}</Chip>}</div>
      <div className="small muted">{ex.setup}</div>
      <div className="small">{ex.emphasis}</div>
    </button>
  );
  return (
    <Sheet title="החלפת תרגיל" onClose={onClose}>
      <p className="small muted">החלפה מחליפה גם את הסטים שהוזנו לתרגיל הזה. הבחירה נשמרת לאימונים הבאים עד שתחזור לתרגיל המקורי.</p>
      <Option id={e.slotId} ex={orig} tag={orig.legs && !st.settings.legsCleared ? 'דורש אישור פיזיו' : undefined} />
      {alts.map((a) => <Option key={a.id} id={a.id} ex={altAsExercise(a)} tag={a.legs && !st.settings.legsCleared ? 'דורש אישור פיזיו' : undefined} />)}
      {orig.legs && <p className="small">תרגילי רגליים תלויים באישור פיזיותרפיסט או אורתופד. אם חסר מכשיר, לא מאלתרים תרגיל עמוס.</p>}
    </Sheet>
  );
}

