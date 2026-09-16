// Selection / orders affordance — the one line that says what to do next.
// Vic3-style: the map is the stage; this is the whispered stage direction.

import { UNIT_DEFS } from '../game/data/defs';
import { attackableTargets } from '../game/rules/movement';
import { useStore } from '../game/state/store';

export function OrdersHint() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const lastCombat = useStore((s) => s.lastCombat);
  const interactionMode = useStore((s) => s.interactionMode);

  if (!game || game.phase !== 'player' || lastCombat) return null;

  let eyebrow = 'Orders';
  let line = 'Select a formation to move or attack.';

  if (interactionMode === 'op-target') {
    eyebrow = 'Operation';
    line = 'Click a valid hex to commit the operation.';
  } else if (interactionMode === 'deploy') {
    eyebrow = 'Reserves';
    line = 'Click a highlighted supply hub to bring the formation onto the board.';
  } else if (pendingAttackId && selectedUnitId) {
    const atk = game.units[selectedUnitId];
    const def = game.units[pendingAttackId];
    eyebrow = UNIT_DEFS[atk?.type ?? 'infantry']?.support ? 'Fires' : 'Assault';
    line = atk && def
      ? `${atk.name} against ${def.name} — confirm the briefing, or Esc to withdraw.`
      : 'Confirm the engagement on the briefing, or Esc to withdraw.';
  } else if (selectedUnitId && game.units[selectedUnitId]) {
    const unit = game.units[selectedUnitId];
    const targets = attackableTargets(game, unit);
    eyebrow = unit.name;
    if (unit.hasAttacked) {
      line = 'This formation has engaged. Select another, or end the week.';
    } else if (targets.length > 0) {
      line = `${targets.length} enemy in contact — click them to preview the roll, or a highlighted hex to move.`;
    } else if (unit.movement > 0) {
      line = `${unit.movement.toFixed(1)} movement remaining — click a highlighted hex.`;
    } else {
      line = 'Spent this week. Select another formation, or end the turn.';
    }
  }

  return (
    <div className="orders-hint" role="status">
      <span className="oh-eye">{eyebrow}</span>
      <span className="oh-line">{line}</span>
    </div>
  );
}
