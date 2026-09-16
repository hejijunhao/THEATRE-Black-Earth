// Bottom command bar: unit orders, strategic operations, reserves, end turn.
// Map modes live in their own cluster bottom-left.

import { useState } from 'react';
import { OPERATION_DEFS, UNIT_DEFS } from '../game/data/defs';
import { canUseOperation } from '../game/rules/ops';
import { MapMode, useStore } from '../game/state/store';
import { OperationId } from '../game/types';
import { Ico } from './icons';
import { Tip } from './Tip';

const MAP_MODES: Array<{ id: MapMode; label: string; tip: string }> = [
  { id: 'political', label: 'Political', tip: 'Territorial control and the frontline.' },
  { id: 'supply', label: 'Supply', tip: 'Your supply network: bright green is well supplied, red is isolated. Trace a unit\'s route back to a hub to see why it is starved.' },
  { id: 'terrain', label: 'Terrain', tip: 'Pure terrain view without political tint.' },
  { id: 'objectives', label: 'Objectives', tip: 'Victory-point locations. Gold diamonds are decisive objectives for your side.' },
  { id: 'intel', label: 'Intelligence', tip: 'Observed sectors are bright; dark areas rely on stale or absent intelligence.' },
];

export function MapModes() {
  const mapMode = useStore((s) => s.mapMode);
  const setMapMode = useStore((s) => s.setMapMode);
  return (
    <div className="map-modes">
      {MAP_MODES.map((m) => (
        <Tip key={m.id} title={m.label} text={m.tip}>
          <button
            className={`map-mode-btn ${mapMode === m.id ? 'active' : ''}`}
            onClick={() => setMapMode(m.id)}
          >
            {m.label}
          </button>
        </Tip>
      ))}
    </div>
  );
}

const OP_ORDER: OperationId[] = [
  'recon_sweep',
  'artillery_prep',
  'close_support',
  'emergency_resupply',
  'rapid_reinforcement',
  'fortify_position',
];

export function CommandBar() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const toggleReinforce = useStore((s) => s.toggleReinforce);
  const orderEntrench = useStore((s) => s.orderEntrench);
  const beginOperation = useStore((s) => s.beginOperation);
  const beginDeploy = useStore((s) => s.beginDeploy);
  const requestEndTurn = useStore((s) => s.requestEndTurn);
  const pendingOp = useStore((s) => s.pendingOp);
  const [showOps, setShowOps] = useState(false);
  const [showReserves, setShowReserves] = useState(false);

  if (!game || game.phase !== 'player') return null;

  const unit = selectedUnitId ? game.units[selectedUnitId] : null;
  const faction = game.factions[game.playerFaction];

  return (
    <>
      <div className="command-bar panel">
        <div className="group">
          <Tip
            title="Reinforce"
            text="Order the selected formation to absorb replacements. Consumes manpower and equipment each turn; works best in supply and away from the front."
          >
            <button
              className={`cmd-btn ${unit?.reinforcing ? 'active' : ''}`}
              disabled={!unit || unit.strength >= 98}
              onClick={toggleReinforce}
            >
              <span className="ico"><Ico name="reinforce" size={16} /></span>
              Reinforce
            </button>
          </Tip>
          <Tip
            title="Entrench"
            text="Spend the formation's remaining movement to dig in immediately (+1 entrenchment). Entrenchment also grows passively for stationary units."
          >
            <button
              className="cmd-btn"
              disabled={!unit || unit.movement <= 0}
              onClick={orderEntrench}
            >
              <span className="ico"><Ico name="entrench" size={16} /></span>
              Entrench
            </button>
          </Tip>
        </div>

        <div className="group">
          <Tip
            title="Strategic operations"
            text="Limited theatre capabilities paid with command points: reconnaissance, fires, air support, resupply and engineering."
          >
            <button
              className={`cmd-btn ${showOps || pendingOp ? 'active' : ''}`}
              onClick={() => { setShowOps(!showOps); setShowReserves(false); }}
            >
              <span className="ico"><Ico name="operations" size={16} /></span>
              Operations
            </button>
          </Tip>
          <Tip
            title="Reserves"
            text="Uncommitted formations. Deploy them at supplied hub cities — filling a gap now may cost you the counterattack later."
          >
            <button
              className={`cmd-btn ${showReserves ? 'active' : ''}`}
              onClick={() => { setShowReserves(!showReserves); setShowOps(false); }}
            >
              <span className="ico"><Ico name="reserves" size={16} /></span>
              Reserves ({faction.reserves.length})
            </button>
          </Tip>
        </div>

        <div className="group">
          <Tip title="End turn" text="Commit your orders and hand the initiative to the enemy. You will be warned about idle formations and unresolved decisions.">
            <button className="end-turn-btn" onClick={requestEndTurn}>
              End Turn
            </button>
          </Tip>
        </div>
      </div>

      {showOps && (
        <div
          className="panel panel-framed"
          style={{ position: 'absolute', bottom: 118, left: '50%', transform: 'translateX(-50%)', width: 460, zIndex: 25 }}
        >
          <div className="panel-title">
            Strategic Operations
            <span className="sub">CMD {faction.command}/{faction.commandMax}</span>
          </div>
          <div style={{ padding: 10 }}>
            {OP_ORDER.map((opId) => {
              const def = OPERATION_DEFS[opId];
              const check = canUseOperation(game, game.playerFaction, opId);
              return (
                <Tip key={opId} title={def.name} text={def.description} block>
                  <button
                    className="option-btn op-row"
                    disabled={!check.ok}
                    style={!check.ok ? { opacity: 0.45 } : undefined}
                    onClick={() => {
                      beginOperation(opId);
                      setShowOps(false);
                    }}
                  >
                    <span className="op-ico"><Ico name={opId} size={16} /></span>
                    <span className="op-copy">
                      <span className="label">{def.name}</span>
                      <span className="desc">
                        {def.cost[game.playerFaction]} CMD · cooldown {def.cooldown}t
                        {!check.ok && check.reason ? ` — ${check.reason}` : ''}
                      </span>
                    </span>
                  </button>
                </Tip>
              );
            })}
          </div>
        </div>
      )}

      {showReserves && (
        <div
          className="panel"
          style={{ position: 'absolute', bottom: 118, left: '50%', transform: 'translateX(-50%)', width: 380, zIndex: 25 }}
        >
          <div className="panel-title">Reserve Formations</div>
          <div style={{ padding: 10 }}>
            {faction.reserves.length === 0 && (
              <p className="hint">No reserves available. Events may provide new formations.</p>
            )}
            {faction.reserves.map((r) => (
              <button
                key={r.id}
                className="option-btn"
                onClick={() => {
                  beginDeploy(r.id);
                  setShowReserves(false);
                }}
              >
                <span className="label">{r.name}</span>
                <span className="desc">
                  {UNIT_DEFS[r.type].label} · strength {r.strength} · deploy: 15 MP, 10 EQ
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
