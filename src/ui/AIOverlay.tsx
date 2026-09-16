// Enemy-turn presentation: banner with the latest AI action, a progress
// pulse, and a skip control. The timer that drives AI steps lives in App.

import { useStore } from '../game/state/store';

export function AIOverlay() {
  const game = useStore((s) => s.game);
  const lastAILog = useStore((s) => s.lastAILog);
  const setAISpeed = useStore((s) => s.setAISpeed);
  const aiSpeed = useStore((s) => s.aiSpeed);
  if (!game || game.phase !== 'ai') return null;

  return (
    <div className="ai-banner panel">
      <span className="label pulse">Enemy Operations</span>
      <span className="action">{lastAILog?.text ?? 'The enemy command is issuing orders…'}</span>
      {lastAILog?.combat && (
        <span className="ai-combat">
          2d6 {lastAILog.combat.attackerRoll.total}
          {lastAILog.combat.defenderRoll ? ` vs ${lastAILog.combat.defenderRoll.total}` : ''}
          {' · '}−{Math.round(lastAILog.combat.defenderLoss)} given
          {lastAILog.combat.kind === 'assault' ? ` / −${Math.round(lastAILog.combat.attackerLoss)} taken` : ''}
        </span>
      )}
      {aiSpeed > 100 && (
        <button className="btn small" onClick={() => setAISpeed(80)}>
          Skip
        </button>
      )}
    </div>
  );
}
