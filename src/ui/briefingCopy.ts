// Staff-estimate copy. Pure read of CombatFactor — no rules.
// Ranked named reasons, never a percentage dump.

import { CombatFactor } from '../game/types';

export function rankReasons(factors: CombatFactor[]): CombatFactor[] {
  return [...factors]
    .filter((f) => Math.abs(f.value) >= 0.04)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 5);
}

/** Visual weight 0–1 for the rank tick. Not shown as a percentage. */
export function reasonWeight(f: CombatFactor): number {
  return Math.min(1, Math.abs(f.value) / 0.4);
}

export function reasonCopy(f: CombatFactor): string {
  const hurts = f.value < 0;
  if (/terrain|vs /i.test(f.label)) return hurts ? `${f.label} — the ground is against you` : `${f.label} — the ground helps`;
  if (/entrench/i.test(f.label)) return 'They are dug in';
  if (/supply/i.test(f.label)) return hurts ? `${f.label} — the corridor is thin` : f.label;
  if (/weather/i.test(f.label)) return `${f.label} — the month blunts the attack`;
  if (/support|artillery/i.test(f.label)) return 'Fires are on the estimate';
  if (/river|crossing/i.test(f.label)) return 'A wet bank — the assault pays';
  if (/concentric/i.test(f.label)) return 'Pressure from more than one hex';
  if (/condition/i.test(f.label)) return hurts ? `${f.label} — tired` : f.label;
  if (/fortif/i.test(f.label)) return 'Fortified works';
  if (/veteran/i.test(f.label)) return f.label;
  if (/settlement/i.test(f.label)) return 'A settlement favours the holder';
  if (/disorganis/i.test(f.label)) return 'Still shaking out from the last exchange';
  if (/breakthrough/i.test(f.label)) return 'Breakthrough chips the works';
  return f.label;
}
