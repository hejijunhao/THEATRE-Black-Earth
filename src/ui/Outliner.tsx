// Army instrument: CONTACT / MARCH / SPENT, type + strength + assault.
// Stays dimmed-alive under the briefing. Hover lights the hex.

import { UNIT_DEFS } from '../game/data/defs';
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

function typeGlyph(type: Unit['type']): string {
  return type === 'infantry' ? '×'
    : type === 'mechanized' ? '○×'
    : type === 'armored' ? '○'
    : type === 'artillery' ? '●'
    : '/';
}

function strengthTone(strength: number): string {
  return strength > 65 ? 'good' : strength > 35 ? 'warn' : 'bad';
}

const KIND_LABEL: Record<RowKind, string> = {
  contact: 'Contact',
  march: 'March',
  spent: 'Spent',
};

export function Outliner() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const lastCombat = useStore((s) => s.lastCombat);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const selectUnit = useStore((s) => s.selectUnit);
  const focusCamera = useStore((s) => s.focusCamera);
  const hoverTile = useStore((s) => s.hoverTile);

  if (!game || game.phase !== 'player' || lastCombat) return null;

  const mine = Object.values(game.units).filter((u) => u.faction === game.playerFaction);
  const rows = mine
    .map((u) => ({ unit: u, kind: kindOf(u, game), orders: unitOrders(game, u) }))
    .sort((a, b) => {
      const rank = { contact: 0, march: 1, spent: 2 };
      const d = rank[a.kind] - rank[b.kind];
      if (d !== 0) return d;
      return a.unit.name.localeCompare(b.unit.name);
    });

  const groups: RowKind[] = ['contact', 'march', 'spent'];
  const nContact = rows.filter((r) => r.kind === 'contact').length;
  const nMarch = rows.filter((r) => r.kind === 'march').length;
  const nSpent = rows.filter((r) => r.kind === 'spent').length;

  return (
    <div
      className={`outliner panel${pendingAttackId ? ' dimmed' : ''}`}
      role="navigation"
      aria-label="Formations"
    >
      <div className="outliner-head">
        <span className="ttl">Formations</span>
        <span className="sub">{nContact} contact · {nMarch} march · {nSpent} spent</span>
      </div>
      <div className="outliner-list">
        {groups.map((g) => {
          const inG = rows.filter((r) => r.kind === g);
          if (inG.length === 0) return null;
          return (
            <div key={g} className="outliner-group">
              <div className="outliner-kicker">{KIND_LABEL[g]}</div>
              {inG.map(({ unit, kind, orders }) => (
                <button
                  key={unit.id}
                  type="button"
                  className={`outliner-row ${kind}${unit.id === selectedUnitId ? ' selected' : ''}`}
                  onMouseEnter={() => hoverTile(unit.tile)}
                  onMouseLeave={() => hoverTile(null)}
                  onClick={() => {
                    selectUnit(unit.id);
                    focusCamera(unit.tile);
                  }}
                >
                  <span className="or-glyph" title={UNIT_DEFS[unit.type].label}>{typeGlyph(unit.type)}</span>
                  <span className="or-name">{abbreviate(unit.name, unit.type)}</span>
                  <span className={`or-str ${strengthTone(unit.strength)}`} aria-label={`strength ${Math.round(unit.strength)}`}>
                    <i style={{ width: `${Math.max(8, unit.strength)}%` }} />
                  </span>
                  <span className="or-mp">{orders.mp.toFixed(0)}</span>
                  <span className={`or-dot ${unit.supply}`} title={unit.supply} />
                  <span className="or-kind">
                    {kind === 'contact' ? `${orders.contacts.length}×` : ''}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
