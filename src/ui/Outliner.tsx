// Army-at-a-glance rail: every friendly formation, remaining MP, contact.
// Click selects and focuses. This is a start — not a Vic 3 outliner.

import { useStore } from '../game/state/store';
import { GameState, Unit } from '../game/types';
import { unitOrders } from './boardChrome';
import { abbreviate } from '../map/textures';

type RowKind = 'contact' | 'march' | 'spent';

function kindOf(unit: Unit, game: GameState): RowKind {
  const o = unitOrders(game, unit);
  if (o.contacts.length > 0) return 'contact';
  if (o.canMove) return 'march';
  return 'spent';
}

export function Outliner() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const lastCombat = useStore((s) => s.lastCombat);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const selectUnit = useStore((s) => s.selectUnit);
  const focusCamera = useStore((s) => s.focusCamera);

  if (!game || game.phase !== 'player' || lastCombat || pendingAttackId) return null;

  const mine = Object.values(game.units).filter((u) => u.faction === game.playerFaction);
  const rows = mine
    .map((u) => ({ unit: u, kind: kindOf(u, game), orders: unitOrders(game, u) }))
    .sort((a, b) => {
      const rank = { contact: 0, march: 1, spent: 2 };
      const d = rank[a.kind] - rank[b.kind];
      if (d !== 0) return d;
      return a.unit.name.localeCompare(b.unit.name);
    });

  const nContact = rows.filter((r) => r.kind === 'contact').length;
  const nMarch = rows.filter((r) => r.kind === 'march').length;
  const nSpent = rows.filter((r) => r.kind === 'spent').length;

  return (
    <div className="outliner panel" role="navigation" aria-label="Formations">
      <div className="outliner-head">
        <span className="ttl">Formations</span>
        <span className="sub">{nContact} contact · {nMarch} march · {nSpent} spent</span>
      </div>
      <div className="outliner-list">
        {rows.map(({ unit, kind, orders }) => {
          return (
            <button
              key={unit.id}
              type="button"
              className={`outliner-row ${kind}${unit.id === selectedUnitId ? ' selected' : ''}`}
              onClick={() => {
                selectUnit(unit.id);
                focusCamera(unit.tile);
              }}
            >
              <span className="or-name">{abbreviate(unit.name, unit.type)}</span>
              <span className="or-meta">
                <span className="or-mp">{orders.mp.toFixed(1)}</span>
                <span className={`or-dot ${unit.supply}`} title={unit.supply} />
              </span>
              <span className="or-kind">
                {kind === 'contact' ? `${orders.contacts.length}×` : kind === 'spent' ? '—' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
