// Army instrument: CONTACT / MARCH / SPENT, type + strength + assault.
// Stays present (thin rail) under briefing AND after-action. Hover lights the hex.

import { UNIT_DEFS } from '../game/data/defs';
import { useStore } from '../game/state/store';
import { Unit } from '../game/types';
import { AgencyKind, agencyKind, boardChrome, cycleUnspent, formationLane, FormationLane, unitOrders } from './boardChrome';
import { Ico } from './icons';
import { abbreviate } from '../map/textures';

function strengthTone(strength: number): string {
  return strength > 65 ? 'good' : strength > 35 ? 'warn' : 'bad';
}

const KIND_LABEL: Record<FormationLane, string> = {
  contact: 'Contact',
  march: 'March',
  spent: 'Spent',
};

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
      const rank = { contact: 0, march: 1, spent: 2 };
      const d = rank[a.kind] - rank[b.kind];
      if (d !== 0) return d;
      return a.unit.name.localeCompare(b.unit.name);
    });

  const groups: FormationLane[] = ['contact', 'march', 'spent'];
  const nContact = rows.filter((r) => r.kind === 'contact').length;
  const nMarch = rows.filter((r) => r.kind === 'march').length;
  const nSpent = rows.filter((r) => r.kind === 'spent').length;
  const paperMounted = Boolean(pendingAttackId || lastCombat);
  const selected = Boolean(selectedUnitId);

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
      className={`outliner panel${paperMounted ? ' rail' : selected ? ' selected' : ' rest'}`}
      role="navigation"
      aria-label="Formations"
    >
      <div className="outliner-head">
        <span className="ttl">Formations</span>
        <span className="sub">{nContact} contact · {nMarch} march · {nSpent} spent</span>
        <button
          type="button"
          className="or-next"
          onClick={cycle}
          title="Next unspent formation · N"
        >
          Next
        </button>
      </div>
      <div className="outliner-list">
        {groups.map((g) => {
          const inG = rows.filter((r) => r.kind === g);
          if (inG.length === 0) return null;
          return (
            <div key={g} className="outliner-group">
              <div className="outliner-kicker">{KIND_LABEL[g]}</div>
              {inG.map(({ unit, kind, orders, mark }) => (
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
                  <AgencyMark kind={mark} />
                  <span className="or-type" title={UNIT_DEFS[unit.type].label}>
                    <Ico name={unit.type} size={12} />
                  </span>
                  <span className="or-name">{abbreviate(unit.name, unit.type)}</span>
                  <span className={`or-str ${strengthTone(unit.strength)}`} aria-label={`strength ${Math.round(unit.strength)}`}>
                    <i style={{ width: `${Math.max(8, unit.strength)}%` }} />
                  </span>
                  <span className="or-mp">{orders.mp.toFixed(0)}</span>
                  <span className={`or-dot ${unit.supply}`} title={unit.supply} />
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
                  ) : (
                    <span className="or-kind" />
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
