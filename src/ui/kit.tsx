import { useEffect, useState, type ReactNode } from 'react';

/* ---------- router (hash) ---------- */
export function useHash(): string {
  const [h, setH] = useState(() => location.hash.slice(1) || '/today');
  useEffect(() => {
    const f = () => { setH(location.hash.slice(1) || '/today'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return h;
}
export const go = (p: string) => { location.hash = '#' + p; };
export const back = (fallback = '/today') => { if (history.length > 1) history.back(); else go(fallback); };

/* ---------- icons ---------- */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
export const Icon = {
  today: () => <svg viewBox="0 0 24 24" {...P}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></svg>,
  log: () => <svg viewBox="0 0 24 24" {...P}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>,
  chart: () => <svg viewBox="0 0 24 24" {...P}><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6" /></svg>,
  shield: () => <svg viewBox="0 0 24 24" {...P}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M12 8v4M12 15.5v.01" /></svg>,
  gear: () => <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></svg>,
  check: () => <svg viewBox="0 0 24 24" {...P} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  swap: () => <svg viewBox="0 0 24 24" {...P}><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>,
  plus: () => <svg viewBox="0 0 24 24" {...P}><path d="M12 5v14M5 12h14" /></svg>,
  back: () => <svg viewBox="0 0 24 24" {...P}><path d="M9 5l7 7-7 7" /></svg>,
  heart: () => <svg viewBox="0 0 24 24" {...P}><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg>,
};

/* ---------- basic components ---------- */
export function Card({ children, tone, className = '' }: { children: ReactNode; tone?: 'brand' | 'warn' | 'danger' | 'info' | 'ok' | 'tight'; className?: string }) {
  return <section className={`card ${tone ?? ''} ${className}`}>{children}</section>;
}
export function Chip({ children, tone }: { children: ReactNode; tone?: 'brand' | 'warn' | 'danger' | 'ok' | 'info' }) {
  return <span className={`chip ${tone ?? ''}`}>{children}</span>;
}
export function Btn(p: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'soft' | 'danger' | 'ghost'; block?: boolean; sm?: boolean; disabled?: boolean; href?: string; label?: string }) {
  const cls = `btn ${p.kind ?? ''} ${p.block ? 'block' : ''} ${p.sm ? 'sm' : ''}`;
  if (p.href) return <a className={cls} href={'#' + p.href} aria-label={p.label}>{p.children}</a>;
  return <button type="button" className={cls} onClick={p.onClick} disabled={p.disabled} aria-label={p.label}>{p.children}</button>;
}
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

/** שדה מספרי עם כפתורי ± ענקיים. הערך נשמר כמחרוזת עד שהוא תקין. */
export function NumField({ value, onChange, step = 1, min = 0, max, ph, label, unit, decimals = 2, plain }: {
  value: number | null | undefined; onChange: (v: number | null) => void; step?: number; min?: number; max?: number; ph?: string; label?: string; unit?: string; decimals?: number; plain?: boolean;
}) {
  const [txt, setTxt] = useState<string>(value == null ? '' : String(value));
  useEffect(() => { setTxt(value == null ? '' : String(value)); }, [value]);
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, Math.round(n * 10 ** decimals) / 10 ** decimals));
  const bump = (d: number) => { const base = value ?? Number(ph) ?? 0; onChange(clamp((Number.isFinite(base) ? base : 0) + d)); };
  const el = (
    <div className="stepper">
      {!plain && <button type="button" aria-label="הפחת" onClick={() => bump(-step)}>−</button>}
      <input className="input" inputMode="decimal" value={txt} placeholder={ph} aria-label={label}
        onChange={(e) => {
          const t = e.target.value.replace(',', '.');
          setTxt(t);
          if (t === '') onChange(null);
          else { const n = Number(t); if (Number.isFinite(n)) onChange(clamp(n)); }
        }} />
      {!plain && <button type="button" aria-label="הוסף" onClick={() => bump(step)}>+</button>}
    </div>
  );
  return label ? <div className="field"><label>{label}{unit ? ` (${unit})` : ''}</label>{el}</div> : el;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row between"><h2>{title}</h2><button className="icon-btn" aria-label="סגור" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, text, ok, danger, onOk, onCancel }: { title: string; text?: string; ok: string; danger?: boolean; onOk: () => void; onCancel: () => void }) {
  return (
    <Sheet title={title} onClose={onCancel}>
      {text && <p>{text}</p>}
      <div className="row">
        <Btn kind={danger ? 'danger' : 'primary'} onClick={onOk} block>{ok}</Btn>
        <Btn onClick={onCancel} block>ביטול</Btn>
      </div>
    </Sheet>
  );
}

export function Toast({ msg }: { msg: string | null }) { return msg ? <div className="toast" role="status">{msg}</div> : null; }
export function useToast(): [string | null, (m: string) => void] {
  const [m, setM] = useState<string | null>(null);
  return [m, (x: string) => { setM(x); setTimeout(() => setM(null), 2400); }];
}

export function PageHeader({ title, sub, right, onBack }: { title: string; sub?: ReactNode; right?: ReactNode; onBack?: () => void }) {
  return (
    <header className="header">
      <div className="row" style={{ minWidth: 0 }}>
        {onBack && <button className="icon-btn" onClick={onBack} aria-label="חזרה"><Icon.back /></button>}
        <div style={{ minWidth: 0 }}><h1>{title}</h1>{sub && <div className="sub">{sub}</div>}</div>
      </div>
      {right}
    </header>
  );
}

/* ---------- charts (SVG, LTR) ---------- */
export interface Line { name: string; values: (number | null)[]; color: string; dash?: boolean; dots?: boolean }
export function LineChart({ labels, lines, h = 190, unit = '', refY, band, yMin, yMax }: {
  labels: string[]; lines: Line[]; h?: number; unit?: string; refY?: { y: number; label: string }; band?: { from: number; to: number; label?: string }; yMin?: number; yMax?: number;
}) {
  const W = 350, padL = 38, padR = 10, padT = 12, padB = 24;
  const all = lines.flatMap((l) => l.values.filter((v): v is number => v !== null));
  if (refY) all.push(refY.y);
  if (band) all.push(band.from, band.to);
  if (all.length === 0) return <div className="muted small center">אין נתונים עדיין</div>;
  let lo = yMin ?? Math.min(...all), hi = yMax ?? Math.max(...all);
  if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
  const span = hi - lo; if (yMin === undefined) lo -= span * 0.08; if (yMax === undefined) hi += span * 0.08;
  const n = Math.max(labels.length, 2);
  const x = (i: number) => padL + ((W - padL - padR) * i) / (n - 1);
  const y = (v: number) => padT + (h - padT - padB) * (1 - (v - lo) / (hi - lo));
  const ticks = [lo, (lo + hi) / 2, hi].map((t) => Math.round(t * 10) / 10);
  const every = Math.ceil(labels.length / 6);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${h}`} role="img" aria-label="גרף">
      {band && <rect x={padL} width={W - padL - padR} y={y(band.to)} height={Math.max(2, y(band.from) - y(band.to))} fill="var(--ok-soft)" />}
      {ticks.map((t) => (<g key={t}><line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" /><text x={padL - 5} y={y(t) + 4} textAnchor="end">{t}</text></g>))}
      {refY && <g><line x1={padL} x2={W - padR} y1={y(refY.y)} y2={y(refY.y)} stroke="var(--ok)" strokeWidth={1.5} strokeDasharray="6 4" /><text x={W - padR} y={y(refY.y) - 4} textAnchor="end" style={{ fill: 'var(--ok)' }}>{refY.label}</text></g>}
      {labels.map((l, i) => i % every === 0 || i === labels.length - 1 ? <text key={i} x={x(i)} y={h - 6} textAnchor="middle">{l}</text> : null)}
      {lines.map((ln) => {
        const pts = ln.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const));
        let d = ''; let pen = false;
        pts.forEach((p) => { if (!p) { pen = false; return; } d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)} `; pen = true; });
        return (
          <g key={ln.name}>
            <path d={d} fill="none" stroke={ln.color} strokeWidth={2.5} strokeDasharray={ln.dash ? '2 5' : undefined} strokeLinecap="round" strokeLinejoin="round" />
            {ln.dots !== false && pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill={ln.color} />)}
          </g>
        );
      })}
      <text x={padL} y={9} textAnchor="start">{unit}</text>
    </svg>
  );
}

export function BarChart({ labels, values, colors, h = 150, goal, unit = '' }: { labels: string[]; values: (number | null)[]; colors?: string[]; h?: number; goal?: { from: number; to?: number }; unit?: string }) {
  const W = 350, padL = 38, padR = 8, padT = 10, padB = 24;
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return <div className="muted small center">אין נתונים עדיין</div>;
  const hi = Math.max(...nums, goal?.to ?? goal?.from ?? 0) * 1.1 || 1;
  const bw = (W - padL - padR) / values.length;
  const y = (v: number) => padT + (h - padT - padB) * (1 - v / hi);
  const every = Math.ceil(labels.length / 7);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${h}`} role="img" aria-label="גרף עמודות">
      {goal && <rect x={padL} width={W - padL - padR} y={y(goal.to ?? goal.from)} height={Math.max(2, y(goal.from) - y(goal.to ?? goal.from))} fill="var(--ok-soft)" />}
      <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--line)" />
      <text x={padL - 5} y={y(hi / 1.1) + 4} textAnchor="end">{Math.round(hi / 1.1)}</text>
      <text x={padL - 5} y={y(0) + 4} textAnchor="end">0</text>
      {values.map((v, i) => v !== null && (
        <rect key={i} x={padL + i * bw + bw * 0.15} width={bw * 0.7} y={y(v)} height={Math.max(1, y(0) - y(v))} rx={3} fill={colors?.[i] ?? 'var(--brand)'} />
      ))}
      {labels.map((l, i) => (i % every === 0 ? <text key={i} x={padL + i * bw + bw / 2} y={h - 6} textAnchor="middle">{l}</text> : null))}
      <text x={padL} y={8} textAnchor="start">{unit}</text>
    </svg>
  );
}

export function Dots({ items }: { items: { label: string; on: boolean; next?: boolean; cardio?: boolean }[] }) {
  return (
    <div className="dots">
      {items.map((d, i) => (
        <div key={i} className={`dot ${d.on ? 'on' : ''} ${d.next ? 'next' : ''} ${d.cardio ? 'cardio' : ''}`} aria-label={d.on ? `${d.label} הושלם` : d.label}>{d.on ? <Icon.check /> : d.label}</div>
      ))}
    </div>
  );
}
