// Targeting whisper only — op-target and deploy. The bench already names
// the next act once a formation is selected; rest has the rail.

import { useStore } from '../game/state/store';
import { showOrdersHint } from './hudChrome';

export function OrdersHint() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const lastCombat = useStore((s) => s.lastCombat);
  const interactionMode = useStore((s) => s.interactionMode);
  const showJournal = useStore((s) => s.showJournal);
  const showDossier = useStore((s) => s.showDossier);
  const showTheatreClock = useStore((s) => s.showTheatreClock);
  const pinnedLexiconId = useStore((s) => s.pinnedLexiconId);

  if (!game || game.phase !== 'player') return null;
  if (!showOrdersHint({
    selectedUnitId,
    showJournal,
    showDossier,
    showTheatreClock,
    pinnedLexiconId,
    pendingAttackId,
    lastCombat,
    interactionMode,
  })) return null;

  const eyebrow = interactionMode === 'deploy' ? 'Reserves' : 'Operation';
  const line = interactionMode === 'deploy'
    ? 'Click a highlighted supply hub to bring the formation onto the board.'
    : 'Click a valid hex to commit the operation.';

  return (
    <div className="orders-hint" role="status">
      <span className="oh-eye">{eyebrow}</span>
      <span className="oh-line">{line}</span>
    </div>
  );
}
