// Command bench: the selected formation's legal orders as milled plates.
// A plate is present only when the order is legal — no SaaS icon chip row.

import { useState } from 'react';
import { OPERATION_DEFS, UNIT_DEFS } from '../game/data/defs';
import { canUseOperation } from '../game/rules/ops';
import { MapMode, useStore } from '../game/state/store';
import { OperationId } from '../game/types';
import { unitOrders } from './boardChrome';
import { Ico } from './icons';
import { LEXICON } from './lexicon';
import { LexiconTip, Tip } from './Tip';

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

function MpPips({ mp, max }: { mp: number; max: number }) {
  const n = Math.max(1, Math.round(max));
  const filled = Math.max(0, Math.round(mp));
  return (
    <span className="mp-pips" aria-label={`${mp.toFixed(1)} of ${max} movement`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i < filled ? 'on' : ''} />
      ))}
    </span>
  );
}

function Plate({
  id,
  title,
  value,
  line,
  now,
  onClick,
  active,
  tone,
}: {
  id: keyof typeof LEXICON;
  title: string;
  value: string;
  line: string;
  now?: string;
  onClick?: () => void;
  active?: boolean;
  tone?: 'contact' | 'spent' | 'stat';
}) {
  const cls = `bench-plate${active ? ' active' : ''}${tone ? ` ${tone}` : ''}${onClick ? '' : ' inert'}`;
  const body = (
    <>
      <span className="plate-engrave">{title}</span>
      <span className="plate-value">{value}</span>
      <span className="plate-line">{line}</span>
    </>
  );
  return (
    <LexiconTip id={id} now={now} block>
      {onClick ? (
        <button type="button" className={cls} onClick={onClick}>{body}</button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </LexiconTip>
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

  if (!game || game.phase !== 'player' || lastCombat) return null;

  const unit = selectedUnitId ? game.units[selectedUnitId] : null;
  const faction = game.factions[game.playerFaction];
  const orders = unit ? unitOrders(game, unit) : null;
  const def = unit ? UNIT_DEFS[unit.type] : null;

  return (
    <>
      <div className={`command-bench panel panel-framed${pendingAttackId ? ' dimmed' : ''}`}>
        <div className="bench-formation">
          {unit && orders && def ? (
            <>
              <div className="bench-nameplate">
                <span className="np-type">{def.label}</span>
                <span className="np-name">{unit.name}</span>
                <MpPips mp={orders.mp} max={orders.mpMax} />
              </div>
              <div className="bench-plates">
                <Plate
                  id="march"
                  title="March"
                  value={orders.canMove ? orders.mp.toFixed(1) : '0'}
                  line={orders.canMove ? `of ${orders.mpMax} MP` : 'spent'}
                  now={orders.canMove
                    ? `${orders.mp.toFixed(1)} of ${orders.mpMax} remaining — click a highlighted hex.`
                    : 'No march left this week.'}
                  tone="stat"
                />
                {orders.contacts.length > 0 && (
                  <Plate
                    id="assault"
                    title={orders.isFires ? 'Fires' : 'Assault'}
                    value={String(orders.contacts.length)}
                    line="in contact"
                    now={`${orders.contacts.length} legal target${orders.contacts.length > 1 ? 's' : ''} — open the briefing.`}
                    onClick={() => setPendingAttack(orders.contacts[0].id)}
                    active={Boolean(pendingAttackId)}
                    tone="contact"
                  />
                )}
                {orders.canEntrench && (
                  <Plate
                    id="entrench"
                    title="Entrench"
                    value="+1"
                    line="dig in now"
                    now="Spend remaining movement to entrench immediately."
                    onClick={orderEntrench}
                  />
                )}
                {orders.canReinforce && (
                  <Plate
                    id="reinforce"
                    title={orders.reinforcing ? 'Receiving' : 'Reinforce'}
                    value={`${def.reinforceCost.manpower}`}
                    line={`${def.reinforceCost.manpower} MP · ${def.reinforceCost.equipment} EQ`}
                    now={orders.reinforcing
                      ? 'Replacements are already flowing into this formation.'
                      : `Costs ${def.reinforceCost.manpower} manpower and ${def.reinforceCost.equipment} equipment each week.`}
                    onClick={toggleReinforce}
                    active={orders.reinforcing}
                  />
                )}
                {orders.spent && (
                  <Plate
                    id="movement"
                    title="Spent"
                    value="—"
                    line={orders.hasAttacked ? 'has engaged' : 'no march left'}
                    now="This plate is done. Select another formation, or end the week."
                    tone="spent"
                  />
                )}
              </div>
            </>
          ) : (
            <div className="bench-nameplate empty">
              <span className="np-type">Orders</span>
              <span className="np-name">Select a formation</span>
            </div>
          )}
        </div>

        <div className="bench-theatre">
          <div className="bench-plates">
            <Plate
              id="operations"
              title="Operations"
              value={`${faction.command}`}
              line={`${faction.command}/${faction.commandMax} CMD`}
              now={`${faction.command} of ${faction.commandMax} command remaining this week.`}
              onClick={() => { setShowOps(!showOps); setShowReserves(false); }}
              active={showOps || Boolean(pendingOp)}
            />
            <Plate
              id="reserves"
              title="Reserves"
              value={String(faction.reserves.length)}
              line={faction.reserves.length === 1 ? 'waiting' : 'waiting'}
              now={`${faction.reserves.length} uncommitted formation${faction.reserves.length === 1 ? '' : 's'}. Deploy at a supplied hub.`}
              onClick={() => { setShowReserves(!showReserves); setShowOps(false); }}
              active={showReserves}
            />
          </div>
          <LexiconTip id="endWeek" now="Commit the week and hand the initiative to the enemy.">
            <button className="end-turn-btn" onClick={requestEndTurn}>
              End Week
            </button>
          </LexiconTip>
        </div>
      </div>

      {showOps && (
        <div
          className="panel panel-framed"
          style={{ position: 'absolute', bottom: 148, left: '50%', transform: 'translateX(-50%)', width: 460, zIndex: 25 }}
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
                <Tip key={opId} title={opDef.name} text={opDef.description} block lexicon>
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
          style={{ position: 'absolute', bottom: 148, left: '50%', transform: 'translateX(-50%)', width: 380, zIndex: 25 }}
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
