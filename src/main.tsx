import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// autoUpdate: גרסה חדשה מותקנת ומופעלת לבד (skipWaiting + clientsClaim) והדף נטען מחדש.
// הנתונים ב-localStorage (כולל אימון פתוח) לא נפגעים. אפליקציה מותקנת שנשארת פתוחה ברקע
// לא תמיד מנווטת מחדש, לכן בודקים עדכון כשחוזרים אליה וגם כל שעה.
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
      setInterval(check, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    },
  });
}
