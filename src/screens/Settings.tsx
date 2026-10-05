import { useRef, useState } from 'react';
import { actions, exportJSON, parseBackup, useAppState } from '../store';
import { Btn, Card, Confirm, Field, NumField, PageHeader, Toast, go, useToast } from '../ui/kit';
import type { AppState } from '../types';
import { findExercise } from '../data/plan';
import { GROUP_HE, groupsHe } from '../data/muscles';
import { formatShort, todayISO } from '../logic/dates';
import { isAdjustmentActive } from '../logic/adjust';

export default function Settings() {
  const st = useAppState();
  const s = st.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, say] = useToast();
  const [pending, setPending] = useState<AppState | null>(null);
  const [reset, setReset] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `moshe-fitness-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say('הגיבוי נשמר בקובץ');
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    setErr(null);
    try { setPending(parseBackup(await f.text())); } catch (e) { setErr((e as Error).message); }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <PageHeader title="הגדרות וגיבוי" onBack={() => go('/today')} />
      <Card>
        <h3>פרטים</h3>
        <NumField label="משקל התחלה" unit="ק״ג" value={s.baselineKg} step={0.5} decimals={1} onChange={(v) => v && actions.setSettings({ baselineKg: v })} />
        <NumField label="יעד" unit="ק״ג" value={s.goalKg} step={0.5} decimals={1} onChange={(v) => v && actions.setSettings({ goalKg: v })} />
        <Field label="תאריך נקודת ההתחלה"><input className="input" type="date" value={s.baselineDate} onChange={(e) => e.target.value && actions.setSettings({ baselineDate: e.target.value })} /></Field>
        <label className="checkrow"><input type="checkbox" checked={s.legsCleared} onChange={(e) => actions.setSettings({ legsCleared: e.target.checked })} /><span>אישור פיזיותרפיסט/אורתופד לתרגילי רגליים</span></label>
        <p className="tiny muted">בלי אישור, לחיצת רגליים וכפיפת ברך מוחלפות אוטומטית בתרגיל חלופי.</p>
      </Card>

      <Card>
        <h3>התאמות וסדר תרגילים</h3>
        {isAdjustmentActive(st.adjustment, todayISO()) ? (
          <div className="col" style={{ gap: 6 }}>
            <p className="small">התאמה שבועית פעילה עד שבת {formatShort(st.adjustment!.until)}: {st.adjustment!.priority.length ? `${groupsHe(st.adjustment!.priority.map((p) => p.group))} בתחילת האימון` : 'בלי שינוי סדר'}{st.adjustment!.boosts.length ? `, סט נוסף ב${st.adjustment!.boosts.map((b) => findExercise(b.slotId)?.he).join(', ')}` : ''}.</p>
            <Btn sm onClick={() => { actions.cancelAdjustment(); say('ההתאמה השבועית בוטלה'); }}>בטל התאמה שבועית</Btn>
          </div>
        ) : <p className="small muted">אין התאמה שבועית פעילה.</p>}
        <h3>שינויים קבועים</h3>
        {st.permanent.length === 0 && <p className="small muted">אין. שינוי קבוע נוצר רק כשמאשרים הצעה בסיכום השבועי.</p>}
        {st.permanent.map((c) => (
          <div key={c.id} className="row between small perm">
            <span className="grow">
              {c.kind === 'swap' ? `${findExercise(c.slotId!)?.he} ← ${findExercise(c.altId!)?.he}` : `${GROUP_HE[c.group!].he} תמיד בתחילת האימון`}
              <span className="muted"> · מ־{formatShort(c.createdOn)}</span>
            </span>
            <Btn sm onClick={() => { actions.undoPermanent(c.id); say('השינוי בוטל'); }}>בטל</Btn>
          </div>
        ))}
      </Card>

      <Card>
        <h3>גיבוי</h3>
        <p className="small">הנתונים נשמרים רק במכשיר הזה (בלי חשבון ובלי ענן). מומלץ לייצא מדי פעם קובץ גיבוי.</p>
        <Btn kind="primary" block onClick={doExport}>ייצוא גיבוי (JSON)</Btn>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} aria-label="קובץ גיבוי" />
        <Btn block onClick={() => fileRef.current?.click()}>ייבוא מגיבוי</Btn>
        {err && <p className="bold" style={{ color: 'var(--danger)' }} role="alert">{err}</p>}
        <p className="tiny muted">{st.sessions.length} אימוני כוח · {st.cardio.length} אירובי · {st.body.length} שקילות · {Object.keys(st.daily).length} ימי יומן</p>
      </Card>

      <Card tone="danger">
        <h3>איפוס</h3>
        <p className="small">מוחק את כל הנתונים במכשיר. כדאי לייצא גיבוי לפני כן.</p>
        <Btn kind="danger" block onClick={() => setReset(true)}>מחק הכול</Btn>
      </Card>

      <Card tone="tight">
        <p className="small">האפליקציה נותנת הנחיות כלליות ואינה תחליף לבדיקה והדרכה אצל רופא, פיזיותרפיסט או דיאטנית. האיורים סכמטיים ומהחוברת הקודמת.</p>
      </Card>

      {pending && <Confirm title="לייבא את הגיבוי?" text={`הנתונים הנוכחיים יוחלפו: ${pending.sessions.length} אימוני כוח, ${pending.cardio.length} אירובי, ${pending.body.length} שקילות.`} ok="ייבא והחלף" onOk={() => { actions.importAll(pending); setPending(null); say('הגיבוי נטען'); }} onCancel={() => setPending(null)} />}
      {reset && <Confirm title="למחוק את כל הנתונים?" text="אי אפשר לשחזר בלי קובץ גיבוי." ok="מחק הכול" danger onOk={() => { actions.resetAll(); setReset(false); say('הכול נמחק'); }} onCancel={() => setReset(false)} />}
      <Toast msg={toast} />
    </>
  );
}
