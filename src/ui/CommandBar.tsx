// Command bench: the selected formation's legal orders as plates, plus
// theatre actions (operations, reserves, end week). Half-disabled global
// toolbar is gone — a plate is present only when the order is legal.

import { useState } from 'react';
import { OPERATION_DEFS, UNIT_DEFS } from '../game/data/defs';
import { canUseOperation } from '../game/rules/ops';
import { MapMode, useStore } from '../game/state/store';
import { OperationId } from '../game/types';
import { unitOrders } from './boardChrome';
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

function Plate({
  eyebrow,
  title,
  line,
  icon,
  tip,
  onClick,
  active,
  tone,
}: {
  eyebrow: string;
  title: string;
  line: string;
  icon: string;
  tip: string;
  onClick?: () => void;
  active?: boolean;
  tone?: 'contact' | 'spent' | 'stat';
}) {
  const cls = `bench-plate${active ? ' active' : ''}${tone ? ` ${tone}` : ''}${onClick ? '' : ' inert'}`;
  const body = (
    <>
      <span className="ico"><Ico name={icon} size={16} /></span>
      <span className="copy">
        <span className="eye">{eyebrow}</span>
        <span className="ttl">{title}</span>
        <span className="ln">{line}</span>
      </span>
    </>
  );
  return (
    <Tip title={`${eyebrow} · ${title}`} text={tip} block>
      {onClick ? (
        <button type="button" className={cls} onClick={onClick}>{body}</button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </Tip>
  );
}

export function CommandBar() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const toggleReinforce = useStore((s) => s.toggleReinforce);
  const orderEntrench = useStore((s) => s.orderEntrench);
  const beginOperation = useStore((s) => s.beginOperation);
  const beginDeploy = useStore((s) => s.beginDeploy);
  const requestEndTurn = useStore((s) => s.requestEndTurn);
  const setPendingAttack = useStore((s) => s.setPendingAttack);
  const pendingOp = useStore((s) => s.pendingOp);
  const lastCombat = useStore((s) => s.lastCombat);
  const [showOps, setShowOps] = useState(false);
  const [showReserves, setShowReserves] = useState(false);

  if (!game || game.phase !== 'player' || lastCombat || pendingAttackId) return null;

  const unit = selectedUnitId ? game.units[selectedUnitId] : null;
  const faction = game.factions[game.playerFaction];
  const orders = unit ? unitOrders(game, unit) : null;
  const def = unit ? UNIT_DEFS[unit.type] : null;

  return (
    <>
      <div className="command-bench panel">
        <div className="bench-formation">
          {unit && orders && def ? (
            <>
              <div className="bench-who">
                <span className="eye">{def.label}</span>
                <span className="ttl">{unit.name}</span>
              </div>
              <div className="bench-plates">
                <Plate
                  eyebrow="March"
                  title={orders.canMove ? `${orders.mp.toFixed(1)} MP` : 'No march'}
                  line={orders.canMove ? `of ${orders.mpMax}` : 'spent'}
                  icon="trend"
                  tip="Click a highlighted hex to move. Roads are faster; forests, marsh and river crossings are slow. Moving next to the enemy ends the march."
                  tone="stat"
                />
                {orders.contacts.length > 0 && (
                  <Plate
                    eyebrow={orders.isFires ? 'Fires' : 'Assault'}
                    title={`${orders.contacts.length} in contact`}
                    line="open briefing"
                    icon={orders.isFires ? 'artillery' : 'threat'}
                    tip="Click to open the staff estimate against the first adjacent enemy. You can also click the enemy counter on the board."
                    onClick={() => setPendingAttack(orders.contacts[0].id)}
                    active={Boolean(pendingAttackId)}
                    tone="contact"
                  />
                )}
                {orders.canEntrench && (
                  <Plate
                    eyebrow="Field"
                    title="Entrench"
                    line="+1 now"
                    icon="entrench"
                    tip="Spend the formation's remaining movement to dig in immediately (+1 entrenchment). Entrenchment also grows passively for stationary units."
                    onClick={orderEntrench}
                  />
                )}
                {orders.canReinforce && (
                  <Plate
                    eyebrow="Depot"
                    title={orders.reinforcing ? 'Receiving' : 'Reinforce'}
                    line={`${def.reinforceCost.manpower} MP · ${def.reinforceCost.equipment} EQ`}
                    icon="reinforce"
                    tip="Order the selected formation to absorb replacements. Consumes manpower and equipment each turn; works best in supply and away from the front."
                    onClick={toggleReinforce}
                    active={orders.reinforcing}
                  />
                )}
                {orders.spent && (
                  <Plate
                    eyebrow="Week"
                    title="Spent"
                    line={orders.hasAttacked ? 'has engaged' : 'no march left'}
                    icon="cooldown"
                    tip="This formation has no movement remaining. Select another, or end the week."
                    tone="spent"
                  />
                )}
              </div>
            </>
          ) : (
            <div className="bench-who empty">
              <span className="eye">Orders</span>
              <span className="ttl">Select a formation</span>
            </div>
          )}
        </div>

        <div className="bench-theatre">
          <div className="bench-plates">
            <Plate
              eyebrow="Theatre"
              title="Operations"
              line={`${faction.command}/${faction.commandMax} CMD`}
              icon="operations"
              tip="Limited theatre capabilities paid with command points: reconnaissance, fires, air support, resupply and engineering."
              onClick={() => { setShowOps(!showOps); setShowReserves(false); }}
              active={showOps || Boolean(pendingOp)}
            />
            <Plate
              eyebrow="Theatre"
              title="Reserves"
              line={`${faction.reserves.length} waiting`}
              icon="reserves"
              tip="Uncommitted formations. Deploy them at supplied hub cities — filling a gap now may cost you the counterattack later."
              onClick={() => { setShowReserves(!showReserves); setShowOps(false); }}
              active={showReserves}
            />
          </div>
          <Tip title="End week" text="Commit your orders and hand the initiative to the enemy. You will be warned about idle formations and unresolved decisions.">
            <button className="end-turn-btn" onClick={requestEndTurn}>
              End Week
            </button>
          </Tip>
        </div>
      </div>

      {showOps && (
        <div
          className="panel panel-framed"
          style={{ position: 'absolute', bottom: 140, left: '50%', transform: 'translateX(-50%)', width: 460, zIndex: 25 }}
        >
          <div className="panel-title">
            Strategic Operations
            <span className="sub">CMD {faction.command}/{faction.commandMax}</span>
          </div>
          <div style={{ padding: 10 }}>
            {OP_ORDER.map((opId) => {
              const opDef = OPERATION_DEFS[opId];
              const check = canUseOperation(game, game.playerFaction, opId);
              return (
                <Tip key={opId} title={opDef.name} text={opDef.description} block>
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
                      <span className="label">{opDef.name}</span>
                      <span className="desc">
                        {opDef.cost[game.playerFaction]} CMD · cooldown {opDef.cooldown}t
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
          style={{ position: 'absolute', bottom: 140, left: '50%', transform: 'translateX(-50%)', width: 380, zIndex: 25 }}
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
