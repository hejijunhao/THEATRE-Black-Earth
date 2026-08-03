// Inline-SVG line icon system (v2-vision §7.2): ~30 icons drawn as paths,
// stroke = currentColor, so the no-assets property holds and icons inherit
// text colour. Sober line work — instrument markings, not toybox glyphs.

import { ReactNode } from 'react';

const P = (d: string) => <path d={d} />;
const C = (cx: number, cy: number, r: number) => <circle cx={cx} cy={cy} r={r} />;

const ICONS: Record<string, ReactNode> = {
  // resources
  manpower: (
    <>
      {C(12, 7, 3.2)}
      {P('M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5')}
    </>
  ),
  equipment: (
    <>
      {P('M4 16h16M6 16v-5h12v5M9 11V8h6v3')}
      {C(8, 18.5, 1.6)}
      {C(16, 18.5, 1.6)}
    </>
  ),
  command: P('M6 20V5m0 0h10l-2.5 3.5L16 12H6'),
  support: (
    <>
      {P('M12 20V10M12 10c-4.5 0-7-2.5-7-6 4.5 0 7 2.5 7 6zM12 10c4.5 0 7-2.5 7-6-4.5 0-7 2.5-7 6z')}
    </>
  ),
  score: (
    <>
      {C(12, 12, 7.5)}
      {C(12, 12, 3.5)}
      {P('M12 2v3M12 19v3M2 12h3M19 12h3')}
    </>
  ),
  vp: P('M12 3l7 9-7 9-7-9z'),
  turn: (
    <>
      {P('M5 6h14v14H5zM5 10h14M9 4v4M15 4v4')}
    </>
  ),
  // weather
  clear: (
    <>
      {C(12, 12, 4.5)}
      {P('M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8')}
    </>
  ),
  overcast: P('M6 16a4 4 0 1 1 .5-8 5 5 0 0 1 9.5-1 4 4 0 0 1 2 7.5H6z'),
  rain: (
    <>
      {P('M6 13a4 4 0 1 1 .5-8 5 5 0 0 1 9.5-1 4 4 0 0 1 2 7.5H6z')}
      {P('M8 17l-1 3M13 17l-1 3M18 17l-1 3')}
    </>
  ),
  mud: P('M3 15c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 19c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0'),
  snow: (
    <>
      {P('M12 4v16M5 8l14 8M19 8L5 16')}
      {P('M12 4l-2 2M12 4l2 2M12 20l-2-2M12 20l2-2')}
    </>
  ),
  // unit types (NATO-inspired)
  infantry: P('M4 6l16 12M20 6L4 18M3 5h18v14H3z'),
  mechanized: (
    <>
      {P('M3 5h18v14H3zM4 6l16 12M20 6L4 18')}
      <ellipse cx="12" cy="12" rx="7" ry="4.2" />
    </>
  ),
  armored: (
    <>
      {P('M3 5h18v14H3z')}
      <ellipse cx="12" cy="12" rx="7" ry="4.2" />
    </>
  ),
  artillery: (
    <>
      {P('M3 5h18v14H3z')}
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  recon: P('M3 5h18v14H3zM4 18L20 6'),
  // operations
  recon_sweep: (
    <>
      {P('M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z')}
      {C(12, 12, 2.8)}
    </>
  ),
  artillery_prep: (
    <>
      {C(12, 12, 7)}
      {P('M12 2v4M12 18v4M2 12h4M18 12h4')}
    </>
  ),
  close_support: P('M3 14l9-8 9 8-4 .5L12 10l-5 4.5z M7 19h10'),
  emergency_resupply: (
    <>
      {P('M4 9h16v10H4zM4 9l2-4h12l2 4M12 9v10')}
    </>
  ),
  rapid_reinforcement: P('M4 12h10m0 0l-4-4m4 4l-4 4M17 5v14'),
  fortify_position: P('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'),
  // states / journal
  supply: P('M7 4h7l3 4v12H7zM10 8h4'),
  entrench: P('M4 16h4v-4h8v4h4M4 20h16'),
  objective: (
    <>
      {P('M12 3l7 9-7 9-7-9z')}
      {C(12, 12, 2)}
    </>
  ),
  threat: P('M12 3L2 20h20zM12 9v6M12 18v.5'),
  isolated: P('M8 12H4m16 0h-4M9 6L7 4m10 2l2-2M9 18l-2 2m10-2l2 2M12 9v6'),
  decision: P('M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6'),
  cooldown: (
    <>
      {C(12, 13, 7.5)}
      {P('M12 13V8M12 13l3.5 2M9 3h6')}
    </>
  ),
  trend: P('M3 19L9 12l4 3 7-8M14 7h6v6'),
  counters: P('M4 8h10v7H4zM8 5h12v7'),
};

export function Ico({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  const body = ICONS[name];
  if (!body) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      {body}
    </svg>
  );
}
