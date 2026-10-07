import { useState } from 'react';
import { WORKOUTS, findExercise } from '../data/plan';
import { groupsHe } from '../data/muscles';
import { actions, useAppState } from '../store';
import { addDays, formatLong, formatShort, todayISO, weekStart } from '../logic/dates';
import { cardioTarget, nextWorkout, positionFor, sortSessions, targetSets } from '../logic/rotation';
import { cardioName, phaseText, weekDone, weekNote } from '../logic/info';
import { generalPain } from '../logic/pain';
import { planWorkout } from '../logic/workout';
import { effectivePriority, isAdjustmentActive } from '../logic/adjust';
import { pendingReview, reviewWeekFor, weekLabel, weekSummary } from '../logic/weekly';
import { SKI_INTERVALS_HE, SKI_STAGE_HE, cardioPlanFor, skiFinisher } from '../logic/ski';
import { Btn, Card, Chip, Confirm, Dots, Icon, NumField, PageHeader, go } from '../ui/kit';

export default function Today() {
  const st = useAppState();
  const today = todayISO();
  const pos = positionFor(st.sessions, st.settings.earlyDeloadFrom);
  const next = nextWorkout(st.sessions);
  const def = WORKOUTS[next];
  const [confirmDeload, setConfirmDeload] = useState(false);
  const done = weekDone(st.sessions);
  const ws = weekStart(today);
  const cardioWeek = st.cardio.filter((c) => c.date >= ws && c.date <= addDays(ws, 6)).length;
  const gp0 = generalPain(st.sessions);
  const cp = cardioPlanFor(st.settings, today, pos, cardioTarget(pos), gp0.level !== 'none');
  const cTarget = cp.target;
  const ski = cp.w;
  const skiPreview = skiFinisher(st.settings, next, today, pos);
  const sorted = sortSessions(st.sessions);
  const latest = sorted[sorted.length - 1];
  const needsMorning = latest && latest.pain && !latest.nextMorning && latest.date < today && latest.date >= addDays(today, -3);
  const gp = generalPain(st.sessions);
  const daily = st.daily[today] ?? { date: today };
  const weighedThisWeek = st.body.some((b) => b.date >= ws);

  const preview = planWorkout(st, next, today, pos).map((p) => {
    const ex = findExercise(p.exerciseId)!;
    const n = targetSets(p.slot, pos);
    return { s: p.slot, ex, n, swapped: p.exerciseId !== p.slot.exerciseId, moved: p.moved, boost: p.boost };
  });
  const prio = effectivePriority(st, today);
  const adj = isAdjustmentActive(st.adjustment, today) ? st.adjustment : null;
  const pendingWs = pendingReview(st, today);
  const pendingSum = pendingWs ? weekSummary(st, pendingWs) : null;

  return (
    <>
      <PageHeader title="שלום משה" sub={formatLong(today)}
        right={<button className="icon-btn" aria-label="הגדרות וגיבוי" onClick={() => go('/settings')}><Icon.gear /></button>} />

      {gp.level !== 'none' && (
        <Card tone={gp.level === 'pause' ? 'danger' : 'warn'}>
          <h3>{gp.level === 'pause' ? 'כאב ב־2 אימונים ברציפות' : 'כאב באימון האחרון'}</h3>
          <p>{gp.level === 'pause' ? 'מומלץ להשהות את התרגיל שמעורר את הכאב ולפנות לפיזיותרפיסט.' : 'באימון הבא: סט אחד פחות בתרגיל המעורר ומשקל קל יותר.'}</p>
          <Btn sm href="/safety">כללי עצירה ובטיחות</Btn>
        </Card>
      )}

      {needsMorning && latest && (
        <Card tone="info">
          <h3>איך הבוקר, אחרי אימון {latest.type}?</h3>
          <p className="small">הגב, השוק והברך לעומת הרגיל שלך.</p>
          <div className="row wrap">
            {([['better', 'טוב יותר'], ['same', 'זהה'], ['worse', 'גרוע יותר']] as const).map(([k, l]) => (
              <button key={k} className="chip" style={{ minHeight: 48, fontSize: 17 }} onClick={() => actions.updateSession(latest.id, { nextMorning: k })}>{l}</button>
            ))}
          </div>
        </Card>
      )}

      {pendingWs && pendingSum && (
        <Card tone="info" className="review-card">
          <div className="row between wrap"><h3>סיכום שבועי</h3><Chip tone="info"><span className="num">{weekLabel(pendingWs)}</span></Chip></div>
          <ul className="clean small">{pendingSum.verdict.slice(0, 2).map((v) => <li key={v}>{v}</li>)}</ul>
          {pendingSum.under.length > 0 && pendingSum.sessionsDone > 0 && <p className="small">יש הצעה לסדר את השבוע הבא כך ש{groupsHe(pendingSum.under.slice(0, 2), true)} יהיו בתחילת האימון.</p>}
          <Btn kind="primary" block onClick={() => go(`/review/${pendingWs}`)}>לסיכום השבוע</Btn>
        </Card>
      )}

      {ski && (
        <Card tone="tight" className="ski-card">
          <div className="row between wrap">
            <h3>הכנה לסקי</h3>
            <Chip tone={ski.taper ? 'warn' : 'info'}>{ski.daysLeft === 0 ? 'היום!' : `עוד ${ski.daysLeft} ימים`}</Chip>
          </div>
          <p className="small">
            {ski.before ? `הבלוק מתחיל בעוד ${ski.daysLeft - 84} ימים; עד אז שלב ההיכרות.` : `שבוע ${ski.week} מתוך 12 · ${SKI_STAGE_HE[ski.stage]}.`}
            {ski.taper && ' שבוע אחרון לפני הטיול: כ־40% פחות נפח, לנוח ולהגיע רענן.'}
          </p>
          <p className="tiny muted">הטיול ב־{formatShort(st.settings.skiTripDate)} · אפשר לשנות או לכבות בהגדרות.</p>
        </Card>
      )}

      <Card tone="brand">
        <div className="row between wrap">
          <Chip tone="brand">האימון הבא</Chip>
          <Chip tone={pos.deload ? 'warn' : undefined}>{phaseText(pos)}</Chip>
        </div>
        <div>
          <h1 style={{ fontSize: 34 }}>{def.title}</h1>
          <div className="muted">{def.subtitle}</div>
        </div>
        <p className="small">{weekNote(pos)}</p>
        <div className="col" style={{ gap: 4 }}>
          {preview.map(({ s, ex, n, swapped, moved, boost }, i) => (
            <div key={i} className="row between small" style={{ gap: 8 }}>
              <span className="grow">{i + 1}. {ex.he}{swapped && <span className="muted"> (חלופה)</span>}{moved && <span className="tag" title={moved}>הוקדם</span>}</span>
              <span className="num bold">{n.sets + (boost ? 1 : 0)} × {s.repMin === s.repMax ? s.repMin : `${s.repMin}–${s.repMax}`}{ex.unit === 'sec' ? '"' : ''}</span>
            </div>
          ))}
        </div>
        {skiPreview.length > 0 && (
          <div className="col" style={{ gap: 4 }}>
            <span className="label">סיום סקי · כ־10 דק׳</span>
            {skiPreview.map((it, i) => (
              <div key={it.slotId} className="row between small" style={{ gap: 8 }}>
                <span className="grow">{preview.length + i + 1}. {it.ex.he}{it.swapped && <span className="muted"> (חלופה)</span>}</span>
                <span className="num bold">{it.sets} × {it.dose}{it.ex.unit === 'sec' ? '"' : ''}</span>
              </div>
            ))}
          </div>
        )}
        {prio.length > 0 && (
          <p className="tiny">
            <b>{groupsHe(prio.map((p) => p.group))}</b> בתחילת האימון{adj ? ` (התאמה שבועית עד שבת ${formatShort(adj.until)})` : ' (קבוע)'}.
            {preview.some((p) => p.boost) && ' כולל סט נוסף אחד.'}
          </p>
        )}
        {st.draft ? (
          <Btn kind="primary" block onClick={() => go('/workout')}>המשך אימון {st.draft.type}</Btn>
        ) : (
          <Btn kind="primary" block onClick={() => { actions.startWorkout(next); go('/workout'); }}>התחל אימון {next}</Btn>
        )}
        {st.draft && st.draft.type !== next && <p className="tiny muted">יש אימון {st.draft.type} פתוח. סיים אותו או בטל אותו במסך האימון.</p>}
      </Card>

      <Card>
        <h3>התקדמות השבוע</h3>
        <div className="row between wrap">
          <div className="col">
            <span className="label">כוח · {done.length}/3</span>
            <Dots items={[0, 1, 2].map((i) => ({ label: done[i]?.type ?? ['A', 'B', 'C'][(['A', 'B', 'C'].indexOf(next) + i - done.length + 3) % 3], on: i < done.length, next: i === done.length }))} />
          </div>
          <div className="col">
            <span className="label">אירובי · {cardioWeek}/2</span>
            <Dots items={[0, 1].map((i) => ({ label: '♥', on: i < cardioWeek, cardio: true }))} />
          </div>
        </div>
        <p className="tiny muted">הסדר לפי אימונים שהושלמו, לא לפי תאריכים. אם השבוע היו רק 2, השבוע הבא מתחיל מהשלישי.</p>
        {!pendingWs && st.sessions.length > 0 && <Btn sm kind="soft" href={`/review/${reviewWeekFor(today)}`}>סיכום שבועי</Btn>}
        <div className="row between small">
          <span>{pos.deload ? 'עכשיו בשבוע קל' : `עוד ${pos.untilDeload} אימוני כוח עד שבוע קל`}</span>
          {pos.early ? (
            <button className="chip" onClick={() => actions.setSettings({ earlyDeloadFrom: null })}>בטל הקדמה</button>
          ) : !pos.deload ? (
            <button className="chip" onClick={() => setConfirmDeload(true)}>הקדם שבוע קל</button>
          ) : null}
        </div>
      </Card>

      <Card tone="info">
        <div className="row between"><h3>אירובי קל (רשות)</h3><Chip tone="info"><Icon.heart /> Zone 2</Chip></div>
        <p>
          {cTarget.min === cTarget.max ? `${cTarget.min}` : `${cTarget.min}–${cTarget.max}`} דקות בקצב שיחה{cTarget.easy ? ', קל מאוד' : ''}.
          {' '}אופניים, אליפטי, הליכה בשיפוע קל או שחייה. בלי ריצה ובלי קפיצות.
        </p>
        {cp.skiIntervals && <p className="small"><b>אינטרוולים לסקי:</b> {SKI_INTERVALS_HE}</p>}
        <div className="row wrap">
          <Btn kind="soft" href="/cardio/new">רשום אירובי</Btn>
          {st.cardio.length > 0 && (() => { const c = [...st.cardio].sort((a, b) => b.date.localeCompare(a.date))[0]; return <span className="small muted">אחרון: {cardioName(c.type)} · {c.minutes} דק׳</span>; })()}
        </div>
      </Card>

      <Card>
        <div className="row between"><h3>יומן יומי</h3><Btn sm href="/progress/nutrition">עוד</Btn></div>
        <div className="row" style={{ alignItems: 'stretch' }}>
          <div className="grow"><NumField plain label="חלבון (גרם)" value={daily.protein} onChange={(v) => actions.setDaily(today, { protein: v })} ph="150–180" /></div>
          <div className="grow"><NumField plain label="קלוריות" value={daily.kcal} onChange={(v) => actions.setDaily(today, { kcal: v })} ph="1,900+" /></div>
          <div className="grow"><NumField plain label="צעדים" value={daily.steps} onChange={(v) => actions.setDaily(today, { steps: v })} ph="8,000+" /></div>
        </div>
        <p className="tiny muted">חלבון 150–180 גרם · קלוריות לא מתחת ל־1,900–2,000 · צעדים 8,000–10,000</p>
        {!weighedThisWeek && (
          <div className="row between small"><span>עדיין לא שקלת השבוע</span><Btn sm kind="soft" href="/progress/body">שקילה</Btn></div>
        )}
      </Card>

      {!st.settings.legsCleared && (
        <Card tone="warn">
          <h3>תרגילי רגליים: תלויים באישור</h3>
          <p className="small">לחיצת רגליים וכפיפת ברך מוחלפות עד שפיזיותרפיסט או אורתופד מאשרים טווח ועומס (בגלל ה־OCD בברך).</p>
          <Btn sm onClick={() => actions.setSettings({ legsCleared: true })}>קיבלתי אישור</Btn>
        </Card>
      )}

      <Btn href="/progress/plan" block>תוכנית 12 שבועות</Btn>
      {confirmDeload && (
        <Confirm title="להקדים שבוע קל?" text="3 האימונים הבאים יהיו בשבוע קל: כ־40% פחות סטים וכ־10% פחות משקל. מתאים כשהגב, השוק או הברך לא רגועים, או כשהעייפות חריגה." ok="כן, הקדם"
          onOk={() => { actions.setSettings({ earlyDeloadFrom: st.sessions.length }); setConfirmDeload(false); }} onCancel={() => setConfirmDeload(false)} />
      )}
    </>
  );
}
