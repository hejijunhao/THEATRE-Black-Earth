// Shared combat chrome: strength strips, verdict copy, estimate/AAR language.
// Slice 6: no die faces. Odds, strength delta, and one-line verdict only.
// Decorative ASSAULT / DISPATCH / FIRES marks live on a thin stamp strip —
// classification type, not a rotated rubber badge.

import { CombatVerdict } from '../game/types';

export type PaperStamp = 'Assault' | 'Dispatch' | 'Fires';

export const PAPER_STAMPS: readonly PaperStamp[] = ['Assault', 'Dispatch', 'Fires'];

/** Classification rail only. Not a second ledger and not a rubber badge. */
export interface StampStrip {
  mark: PaperStamp;
  kicker: string;
  chrome: 'strip';
}

export function paperStamp(kind: 'assault' | 'dispatch' | 'fires'): PaperStamp {
  if (kind === 'fires') return 'Fires';
  if (kind === 'dispatch') return 'Dispatch';
  return 'Assault';
}

export function stampStrip(mark: PaperStamp, kicker: string): StampStrip {
  return { mark, kicker, chrome: 'strip' };
}

export function stampStripIsSubtractive(strip: StampStrip): boolean {
  return (
    strip.chrome === 'strip'
    && (PAPER_STAMPS as readonly string[]).includes(strip.mark)
    && !/ledger|2d6|die face|rubber/i.test(`${strip.mark} ${strip.kicker}`)
  );
}

/** Old corner badge: rotation + box + fill. The strip never uses it. */
export function stampIsBoxedRubber(): boolean {
  return false;
}

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
