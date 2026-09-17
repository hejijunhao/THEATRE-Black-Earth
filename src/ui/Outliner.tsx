// Week-runner: Next-unspent is the primary affordance. At rest the list
// collapses to a chip so the map owns the frame. Rows group by front/sector
// when selected or explicitly opened. Each row is type glyph + strength + agency.

import { useState } from 'react';
import { UNIT_DEFS } from '../game/data/defs';
import { useStore } from '../game/state/store';
import { Unit } from '../game/types';
import {
  AgencyKind, agencyKind, boardChrome, cycleUnspent, formationLane,
  frontSector, SECTOR_LABEL, SECTOR_ORDER, unitOrders,
} from './boardChrome';
import { Ico } from './icons';
import { outlinerChrome, outlinerListMounted } from './outlinerChrome';
import { abbreviate } from '../map/textures';

function strengthTone(strength: number): string {
  return strength > 65 ? 'good' : strength > 35 ? 'warn' : 'bad';
}

function AgencyMark({ kind }: { kind: AgencyKind }) {
  if (kind === 'assault') {
    return <span className="or-mark assault" title="Can assault" aria-hidden><i /></span>;
  }
  if (kind === 'contact') {
    return <span className="or-mark contact" title="In contact" aria-hidden><i /><i /></span>;
  }
  if (kind === 'spent') {
    return <span className="or-mark spent" title="Spent" aria-hidden />;
  }
  if (kind === 'selected') {
    return <span className="or-mark selected" title="Selected" aria-hidden />;
  }
  return <span className="or-mark idle" aria-hidden />;
}

export function Outliner() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const lastCombat = useStore((s) => s.lastCombat);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const selectUnit = useStore((s) => s.selectUnit);
  const focusCamera = useStore((s) => s.focusCamera);
  const hoverTile = useStore((s) => s.hoverTile);
  const setPendingAttack = useStore((s) => s.setPendingAttack);
  const dismissCombat = useStore((s) => s.dismissCombat);
  const [showOutliner, setShowOutliner] = useState(false);

  if (!game || game.phase !== 'player') return null;

  const mine = Object.values(game.units).filter((u) => u.faction === game.playerFaction);
  const rows = mine
    .map((u) => {
      const orders = unitOrders(game, u);
      const chrome = boardChrome(game, u, false);
      const selected = u.id === selectedUnitId;
      return {
        unit: u,
        kind: formationLane(game, u),
        orders,
        mark: agencyKind(chrome, selected),
      };
    })
    .sort((a, b) => {
      const sector = SECTOR_ORDER.indexOf(frontSector(a.unit.tile)) - SECTOR_ORDER.indexOf(frontSector(b.unit.tile));
      if (sector !== 0) return sector;
      const rank = { contact: 0, march: 1, spent: 2 };
      const d = rank[a.kind] - rank[b.kind];
      if (d !== 0) return d;
      return a.unit.name.localeCompare(b.unit.name);
    });

  const groups = SECTOR_ORDER
    .map((sector) => ({
      sector,
      label: SECTOR_LABEL[sector],
      rows: rows.filter((r) => frontSector(r.unit.tile) === sector),
    }))
    .filter((g) => g.rows.length > 0);

  const nextId = cycleUnspent(game, selectedUnitId);
  const nextUnit = nextId ? game.units[nextId] : null;
  const nLeft = rows.filter((r) => r.kind !== 'spent').length;
  const selected = Boolean(selectedUnitId);
  const chrome = outlinerChrome({
    selectedUnitId,
    pendingAttackId,
    lastCombat,
    showOutliner,
  });
  const listOn = outlinerListMounted(chrome);

  const openEstimate = (unit: Unit, defenderId: string) => {
    if (lastCombat) dismissCombat();
    selectUnit(unit.id);
    focusCamera(unit.tile);
    setPendingAttack(defenderId);
  };

  const cycle = () => {
    const next = cycleUnspent(game, selectedUnitId);
    if (!next) return;
    const unit = game.units[next];
    selectUnit(next);
    if (unit) focusCamera(unit.tile);
  };

  return (
    <div
      className={`outliner week-runner ${chrome}${selected && chrome === 'open' ? ' selected' : ''}`}
      role="navigation"
      aria-label="Formations"
    >
      <div className="or-head">
        <button
          type="button"
          className={`or-run${nextUnit ? '' : ' done'}`}
          onClick={cycle}
          disabled={!nextUnit}
          title="Next unspent formation · N"
        >
          <span className="or-run-kicker">{nextUnit ? 'Next' : 'Spent'}</span>
          {nextUnit ? (
            <>
              <span className="or-type" aria-hidden>
                <Ico name={nextUnit.type} size={14} />
              </span>
              <span className="or-run-name">{abbreviate(nextUnit.name, nextUnit.type)}</span>
              <span className="or-run-left">{nLeft}</span>
            </>
          ) : (
            <span className="or-run-name">Week closed</span>
          )}
        </button>
        {chrome === 'chip' && (
          <button
            type="button"
            className="or-toggle"
            aria-expanded={false}
            aria-label="Open formations"
            title="Open formations"
            onClick={() => setShowOutliner(true)}
          />
        )}
        {chrome === 'open' && !selected && (
          <button
            type="button"
            className="or-toggle"
            aria-expanded
            aria-label="Collapse formations"
            title="Collapse formations"
            onClick={() => setShowOutliner(false)}
          />
        )}
      </div>
      {listOn && (
        <div className="outliner-list">
          {groups.map(({ sector, label, rows: sectorRows }) => (
            <div key={sector} className="or-group">
              <div className="or-sector">{label}</div>
              {sectorRows.map(({ unit, kind, orders, mark }) => (
                <button
                  key={unit.id}
                  type="button"
                  className={`outliner-row ${kind}${unit.id === selectedUnitId ? ' selected' : ''}`}
                  title={`${unit.name} · ${UNIT_DEFS[unit.type].label} · ${Math.round(unit.strength)}`}
                  onMouseEnter={() => hoverTile(unit.tile)}
                  onMouseLeave={() => hoverTile(null)}
                  onClick={() => {
                    selectUnit(unit.id);
                    focusCamera(unit.tile);
                  }}
                >
                  <span className="or-type" aria-hidden>
                    <Ico name={unit.type} size={13} />
                  </span>
                  <span className="or-name">{abbreviate(unit.name, unit.type)}</span>
                  <span className={`or-str ${strengthTone(unit.strength)}`} aria-label={`strength ${Math.round(unit.strength)}`}>
                    <i style={{ width: `${Math.max(8, unit.strength)}%` }} />
                  </span>
                  <AgencyMark kind={mark} />
                  {kind === 'contact' && orders.contacts[0] ? (
                    <span
                      className="or-kind assault"
                      role="button"
                      title="Open the staff estimate"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEstimate(unit, orders.contacts[0].id);
                      }}
                    >
                      {orders.contacts.length}×
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
