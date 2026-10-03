import Today from './screens/Today';
import Workout from './screens/Workout';
import Finish from './screens/Finish';
import Log, { SessionDetail } from './screens/Log';
import CardioForm from './screens/CardioForm';
import Progress from './screens/Progress';
import Safety, { Physio } from './screens/Safety';
import Settings from './screens/Settings';
import { Icon, useHash } from './ui/kit';

const NAV = [
  { id: 'today', label: 'היום', icon: <Icon.today />, match: ['today', 'workout', 'cardio', 'settings'] },
  { id: 'log', label: 'יומן', icon: <Icon.log />, match: ['log', 'session'] },
  { id: 'progress', label: 'התקדמות', icon: <Icon.chart />, match: ['progress'] },
  { id: 'safety', label: 'בטיחות', icon: <Icon.shield />, match: ['safety'], cls: 'safety' },
];

export default function App() {
  const hash = useHash();
  const [path, query = ''] = hash.split('?');
  const parts = path.split('/').filter(Boolean);
  const q = new URLSearchParams(query);
  const root = parts[0] ?? 'today';

  let view;
  switch (root) {
    case 'workout': view = parts[1] === 'finish' ? <Finish /> : <Workout />; break;
    case 'log': view = <Log />; break;
    case 'session': view = <SessionDetail id={parts[1]} />; break;
    case 'cardio': view = <CardioForm key={parts[1]} id={parts[1] === 'new' ? undefined : parts[1]} date0={q.get('date') ?? undefined} />; break;
    case 'progress': view = <Progress tab={(['body', 'nutrition', 'strength', 'cardio', 'plan'].includes(parts[1]) ? parts[1] : 'body') as 'body'} />; break;
    case 'plan': view = <Progress tab="plan" />; break;
    case 'safety': view = parts[1] === 'physio' ? <Physio /> : <Safety />; break;
    case 'settings': view = <Settings />; break;
    default: view = <Today />;
  }

  return (
    <>
      <main className="app">{view}</main>
      <nav className="nav" aria-label="ניווט ראשי">
        <div className="nav-inner">
          {NAV.map((n) => (
            <a key={n.id} href={`#/${n.id}`} className={n.cls} aria-current={n.match.includes(root) ? 'page' : undefined}>{n.icon}<span>{n.label}</span></a>
          ))}
        </div>
      </nav>
    </>
  );
}
