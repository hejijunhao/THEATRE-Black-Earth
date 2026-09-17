// Shared combat chrome: strength strips, verdict copy, estimate/AAR language.
// Slice 6: no die faces. Odds, strength delta, and one-line verdict only.

import { CombatVerdict } from '../game/types';

export const VERDICT_LABEL: Record<CombatVerdict, string> = {
  decisive: 'Decisive advantage',
  favourable: 'Favourable',
  even: 'Even engagement',
  risky: 'Risky',
  severe: 'Severe disadvantage',
};

const DICE_TALK = /2d6|dice|die face|d6/i;

export function estimateDetail(isArtillery: boolean): string {
  return isArtillery
    ? 'The battery will degrade the position; it does not take the hex.'
    : 'Odds from relative combat power. Confirm to commit the assault.';
}

export function strengthNowLine(before: number, after: number, kind: 'estimate' | 'result'): string {
  const arrow = `${Math.round(before)} → ${Math.round(after)}`;
  return kind === 'estimate' ? `${arrow} — staff estimate.` : `${arrow} — strength after the exchange.`;
}

export function aarOddsCaption(): string {
  return 'staff odds';
}

export function aarVerdictShift(
  preview: CombatVerdict,
  resolved: CombatVerdict,
): string | null {
  if (preview === resolved) return null;
  return `Staff estimate was ${VERDICT_LABEL[preview].toLowerCase()}; the exchange was ${VERDICT_LABEL[resolved].toLowerCase()}.`;
}

export function paperCopyIsNumeric(text: string): boolean {
  return !DICE_TALK.test(text);
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
