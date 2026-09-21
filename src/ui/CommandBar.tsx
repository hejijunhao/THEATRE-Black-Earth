// Command bench: the selected formation's legal orders as milled plates.
// Mounts only when a formation is selected. Theatre ops and End Week live
// on the top strip so rest state can leave the map alone.

import { useState } from 'react';
import { UNIT_DEFS } from '../game/data/defs';
import { MapMode, useStore } from '../game/state/store';
import { unitOrders } from './boardChrome';
import { showCommandBench } from './hudChrome';
import { LEXICON } from './lexicon';
import { LexiconTip, Tip } from './Tip';

const MAP_MODES: Array<{ id: MapMode; label: string; lexicon?: keyof typeof LEXICON; tip?: string }> = [
  { id: 'terrain', label: 'Terrain', lexicon: 'terrain' },
  { id: 'political', label: 'Political', tip: 'Territorial control and the frontline.' },
  { id: 'supply', label: 'Supply', lexicon: 'supply' },
  { id: 'objectives', label: 'Objectives', lexicon: 'cities' },
  { id: 'intel', label: 'Intelligence', tip: 'Observed sectors are bright; dark areas rely on stale or absent intelligence.' },
];

export function MapModes() {
  const mapMode = useStore((s) => s.mapMode);
  const setMapMode = useStore((s) => s.setMapMode);
  const [open, setOpen] = useState(false);
  const current = MAP_MODES.find((m) => m.id === mapMode) ?? MAP_MODES[0];

  return (
    <div className={`map-modes${open ? ' open' : ' collapsed'}`}>
      <button
        type="button"
        className={`map-mode-btn current ${mapMode === current.id ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="Map layers"
      >
        {current.label}
      </button>
      {open && MAP_MODES.map((m) => {
        if (m.id === current.id) return null;
        const btn = (
          <button
            className={`map-mode-btn ${mapMode === m.id ? 'active' : ''}`}
            onClick={() => {
              setMapMode(m.id);
              setOpen(false);
            }}
          >
            {m.label}
          </button>
        );
        if (m.lexicon) {
          return (
            <LexiconTip key={m.id} id={m.lexicon} now={`Map mode: ${m.label}.`}>
              {btn}
            </LexiconTip>
          );
        }
        return (
          <Tip key={m.id} title={m.label} text={m.tip ?? m.label}>
            {btn}
          </Tip>
        );
      })}
    </div>
  );
}

function MovementReadout({ mp, max }: { mp: number; max: number }) {
  return <span className="movement-readout" aria-label={`${mp.toFixed(1)} of ${max} movement`}>
    {mp.toFixed(1)} / {max} MP
  </span>;
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
  const setPendingAttack = useStore((s) => s.setPendingAttack);
  const lastCombat = useStore((s) => s.lastCombat);
  const toggleDossier = useStore((s) => s.toggleDossier);
  const showDossier = useStore((s) => s.showDossier);

  if (!game || game.phase !== 'player') return null;
  if (!showCommandBench({ selectedUnitId })) return null;

  const unit = selectedUnitId ? game.units[selectedUnitId] : null;
  if (!unit) return null;
  const orders = unitOrders(game, unit);
  const def = UNIT_DEFS[unit.type];
  if (pendingAttackId || lastCombat) return null;

  return (
    <div className="command-bench panel">
      <div className="bench-formation">
        <button
          type="button"
          className="bench-nameplate"
          onClick={toggleDossier}
          title={showDossier ? 'Hide dossier · I' : 'Open dossier · I'}
        >
          <span className="np-type">{def.label}</span>
          <span className="np-name">{unit.name}</span>
          <MovementReadout mp={orders.mp} max={orders.mpMax} />
        </button>
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
      </div>
    </div>
  );
}
