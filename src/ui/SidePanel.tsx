// Context panel: selected unit or selected tile/city.
// Assault preview lives on the centered briefing card.

import { TERRAIN_DEFS, UNIT_DEFS } from '../game/data/defs';
import { supplyStateFromLevel } from '../game/rules/supply';
import { useStore } from '../game/state/store';
import { Unit } from '../game/types';
import { LEXICON, LexiconId, moraleNow, movementNow, readinessNow, strengthNow, supplyNow } from './lexicon';
import { MiniViewport } from './MiniViewport';
import { LexiconTip, Tip } from './Tip';

function pct(v: number): string {
  return `${Math.round(v)}%`;
}

function condClass(v: number): string {
  return v > 65 ? 'good' : v > 35 ? 'warn' : 'bad';
}

function StatBar({ label, value, doctrine, now }: { label: string; value: number; doctrine: string; now: string }) {
  const cls = value > 65 ? 'fill-good' : value > 35 ? 'fill-warn' : 'fill-bad';
  return (
    <Tip title={label} text={doctrine} now={now} block lexicon>
      <div style={{ marginBottom: 7, width: '100%' }}>
        <div className="kv-line" style={{ padding: 0 }}>
          <span className="k">{label}</span>
          <span className={`v ${condClass(value)}`}>{pct(value)}</span>
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
  const showViewport = unit.faction === game.playerFaction;

  return (
    <>
      <div className="unit-heading">
        <div>
          <div className="type">{def.label} · {unit.faction === 'UA' ? 'Ukraine' : 'Russia'}</div>
          <div className="name">{unit.name}</div>
        </div>
      </div>

      {showViewport && <MiniViewport unit={unit} fortified={tile.fortified} />}

      <div className="status-tags">
        <LexiconTip id="supply" now={supplyNow(unit.supply).copy}>
          <span className={`tag ${unit.supply === 'full' || unit.supply === 'supplied' ? 'good' : unit.supply === 'strained' ? 'warn' : 'bad'}`}>
            {unit.supply}
          </span>
        </LexiconTip>
        {unit.entrenchment > 0 && (
          <LexiconTip id="entrench" now={`Dug in ${unit.entrenchment} on this hex.`}>
            <span className="tag">dug in {unit.entrenchment}</span>
          </LexiconTip>
        )}
        {unit.reinforcing && (
          <LexiconTip id="reinforce" now="Replacements are flowing. Movement is halved.">
            <span className="tag good">reinforcing</span>
          </LexiconTip>
        )}
        {unit.disorganized > 0 && (
          <Tip lexicon title="Disorganised" text="This formation recently retreated. Combat power and movement reduced until it recovers next week." now="Still shaking out from the last exchange.">
            <span className="tag warn">disorganised</span>
          </Tip>
        )}
        {unit.hasAttacked && <span className="tag">has attacked</span>}
        {unit.experience > 0 && (
          <Tip lexicon title="Experience" text="Combat experience grants a modest bonus to attack and defence." now={`${unit.experience} chevron${unit.experience > 1 ? 's' : ''} on the standard.`}>
            <span className="tag good">{'★'.repeat(unit.experience)}</span>
          </Tip>
        )}
      </div>

      <StatBar label="Strength" value={unit.strength} doctrine={LEXICON.strength.doctrine} now={strengthNow(unit.strength).copy} />
      <StatBar label="Readiness" value={unit.readiness} doctrine={LEXICON.readiness.doctrine} now={readinessNow(unit.readiness).copy} />
      <StatBar label="Morale" value={unit.morale} doctrine={LEXICON.morale.doctrine} now={moraleNow(unit.morale).copy} />

      <div className="stat-grid">
        <LexiconTip id="attack" now={`Printed attack ${def.attack} for this type.`}>
          <div className="stat"><span className="k">Attack</span><span className="v">{def.attack}</span></div>
        </LexiconTip>
        <LexiconTip id="defence" now={`Printed defence ${def.defense} for this type.`}>
          <div className="stat"><span className="k">Defence</span><span className="v">{def.defense}</span></div>
        </LexiconTip>
        <LexiconTip id="breakthrough" now={`Breakthrough ${def.breakthrough} — ${def.breakthrough >= 7 ? 'built to take the hex' : 'holds more than it punches'}.`}>
          <div className="stat"><span className="k">Breakthrough</span><span className="v">{def.breakthrough}</span></div>
        </LexiconTip>
        <LexiconTip id="support" now={def.support > 0 ? `Fires ${def.support} — this plate degrades, it does not take.` : 'No fires weight. This formation must close.'}>
          <div className="stat"><span className="k">Support</span><span className="v">{def.support}</span></div>
        </LexiconTip>
        <LexiconTip id="movement" now={movementNow(unit.movement, def.movement).copy}>
          <div className="stat">
            <span className="k">Movement</span>
            <span className={`v ${unit.movement <= 0 ? 'bad' : ''}`}>{unit.movement.toFixed(1)}/{def.movement}</span>
          </div>
        </LexiconTip>
        <LexiconTip
          id="terrain"
          now={`${TERRAIN_DEFS[tile.terrain].label}${tile.road ? ' · road' : ''} — defence ×${TERRAIN_DEFS[tile.terrain].defense.toFixed(1)}.`}
        >
          <div className="stat"><span className="k">Terrain</span><span className="v">{TERRAIN_DEFS[tile.terrain].label}</span></div>
        </LexiconTip>
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
          <LexiconTip id="terrain" now={`${terrain.label} — move ${tile.road || tile.rail ? 1 : terrain.moveCost}, defence ×${terrain.defense.toFixed(1)}.`}>
            <div className="type">{terrain.label}{tile.road ? ' · road' : ''}{tile.rail ? ' · rail' : ''}</div>
          </LexiconTip>
          <div className="name">{city ? city.name : `Sector ${tileId}`}</div>
        </div>
      </div>

      {city && (
        <div className="status-tags">
          {city.vp > 0 && (
            <LexiconTip id="cities" now={`${city.vp} VP on this hex. Taking it moves the clock.`}>
              <span className="tag good">{city.vp} VP</span>
            </LexiconTip>
          )}
          {city.supplyHub && (
            <LexiconTip id="supply" now="A hub on the corridor. Reserves deploy here when the hex is supplied.">
              <span className="tag">supply hub</span>
            </LexiconTip>
          )}
          {city.supplySource && (
            <LexiconTip id="supply" now="A national source. Losing it starves the surrounding network.">
              <span className="tag warn">supply source</span>
            </LexiconTip>
          )}
          {city.decisiveFor && (
            <LexiconTip
              id="cities"
              now={`Decisive for ${city.decisiveFor === 'UA' ? 'Ukraine' : 'Russia'} — hold the set and the short war ends.`}
            >
              <span className="tag warn">decisive · {city.decisiveFor}</span>
            </LexiconTip>
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

function EncyclopediaLedger({ id }: { id: LexiconId }) {
  const pinLexicon = useStore((s) => s.pinLexicon);
  const entry = LEXICON[id];
  return (
    <div className="lex-ledger">
      <div className="lex-kicker">Encyclopedia</div>
      <div className="lex-title">{entry.title}</div>
      <p className="lex-doctrine">{entry.doctrine}</p>
      <button type="button" className="lex-unpin" onClick={() => pinLexicon(null)}>
        Unpin · E
      </button>
    </div>
  );
}

export function SidePanel() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const selectedTileId = useStore((s) => s.selectedTileId);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const interactionMode = useStore((s) => s.interactionMode);
  const pendingOp = useStore((s) => s.pendingOp);
  const lastCombat = useStore((s) => s.lastCombat);
  const pinnedLexiconId = useStore((s) => s.pinnedLexiconId);
  const cancelInteraction = useStore((s) => s.cancelInteraction);

  if (!game) return null;
  const pinned = pinnedLexiconId && pinnedLexiconId in LEXICON
    ? (pinnedLexiconId as LexiconId)
    : null;
  const paperUp = Boolean((lastCombat || pendingAttackId) && game.phase === 'player');
  if (paperUp && !pinned) return null;

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
  } else if (paperUp && pinned) {
    title = 'Encyclopedia';
    content = <EncyclopediaLedger id={pinned} />;
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
  } else if (selectedUnitId && game.units[selectedUnitId]) {
    title = 'Formation';
    content = <UnitDetails unit={game.units[selectedUnitId]} />;
  } else if (selectedTileId) {
    title = 'Sector';
    content = <TileDetails />;
  } else if (pinned) {
    title = 'Encyclopedia';
  } else {
    return null;
  }

  return (
    <div className="side-panel panel panel-framed">
      <div className="panel-title">
        {title}
        <span className="sub">{game.scenario.dateLabel}</span>
      </div>
      <div className="body">
        {pinned && !paperUp && <EncyclopediaLedger id={pinned} />}
        {content}
      </div>
    </div>
  );
}
