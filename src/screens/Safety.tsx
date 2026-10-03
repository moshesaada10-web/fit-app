import { PHYSIO_BRING, PHYSIO_QUESTIONS, SAFETY } from '../data/plan';
import { actions, useAppState } from '../store';
import { Btn, Card, PageHeader, go } from '../ui/kit';

export default function Safety() {
  const st = useAppState();
  return (
    <>
      <PageHeader title="בטיחות" sub="תמיד נגיש. כללי עצירה ומתי לפנות לעזרה" />
      <Card tone="danger">
        <h2>מתי צריך בדיקה דחופה? מיון מיידי</h2>
        <ul className="clean">{SAFETY.urgent.map((t) => <li key={t}><b>{t}</b></li>)}</ul>
        <p>הפרעה חדשה בשליטה בשתן או בצואה, קושי חדש לתת שתן, או ירידה בתחושה באזור המפשעה מחייבים פנייה מיידית למיון. חולשה חדשה או מתקדמת ברגל דורשת הערכה רפואית דחופה.</p>
      </Card>

      <Card tone="warn">
        <h2>מתי מפסיקים תרגיל?</h2>
        <ul className="clean">{SAFETY.stop.map((t) => <li key={t}>{t}</li>)}</ul>
        <p>להפסיק ולפנות לבדיקה אם הסימנים חוזרים.</p>
      </Card>

      <Card>
        <h2>כלל הכאב (0–10)</h2>
        <ul className="clean">{SAFETY.painRule.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="small muted">הכלל לא מחליף את כללי העצירה. בסיס: מה שמרגישים ביום רגיל.</p>
      </Card>

      <Card tone="info">
        <h2>רגליים, ברך ו־OCD</h2>
        <p>לחיצת רגליים וכפיפת ברך תלויות באישור פיזיותרפיסט או אורתופד. אופניים, אליפטי, שיפוע ושחייה כדאי לברר גם הם. עד אז, לדלג על תרגיל רגליים שהמגבלות שלו אינן ידועות. אין ריצה ואין קפיצות.</p>
        <label className="checkrow"><input type="checkbox" checked={st.settings.legsCleared} onChange={(e) => actions.setSettings({ legsCleared: e.target.checked })} /><span>קיבלתי אישור לתרגילי רגליים (לחיצת רגליים וכפיפת ברך)</span></label>
        <Btn kind="soft" block onClick={() => go('/safety/physio')}>רשימה לפיזיותרפיסט / אורתופד</Btn>
      </Card>

      <Card>
        <h2>בזמן טיפול במוג׳רו</h2>
        <p className="small">לפנות לרופא: בחילה או הקאות חזקות, סחרחורת, חולשה, עצירות קשה, או ירידה מהירה מדי במשקל. מינון או הפסקה: רק בתיאום עם הרופא.</p>
      </Card>

      <p className="tiny muted center">האפליקציה נותנת הנחיות כלליות ואינה תחליף לייעוץ רפואי. היא לא מבטיחה תוצאה ולא מונעת כאב.</p>
    </>
  );
}

export function Physio() {
  const st = useAppState();
  const chk = st.settings.physioChecked;
  const toggle = (k: string) => actions.setSettings({ physioChecked: { ...chk, [k]: !chk[k] } });
  const Item = ({ k, t }: { k: string; t: string }) => (
    <label className="checkrow"><input type="checkbox" checked={!!chk[k]} onChange={() => toggle(k)} /><span>{t}</span></label>
  );
  return (
    <>
      <PageHeader title="רשימה לפיזיותרפיסט" sub="מה להביא ומה לשאול" onBack={() => go('/safety')} />
      <Card>
        <h2>מה להביא</h2>
        {PHYSIO_BRING.map((t, i) => <Item key={t} k={`b${i}`} t={t} />)}
      </Card>
      <Card>
        <h2>לפני הפגישה</h2>
        <ul className="clean small">
          <li>לסמן 2–3 שאלות חשובות במיוחד.</li>
          <li>לרשום מתי הכאב בשוק מופיע (בהליכה, במנוחה, בלילה).</li>
          <li>לרשום מה מחמיר ומה מקל.</li>
          <li>לבקש הדגמה של הטווחים המותרים.</li>
        </ul>
      </Card>
      <Card>
        <h2>שאלות לשאול</h2>
        {PHYSIO_QUESTIONS.map((t, i) => <Item key={t} k={`q${i}`} t={t} />)}
      </Card>
      <Card tone="warn"><p className="small">כשתקבל תשובה על תרגילי הרגליים, סמן "קיבלתי אישור" בעמוד הבטיחות או בהגדרות.</p><Btn sm href="/safety">לעמוד הבטיחות</Btn></Card>
    </>
  );
}
