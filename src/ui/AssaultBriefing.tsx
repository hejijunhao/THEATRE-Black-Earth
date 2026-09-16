// Staff estimate on the map — half-sheet paper, theatre stays dimmed-alive.
// Strength strips before the roll. ≤5 named reasons, not a % dump.

import { UNIT_DEFS } from '../game/data/defs';
import { computePreview } from '../game/rules/combat';
import { useStore } from '../game/state/store';
import { CombatFactor } from '../game/types';
import { StrengthStrip, VERDICT_LABEL } from './combatChrome';
import { LEXICON } from './lexicon';
import { Tip } from './Tip';

function rankReasons(factors: CombatFactor[]): CombatFactor[] {
  return [...factors]
    .filter((f) => Math.abs(f.value) >= 0.04)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 5);
}

function reasonCopy(f: CombatFactor): string {
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
  return f.label;
}

export function AssaultBriefing() {
  const game = useStore((s) => s.game);
  const attackerId = useStore((s) => s.selectedUnitId);
  const defenderId = useStore((s) => s.pendingAttackId);
  const lastCombat = useStore((s) => s.lastCombat);
  const orderAttack = useStore((s) => s.orderAttack);
  const setPendingAttack = useStore((s) => s.setPendingAttack);

  if (!game || game.phase !== 'player' || lastCombat) return null;
  if (!attackerId || !defenderId) return null;

  const attacker = game.units[attackerId];
  const defender = game.units[defenderId];
  if (!attacker || !defender) return null;

  const preview = computePreview(game, attacker, defender);
  const observed = game.visibleTiles.includes(defender.tile);
  const isArtillery = UNIT_DEFS[attacker.type].support > 0;
  const defPower = observed
    ? preview.defensePower.toFixed(1)
    : `~${preview.defensePower.toFixed(0)}`;
  const reasons = rankReasons(preview.factors);
  const defTile = game.tiles[defender.tile];

  return (
    <div className="brief-over" onClick={() => setPendingAttack(null)}>
      <div
        className="panel panel-framed aar assault-brief dispatch brief-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="brief-title"
      >
        <div className="stamp">{isArtillery ? 'Fires' : 'Assault'}</div>
        <div className="aar-head">
          <div className="aar-kicker">Staff estimate · week {game.turn}</div>
          <h2 className="aar-headline" id="brief-title">
            {isArtillery ? 'Fires mission' : VERDICT_LABEL[preview.verdict]}
          </h2>
          <p className="aar-detail">
            {isArtillery
              ? 'The battery will roll 2d6 for effect. Bombardment degrades the position; it does not take the hex.'
              : 'Odds from relative combat power, before dice. Confirm to roll 2d6 each. A 7 is average.'}
          </p>
        </div>
        <div className="body">
          <div className="aar-matchup">
            <div className="aar-side">
              <div className="type">Attacker</div>
              <div className="name">{attacker.name}</div>
              <div className="pd-pow">atk {preview.attackPower.toFixed(1)}</div>
              {!isArtillery && (
                <StrengthStrip
                  before={attacker.strength}
                  after={Math.max(0, attacker.strength - preview.expectedAttackerLoss)}
                />
              )}
            </div>
            <div className="aar-odds">
              <div className="pd-ratio">{preview.oddsLabel}</div>
              <div className="pd-vs">odds</div>
            </div>
            <div className="aar-side right">
              <div className="type">Defender</div>
              <div className="name">{defender.name}</div>
              <div className="pd-pow">def {defPower}</div>
              <StrengthStrip
                before={defender.strength}
                after={Math.max(0, defender.strength - preview.expectedDefenderLoss)}
                align="right"
              />
            </div>
          </div>

          <div className="brief-chips">
            <span className="brief-chip">{defTile ? `${defTile.terrain}` : 'hex'}</span>
            {defender.entrenchment > 0 && <span className="brief-chip">dug in {defender.entrenchment}</span>}
            <span className={`brief-chip ${defender.supply}`}>{defender.supply}</span>
            {attacker.supply !== 'full' && attacker.supply !== 'supplied' && (
              <span className={`brief-chip ${attacker.supply}`}>our {attacker.supply}</span>
            )}
          </div>

          {!isArtillery && (
            <Tip
              lexicon
              title={LEXICON.odds.title}
              text={LEXICON.odds.doctrine}
              now={`${preview.oddsLabel} — they lose the first number, you lose the second.`}
              block
            >
              <div className="preview-bill brief-bill">
                <div className="kv-line">
                  <span className="k">Est. losses (before dice)</span>
                  <span className="v">
                    −{Math.round(preview.expectedDefenderLoss)} / −{Math.round(preview.expectedAttackerLoss)} str
                  </span>
                </div>
              </div>
            </Tip>
          )}

          {!observed && (
            <p className="hint">
              The defender is not fully observed — estimates may be wrong. A Reconnaissance Sweep would sharpen this briefing.
            </p>
          )}

          {reasons.length > 0 && (
            <div className="factor-ledger named">
              {reasons.map((f, i) => (
                <div className={`factor-line ${f.value < 0 ? 'hurts' : 'helps'}`} key={i}>
                  <span className="fk">{reasonCopy(f)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="btn-row aar-actions">
            <button className="btn danger plate-commit" onClick={() => orderAttack(defenderId)}>
              {isArtillery ? 'Commit the fires' : 'Commit the roll'}
            </button>
            <button className="btn plate-commit" onClick={() => setPendingAttack(null)}>Withdraw · Esc</button>
          </div>
        </div>
      </div>
    </div>
  );
}
