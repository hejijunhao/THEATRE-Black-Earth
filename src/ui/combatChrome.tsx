// Shared combat chrome: pip dice, strength strips, verdict copy.
// Used by the preview panel and the after-action dispatch.

import { CombatVerdict } from '../game/types';

export const VERDICT_LABEL: Record<CombatVerdict, string> = {
  decisive: 'Decisive advantage',
  favourable: 'Favourable',
  even: 'Even engagement',
  risky: 'Risky',
  severe: 'Severe disadvantage',
};

const PIP: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function DieFace({ value }: { value: number }) {
  const on = new Set(PIP[value] ?? []);
  return (
    <span className="die-face" aria-label={`d6 showing ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={on.has(i) ? 'pip on' : 'pip'} />
      ))}
    </span>
  );
}

export function StrengthStrip({
  before,
  after,
  align = 'left',
}: {
  before: number;
  after: number;
  align?: 'left' | 'right';
}) {
  const lost = Math.max(0, before - after);
  return (
    <div className={`str-strip ${align}`}>
      <div className="str-bar" aria-hidden>
        <span className="ghost" style={{ width: `${Math.max(2, before)}%` }} />
        <span className="now" style={{ width: `${Math.max(2, after)}%` }} />
      </div>
      <div className="str-n">
        {Math.round(before)}
        <span className="arrow">→</span>
        {Math.round(after)}
        {lost > 0.5 && <span className="lost">−{Math.round(lost)}</span>}
      </div>
    </div>
  );
}

