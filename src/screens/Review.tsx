import { useMemo, useState } from 'react';
import { findExercise } from '../data/plan';
import { GROUPS, GROUP_HE, groupsHe } from '../data/muscles';
import { actions, useAppState } from '../store';
import { HE_DAYS, formatShort, parseISO, todayISO } from '../logic/dates';
import { isAdjustmentActive } from '../logic/adjust';
import { detectPatterns } from '../logic/patterns';
import { CARDIO_TARGET, SESSIONS_TARGET, proposeAdjustment, reviewWeekFor, weekLabel, weekSummary } from '../logic/weekly';
import { Btn, Card, Chip, Dots, PageHeader, Toast, go, useToast } from '../ui/kit';

const exName = (id: string) => findExercise(id)?.he ?? id;
const dayName = (d: string) => `${HE_DAYS[parseISO(d).getDay()]} ${formatShort(d)}`;

export default function Review({ week }: { week?: string }) {
  const st = useAppState();
  const today = todayISO();
  const ws = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : reviewWeekFor(today);
  const sum = useMemo(() => weekSummary(st, ws), [st, ws]);
  const prop = useMemo(() => proposeAdjustment(st, sum), [st, sum]);
  const pat = useMemo(() => detectPatterns(st, ws, today), [st, ws, today]);
  const rec = st.reviews[ws];
  const [off, setOff] = useState<string[]>([]);
  const [toast, say] = useToast();
  const hasProposal = sum.sessionsDone > 0 && prop.priority.length + prop.boosts.length > 0;
  const adjFromThis = st.adjustment?.fromWeek === ws && isAdjustmentActive(st.adjustment, today) ? st.adjustment : null;
  const boostKey = (b: { workout: string; slotId: string }) => `${b.workout}:${b.slotId}`;

  const approve = () => {
    actions.approveReview(ws, { fromWeek: ws, until: prop.until, priority: prop.priority, boosts: prop.boosts.filter((b) => !off.includes(boostKey(b))) }, today);
    say('השינויים אושרו לשבוע הבא');
  };

  return (
    <>
      <PageHeader title="סיכום שבועי" sub={<>שבוע <span className="num">{weekLabel(ws)}</span> · ראשון עד שבת</>} onBack={() => go('/today')} />

      <Card tone="brand">
        <h3>בשורה התחתונה</h3>
        <ul className="clean verdict">{sum.verdict.map((v) => <li key={v}>{v}</li>)}</ul>
      </Card>

      <Card>
        <div className="row between wrap">
          <div className="col">
            <span className="label">כוח · {sum.sessionsDone}/{SESSIONS_TARGET}</span>
            <Dots items={[0, 1, 2].map((i) => ({ label: sum.sessions[i]?.type ?? sum.missedWorkouts[i - sum.sessionsDone] ?? '', on: i < sum.sessionsDone }))} />
          </div>
          <div className="col">
            <span className="label">אירובי · {sum.cardioDone}/{CARDIO_TARGET}</span>
            <Dots items={[0, 1].map((i) => ({ label: '♥', on: i < sum.cardioDone, cardio: true }))} />
          </div>
        </div>
        {sum.missedWorkouts.length > 0 && sum.sessionsDone > 0 && (
          <p className="small">לא בוצע: אימון {sum.missedWorkouts.join(', ')}. הרוטציה נשמרת: השבוע הבא מתחיל באימון {sum.nextType}.</p>
        )}
        {sum.manualCount > 0 && <p className="tiny muted">{sum.manualCount} אימונים נרשמו בדיעבד בלי פירוט ונספרו לפי התוכנית.</p>}
      </Card>

      <Card>
        <h3>סטים לפי קבוצת שרירים</h3>
        <p className="tiny muted">סטים שבוצעו מול המתוכנן לשבוע (3 אימונים). נספרת רק הקבוצה העיקרית של כל תרגיל.</p>
        <div className="col groups">
          {GROUPS.filter((g) => sum.groups[g].planned > 0 || sum.groups[g].done > 0).map((g) => {
            const s = sum.groups[g];
            const r = s.ratio ?? 0;
            const tone = sum.sessionsDone === 0 ? '' : sum.under.includes(g) ? 'under' : sum.good.includes(g) ? 'good' : 'mid';
            return (
              <div key={g} className={`grp ${tone}`}>
                <div className="row between small">
                  <b>{GROUP_HE[g].he}</b>
                  <span className="row" style={{ gap: 6 }}>
                    <span className="num bold">{s.done}/{s.planned}</span>
                    {tone === 'under' && <Chip tone="warn">בפיגור</Chip>}
                    {tone === 'good' && <Chip tone="ok">יפה</Chip>}
                  </span>
                </div>
                <div className="bar" aria-hidden><i style={{ width: `${Math.min(100, Math.round(r * 100))}%` }} /></div>
              </div>
            );
          })}
        </div>
      </Card>

      {sum.skipped.length > 0 && (
        <Card>
          <h3>תרגילים שדילגת עליהם</h3>
          {sum.skipped.map((k, i) => (
            <div key={i} className="row between small">
              <span>{exName(k.exerciseId)}{k.partial ? ' (חלקי)' : ''}</span>
              <span className="muted">אימון {k.type} · {dayName(k.date)}</span>
            </div>
          ))}
        </Card>
      )}

      {sum.pain.length > 0 && (
        <Card tone={sum.pain.some((p) => p.triggered) ? 'warn' : undefined}>
          <h3>כאב והערות</h3>
          {sum.pain.map((p, i) => (
            <div key={i} className="col" style={{ gap: 2 }}>
              <div className="row between small">
                <b>אימון {p.type} · {dayName(p.date)}</b>
                {p.triggered && <Chip tone="warn">כלל הכאב</Chip>}
              </div>
              {p.pain && <span className="small">גב {p.pain.back} · שוק {p.pain.shin} · ברך {p.pain.knee}{p.nextMorning ? ` · בבוקר: ${p.nextMorning === 'better' ? 'טוב יותר' : p.nextMorning === 'same' ? 'זהה' : 'גרוע יותר'}` : ''}</span>}
              {p.triggers.length > 0 && <span className="small">עורר כאב: {p.triggers.map(exName).join(', ')}</span>}
              {p.notes && <span className="small muted">״{p.notes}״</span>}
            </div>
          ))}
        </Card>
      )}

      {hasProposal && !rec && (
        <Card tone="info" className="proposal">
          <h3>התאמה לשבוע הבא</h3>
          {prop.priority.length > 0 && (
            <p>עד שבת {formatShort(prop.until)}, התרגילים של <b>{groupsHe(prop.priority.map((p) => p.group))}</b> יעברו לתחילת האימון, כשאתה רענן.</p>
          )}
          {prop.moves.length > 0 && (
            <div className="col" style={{ gap: 4 }}>
              {prop.moves.map((m) => <div key={m.workout} className="small"><b>אימון {m.workout}:</b> {m.names.join(', ')} ראשונים</div>)}
            </div>
          )}
          {prop.boosts.map((b) => {
            const k = boostKey(b);
            return (
              <label key={k} className="checkrow">
                <input type="checkbox" checked={!off.includes(k)} onChange={(e) => setOff(e.target.checked ? off.filter((x) => x !== k) : [...off, k])} />
                <span>סט אחד נוסף ב{exName(b.slotId)} (אימון {b.workout}), בגלל {GROUP_HE[b.group].he}</span>
              </label>
            );
          })}
          {prop.boostBlocked.length > 0 && (
            <div className="col tiny muted" style={{ gap: 2 }}>
              {prop.boostBlocked.map((b) => <span key={b.group}>בלי סט נוסף ל{GROUP_HE[b.group].he}: {b.why}.</span>)}
            </div>
          )}
          {prop.notMoved.length > 0 && <p className="tiny muted">{groupsHe(prop.notMoved)}: נשאר בסוף האימון בכוונה (שומרים על הגב ועל הלחיצות).</p>}
          <p className="tiny muted">הרוטציה לא משתנה (האימון הבא: {sum.nextType}). אחרי שבוע הכול חוזר לבד לסדר הרגיל.</p>
          <Btn kind="primary" block onClick={approve}>אשר שינויים</Btn>
          <Btn block onClick={() => { actions.closeReview(ws, 'dismissed', today); say('בלי שינויים השבוע'); }}>לא עכשיו</Btn>
        </Card>
      )}

      {rec?.decision === 'approved' && (
        <Card tone="ok">
          <h3>{adjFromThis ? `השינויים פעילים עד שבת ${formatShort(adjFromThis.until)}` : 'השינויים אושרו'}</h3>
          {adjFromThis && adjFromThis.priority.length > 0 && <p className="small">ראשונים באימון: {groupsHe(adjFromThis.priority.map((p) => p.group))}.</p>}
          {adjFromThis && adjFromThis.boosts.length > 0 && <p className="small">סט נוסף: {adjFromThis.boosts.map((b) => `${exName(b.slotId)} (${b.workout})`).join(', ')}.</p>}
          {!adjFromThis && <p className="small muted">תוקף ההתאמה הסתיים או שבוטלה.</p>}
          {adjFromThis && <Btn sm onClick={() => { actions.cancelAdjustment(); say('ההתאמה בוטלה'); }}>בטל שינויים</Btn>}
        </Card>
      )}
      {rec?.decision === 'dismissed' && (
        <Card tone="tight">
          <p className="small">בחרת לא לשנות את הסדר השבוע.</p>
          <Btn sm onClick={() => actions.reopenReview(ws)}>הצג שוב את ההצעה</Btn>
        </Card>
      )}

      {pat.enough ? (
        <Card>
          <h3>דפוסים · {pat.weeks.length} שבועות אחרונים</h3>
          {pat.suggestions.length === 0 && <p className="small muted">אין דפוס שמצריך שינוי. ממשיכים ככה.</p>}
          {pat.suggestions.map((s) => (
            <div key={s.id} className={`sugg ${s.kind}`}>
              <p className="small">{s.text}</p>
              {s.kind === 'swap' && (
                <div className="row wrap">
                  <Btn sm kind="soft" onClick={() => { actions.applyPermanentSwap(s.slotId, s.altId, today); say('הוחלף לצמיתות. אפשר לבטל בהגדרות'); }}>החלף לצמיתות</Btn>
                  <Btn sm kind="ghost" onClick={() => actions.dismissSuggestion(s.id, today)}>לא תודה</Btn>
                </div>
              )}
              {s.kind === 'priority' && (
                <div className="row wrap">
                  <Btn sm kind="soft" onClick={() => { actions.applyPermanentPriority(s.group, today); say(`${GROUP_HE[s.group].he} ראשון באופן קבוע. אפשר לבטל בהגדרות`); }}>השאר ראשון קבוע</Btn>
                  <Btn sm kind="ghost" onClick={() => actions.dismissSuggestion(s.id, today)}>לא תודה</Btn>
                </div>
              )}
            </div>
          ))}
          {pat.stats.length > 0 && (
            <details>
              <summary>השלמה לפי תרגיל</summary>
              <div className="col" style={{ gap: 6 }}>
                {pat.stats.map((x) => (
                  <div key={x.slotId} className="row between small">
                    <span className="grow">{exName(x.slotId)}</span>
                    <span className="num">{x.done}/{x.appearances}</span>
                    <span className={`num bold ${x.rate < 0.5 ? 'warn-t' : ''}`} style={{ minWidth: 44, textAlign: 'end' }}>{Math.round(x.rate * 100)}%</span>
                  </div>
                ))}
              </div>
            </details>
          )}
          <p className="tiny muted">שינוי קבוע נעשה רק באישור שלך, ואפשר לבטל אותו בהגדרות.</p>
        </Card>
      ) : (
        <Card tone="tight"><p className="small muted">דפוסים ארוכי טווח (מה אתה מדלג עליו, איזו קבוצה בפיגור קבוע) יופיעו אחרי 3 שבועות של נתונים. כרגע: {pat.weeks.length}.</p></Card>
      )}

      {!hasProposal && !rec && <Btn kind="primary" block onClick={() => { actions.closeReview(ws, 'ack', today); go('/today'); }}>הבנתי</Btn>}
      <Btn block href="/today">חזרה להיום</Btn>
      <Toast msg={toast} />
    </>
  );
}
