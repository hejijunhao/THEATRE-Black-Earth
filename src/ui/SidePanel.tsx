// Context panel: selected unit, selected tile/city, or a combat preview when
// an attack awaits confirmation.

import { TERRAIN_DEFS, UNIT_DEFS } from '../game/data/defs';
import { computePreview } from '../game/rules/combat';
import { supplyStateFromLevel } from '../game/rules/supply';
import { useStore } from '../game/state/store';
import { CombatVerdict, Unit } from '../game/types';
import { Tip } from './Tip';

const VERDICT_LABEL: Record<CombatVerdict, string> = {
  decisive: 'Decisive advantage',
  favourable: 'Favourable',
  even: 'Even engagement',
  risky: 'Risky',
  severe: 'Severe disadvantage',
};

function pct(v: number): string {
  return `${Math.round(v)}%`;
}

function condClass(v: number): string {
  return v > 65 ? 'good' : v > 35 ? 'warn' : 'bad';
}

function StatBar({ label, value, tip }: { label: string; value: number; tip: string }) {
  const cls = value > 65 ? 'fill-good' : value > 35 ? 'fill-warn' : 'fill-bad';
  return (
    <Tip title={label} text={tip} block>
      <div style={{ marginBottom: 7, width: '100%' }}>
        <div className="kv-line" style={{ padding: 0 }}>
          <span className="k">{label}</span>
          <span className="v">{pct(value)}</span>
        </div>
        <div className="bar"><span className={cls} style={{ width: `${Math.max(2, value)}%` }} /></div>
      </div>
    </Tip>
  );
}

function UnitDetails({ unit }: { unit: Unit }) {
  const game = useStore((s) => s.game)!;
  const def = UNIT_DEFS[unit.type];
  const tile = game.tiles[unit.tile];
  const supplyTip =
    unit.supply === 'isolated'
      ? 'No connection to a supply source. The formation will degrade each turn it remains cut off. Reopen a land corridor or use Emergency Resupply.'
      : unit.supply === 'low' || unit.supply === 'strained'
        ? 'The supply route to the nearest hub is long or constricted. Combat power and recovery are reduced. Check the Supply map mode to trace the route.'
        : 'Connected to the supply network. Full combat power and recovery.';

  return (
    <>
      <div className="unit-heading">
        <div>
          <div className="type">{def.label} · {unit.faction === 'UA' ? 'Ukraine' : 'Russia'}</div>
          <div className="name">{unit.name}</div>
        </div>
      </div>

      <div className="status-tags">
        <Tip title="Supply state" text={supplyTip}>
          <span className={`tag ${unit.supply === 'full' || unit.supply === 'supplied' ? 'good' : unit.supply === 'strained' ? 'warn' : 'bad'}`}>
            {unit.supply}
          </span>
        </Tip>
        {unit.entrenchment > 0 && (
          <Tip title="Entrenchment" text="Defensive preparation on this tile. Grows each stationary turn; lost on movement; reduced by artillery preparation and assaults.">
            <span className="tag">dug in {unit.entrenchment}</span>
          </Tip>
        )}
        {unit.reinforcing && (
          <Tip title="Reinforcing" text="Receiving replacements each turn. Slower near the front. Movement halved; cannot attack effectively.">
            <span className="tag good">reinforcing</span>
          </Tip>
        )}
        {unit.disorganized > 0 && (
          <Tip title="Disorganised" text="This formation recently retreated. Combat power and movement reduced until it recovers next turn.">
            <span className="tag warn">disorganised</span>
          </Tip>
        )}
        {unit.hasAttacked && <span className="tag">has attacked</span>}
        {unit.experience > 0 && (
          <Tip title="Experience" text="Combat experience grants a modest bonus to attack and defence.">
            <span className="tag good">{'★'.repeat(unit.experience)}</span>
          </Tip>
        )}
      </div>

      <StatBar label="Strength" value={unit.strength} tip="Remaining combat power of the formation. Restored by reinforcement; formations near zero risk destruction." />
      <StatBar label="Readiness" value={unit.readiness} tip="Ability to conduct operations. Drains with combat and low supply; recovers when resting in supply." />
      <StatBar label="Morale" value={unit.morale} tip="Willingness to fight. Low morale formations retreat easily. Recovers in supply; drops when isolated." />

      <div className="stat-grid">
        <div className="stat"><span className="k">Attack</span><span className="v">{def.attack}</span></div>
        <div className="stat"><span className="k">Defence</span><span className="v">{def.defense}</span></div>
        <div className="stat"><span className="k">Breakthrough</span><span className="v">{def.breakthrough}</span></div>
        <div className="stat"><span className="k">Support</span><span className="v">{def.support}</span></div>
        <div className="stat">
          <span className="k">Movement</span>
          <span className={`v ${unit.movement <= 0 ? 'bad' : ''}`}>{unit.movement.toFixed(1)}/{def.movement}</span>
        </div>
        <div className="stat"><span className="k">Terrain</span><span className="v">{TERRAIN_DEFS[tile.terrain].label}</span></div>
      </div>

      <p className="hint">
        {unit.movement > 0
          ? 'Click a highlighted tile to move. Click an adjacent enemy formation to preview an attack.'
          : 'No movement remaining this turn.'}
      </p>
    </>
  );
}

function TileDetails() {
  const game = useStore((s) => s.game)!;
  const tileId = useStore((s) => s.selectedTileId)!;
  const tile = game.tiles[tileId];
  if (!tile) return null;
  const terrain = TERRAIN_DEFS[tile.terrain];
  const city = tile.cityId ? game.cities[tile.cityId] : null;
  const supplyLevel = tile.controller ? game.supplyLevels[tile.controller][tileId] : undefined;
  const visible = game.visibleTiles.includes(tileId);

  return (
    <>
      <div className="unit-heading">
        <div>
          <div className="type">{terrain.label}{tile.road ? ' · road' : ''}{tile.rail ? ' · rail' : ''}</div>
          <div className="name">{city ? city.name : `Sector ${tileId}`}</div>
        </div>
      </div>

      {city && (
        <div className="status-tags">
          {city.vp > 0 && (
            <Tip title="Victory points" text="Holding this location contributes to campaign score every turn and shifts war support when it changes hands.">
              <span className="tag good">{city.vp} VP</span>
            </Tip>
          )}
          {city.supplyHub && (
            <Tip title="Supply hub" text="Extends the supply network. Reserves can deploy at supplied hub cities.">
              <span className="tag">supply hub</span>
            </Tip>
          )}
          {city.supplySource && (
            <Tip title="Supply source" text="A national entry point where supply originates. Losing it would cripple the surrounding network.">
              <span className="tag warn">supply source</span>
            </Tip>
          )}
          {city.decisiveFor && (
            <Tip title="Decisive objective" text={`Part of the decisive victory condition for ${city.decisiveFor === 'UA' ? 'Ukraine' : 'Russia'}.`}>
              <span className="tag warn">decisive · {city.decisiveFor}</span>
            </Tip>
          )}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat">
          <span className="k">Controller</span>
          <span className="v">{tile.controller ?? '—'}</span>
        </div>
        <div className="stat">
          <span className="k">Move cost</span>
          <span className="v">{tile.road || tile.rail ? 1 : terrain.moveCost}</span>
        </div>
        <div className="stat">
          <span className="k">Defence</span>
          <span className="v">×{terrain.defense.toFixed(1)}{tile.fortified ? ' +fort' : ''}</span>
        </div>
        <div className="stat">
          <span className="k">Supply</span>
          <span className="v">{tile.controller ? supplyStateFromLevel(supplyLevel) : '—'}</span>
        </div>
      </div>

      {!visible && <p className="hint">Limited observation of this sector. Enemy dispositions may be out of date.</p>}
      {tile.fortified && <p className="hint">Fortified positions here grant an additional defensive bonus while held.</p>}
    </>
  );
}

function AttackPreview() {
  const game = useStore((s) => s.game)!;
  const attackerId = useStore((s) => s.selectedUnitId)!;
  const defenderId = useStore((s) => s.pendingAttackId)!;
  const orderAttack = useStore((s) => s.orderAttack);
  const setPendingAttack = useStore((s) => s.setPendingAttack);

  const attacker = game.units[attackerId];
  const defender = game.units[defenderId];
  if (!attacker || !defender) return null;

  const preview = computePreview(game, attacker, defender);
  const observed = game.visibleTiles.includes(defender.tile);
  const isArtillery = UNIT_DEFS[attacker.type].support > 0;

  return (
    <>
      <div className="unit-heading">
        <div>
          <div className="type">{isArtillery ? 'Bombardment' : 'Assault'} preview</div>
          <div className="name">{attacker.name} → {defender.name}</div>
        </div>
      </div>

      {!isArtillery && (
        <Tip
          title="Expected result"
          text="A qualitative estimate from relative combat power. A small random swing applies at resolution — decisions dominate, not dice."
          block
        >
          <div className={`verdict ${preview.verdict}`}>{VERDICT_LABEL[preview.verdict]}</div>
        </Tip>
      )}
      {isArtillery && (
        <div className="verdict even">Fires mission</div>
      )}

      <div className="kv-line">
        <span className="k">Attack power</span>
        <span className="v">{preview.attackPower.toFixed(1)}</span>
      </div>
      <div className="kv-line">
        <span className="k">Defence power</span>
        <span className="v">{observed ? preview.defensePower.toFixed(1) : `~${preview.defensePower.toFixed(0)} (est.)`}</span>
      </div>
      {!observed && (
        <p className="hint">The defender is not fully observed — estimates may be wrong. A Reconnaissance Sweep would sharpen this preview.</p>
      )}

      <hr className="divider" />
      {preview.factors.slice(0, 9).map((f, i) => (
        <div className="factor-line" key={i}>
          <span className="fk">{f.label}</span>
          <span className={`fv ${f.value >= 0 ? 'pos' : 'neg'}`}>
            {f.value >= 0 ? '+' : ''}{Math.round(f.value * 100)}%
          </span>
        </div>
      ))}

      <div className="btn-row">
        <button className="btn danger" onClick={() => orderAttack(defenderId)}>
          {isArtillery ? 'Execute bombardment' : 'Execute attack'}
        </button>
        <button className="btn" onClick={() => setPendingAttack(null)}>Cancel</button>
      </div>
      {isArtillery && (
        <p className="hint">Bombardment degrades strength, readiness and entrenchment but does not capture ground.</p>
      )}
    </>
  );
}

export function SidePanel() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const selectedTileId = useStore((s) => s.selectedTileId);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const interactionMode = useStore((s) => s.interactionMode);
  const pendingOp = useStore((s) => s.pendingOp);
  const cancelInteraction = useStore((s) => s.cancelInteraction);

  if (!game) return null;

  let content: JSX.Element | null = null;
  let title = 'Theatre';

  if (interactionMode === 'op-target' && pendingOp) {
    title = 'Operation';
    content = (
      <>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>
          Select a target on the map for the operation.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={cancelInteraction}>Cancel</button>
        </div>
      </>
    );
  } else if (interactionMode === 'deploy') {
    title = 'Deploy reserve';
    content = (
      <>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>
          Select a highlighted supplied hub city to deploy the reserve formation. Deployment costs 15 manpower and 10 equipment.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={cancelInteraction}>Cancel</button>
        </div>
      </>
    );
  } else if (pendingAttackId && selectedUnitId) {
    title = 'Combat';
    content = <AttackPreview />;
  } else if (selectedUnitId && game.units[selectedUnitId]) {
    title = 'Formation';
    content = <UnitDetails unit={game.units[selectedUnitId]} />;
  } else if (selectedTileId) {
    title = 'Sector';
    content = <TileDetails />;
  } else {
    return null;
  }

  return (
    <div className="side-panel panel">
      <div className="panel-title">
        {title}
        <span className="sub">{game.scenario.dateLabel}</span>
      </div>
      <div className="body">{content}</div>
    </div>
  );
}
