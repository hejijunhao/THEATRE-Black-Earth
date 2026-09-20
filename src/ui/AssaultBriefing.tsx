// Staff estimate on the map — same paper family as the after-action.
// Strength strips are the one loss language. Wash, not curtain.

import { TERRAIN_DEFS, UNIT_DEFS } from '../game/data/defs';
import { computePreview } from '../game/rules/combat';
import { useStore } from '../game/state/store';
import { rankReasons, reasonCopy, reasonWeight } from './briefingCopy';
import { CombatPaper } from './CombatPaper';
import { estimateDetail, paperStamp, StrengthStrip, strengthNowLine, VERDICT_LABEL } from './combatChrome';
import { LexiconTip } from './Tip';

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
  const terrain = defTile ? TERRAIN_DEFS[defTile.terrain] : null;
  const atkAfter = Math.max(0, attacker.strength - preview.expectedAttackerLoss);
  const defAfter = Math.max(0, defender.strength - preview.expectedDefenderLoss);

  return (
    <CombatPaper
      tile={defender.tile}
      stamp={paperStamp(isArtillery ? 'fires' : 'assault')}
      kicker={`Staff estimate · week ${game.turn}`}
      headline={isArtillery ? 'Fires mission' : VERDICT_LABEL[preview.verdict]}
      detail={estimateDetail(isArtillery)}
      titleId="brief-title"
    >
      <div className="aar-matchup">
        <div className="aar-side">
          <div className="type">Attacker</div>
          <div className="name">{attacker.name}</div>
          <div className="pd-pow">atk {preview.attackPower.toFixed(1)}</div>
          {!isArtillery && (
            <LexiconTip
              id="strength"
              now={strengthNowLine(attacker.strength, atkAfter, 'estimate')}
              block
            >
              <StrengthStrip before={attacker.strength} after={atkAfter} />
            </LexiconTip>
          )}
        </div>
        <div className="aar-odds">
          <LexiconTip
            id="odds"
            now={`${preview.oddsLabel} — they lose the first number, you lose the second.`}
            block
          >
            <div className="pd-ratio">{preview.oddsLabel}</div>
            <div className="pd-vs">odds</div>
          </LexiconTip>
        </div>
        <div className="aar-side right">
          <div className="type">Defender</div>
          <div className="name">{defender.name}</div>
          <div className="pd-pow">def {defPower}</div>
          <LexiconTip
            id="strength"
            now={strengthNowLine(defender.strength, defAfter, 'estimate')}
            block
          >
            <StrengthStrip
              before={defender.strength}
              after={defAfter}
              align="right"
            />
          </LexiconTip>
        </div>
      </div>

      <div className="brief-chips">
        {terrain && (
          <LexiconTip
            id="terrain"
            now={`${terrain.label} — defence ×${terrain.defense.toFixed(1)}${defTile?.road ? ' · road' : ''}.`}
          >
            <span className="brief-chip">{terrain.label}{defTile?.road ? ' · road' : ''}</span>
          </LexiconTip>
        )}
        {defender.entrenchment > 0 && (
          <LexiconTip id="entrench" now={`Dug in ${defender.entrenchment} on this hex.`}>
            <span className="brief-chip">dug in {defender.entrenchment}</span>
          </LexiconTip>
        )}
        <LexiconTip id="supply" now={`Defender ${defender.supply}.`}>
          <span className={`brief-chip ${defender.supply}`}>{defender.supply}</span>
        </LexiconTip>
        {attacker.supply !== 'full' && attacker.supply !== 'supplied' && (
          <LexiconTip id="supply" now={`Attacker ${attacker.supply}.`}>
            <span className={`brief-chip ${attacker.supply}`}>our {attacker.supply}</span>
          </LexiconTip>
        )}
      </div>

      {!observed && (
        <p className="hint">
          The defender is not fully observed — estimates may be wrong. A Reconnaissance Sweep would sharpen this briefing.
        </p>
      )}

      {reasons.length > 0 && (
        <div className="factor-ledger named">
          <div className="factor-kicker">Why this estimate</div>
          {reasons.map((f, i) => (
            <div className={`factor-line ${f.value < 0 ? 'hurts' : 'helps'}`} key={i}>
              <span className="fk-rank">{i + 1}</span>
              <span className="fk">{reasonCopy(f)}</span>
              <span className={`fk-tick ${f.value < 0 ? 'hurts' : 'helps'}`} aria-hidden>
                <i style={{ width: `${Math.max(12, Math.round(reasonWeight(f) * 100))}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="btn-row aar-actions brief-plates">
        <button
          type="button"
          className="bench-plate contact plate-commit"
          onClick={() => orderAttack(defenderId)}
        >
          <span className="plate-engrave">{isArtillery ? 'Fires' : 'Commit'}</span>
          <span className="plate-value">{preview.oddsLabel}</span>
          <span className="plate-line">{isArtillery ? 'the mission' : 'the assault'}</span>
        </button>
        <button
          type="button"
          className="bench-plate plate-commit"
          onClick={() => setPendingAttack(null)}
        >
          <span className="plate-engrave">Withdraw</span>
          <span className="plate-value">Esc</span>
          <span className="plate-line">stand down</span>
        </button>
      </div>
    </CombatPaper>
  );
}
