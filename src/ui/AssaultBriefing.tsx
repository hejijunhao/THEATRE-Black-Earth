// Assault / fires briefing: a centered staff paper shown *before* the roll.
// Same math as the old dock preview (computePreview). Confirm commits;
// Esc / Withdraw cancels. The 320px side panel yields the stage.

import { UNIT_DEFS } from '../game/data/defs';
import { computePreview } from '../game/rules/combat';
import { useStore } from '../game/state/store';
import { VERDICT_LABEL } from './combatChrome';
import { LEXICON } from './lexicon';
import { Tip } from './Tip';

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

  return (
    <div className="modal-backdrop aar-backdrop" onClick={() => setPendingAttack(null)}>
      <div
        className="modal panel panel-framed aar assault-brief dispatch"
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
              : 'Odds from relative combat power, before dice. Confirm to roll 2d6 each — attack roll scales damage given, defence roll scales damage taken. A 7 is average.'}
          </p>
        </div>
        <div className="body">
          <div className="aar-matchup">
            <div className="aar-side">
              <div className="type">Attacker</div>
              <div className="name">{attacker.name}</div>
              <div className="pd-pow">atk {preview.attackPower.toFixed(1)}</div>
            </div>
            <div className="aar-odds">
              <div className="pd-ratio">{preview.oddsLabel}</div>
              <div className="pd-vs">odds</div>
            </div>
            <div className="aar-side right">
              <div className="type">Defender</div>
              <div className="name">{defender.name}</div>
              <div className="pd-pow">def {defPower}</div>
            </div>
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

          <div className="factor-ledger">
            {preview.factors.slice(0, 10).map((f, i) => (
              <div className="factor-line" key={i}>
                <span className="fk">{f.label}</span>
                <span className={`fv ${f.value >= 0 ? 'pos' : 'neg'}`}>
                  {f.value >= 0 ? '+' : ''}{Math.round(f.value * 100)}%
                </span>
              </div>
            ))}
          </div>

          <div className="btn-row aar-actions">
            <button className="btn danger" onClick={() => orderAttack(defenderId)}>
              {isArtillery ? 'Commit the fires' : 'Commit the roll'}
            </button>
            <button className="btn" onClick={() => setPendingAttack(null)}>Withdraw · Esc</button>
          </div>
        </div>
      </div>
    </div>
  );
}
