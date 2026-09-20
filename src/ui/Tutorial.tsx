// First-turn tutorial: short contextual prompts that advance as the player
// performs each taught action. No walls of text, no blocking modals.

import { useEffect } from 'react';
import { UNIT_DEFS } from '../game/data/defs';
import { useStore } from '../game/state/store';

interface StepDef {
  title: string;
  text: string;
  skippable?: boolean;
}

const STEPS: StepDef[] = [
  {
    title: 'Take command',
    text: 'This is your theatre. Click one of your formations (the plates with unit symbols) to select it. Drag to pan, scroll to zoom, hold right-click to tilt.',
  },
  {
    title: 'Movement',
    text: 'Highlighted hexes show where this formation can move this turn. Roads are faster; forests, marsh and river crossings are slow; moving next to the enemy costs extra and ends movement. Click a highlighted hex to move — moving abandons entrenchment.',
  },
  {
    title: 'Supply',
    text: 'Open the SUPPLY map mode (bottom left). Green territory is connected to your hubs; red is cut off. Formations out of supply fight at half power and eventually wither. Return to Political mode when done.',
  },
  {
    title: 'Combat preview',
    text: 'Select a formation adjacent to an enemy and click the enemy counter. The preview shows odds and expected losses. Confirm to roll 2d6 each — attack roll decides damage given, defence roll decides damage taken. Read the after-action report before you continue.',
    skippable: true,
  },
  {
    title: 'Reinforce & entrench',
    text: 'Damaged formations recover with REINFORCE (costs manpower and equipment, best done away from the front). ENTRENCH spends movement to dig in now. Try either on the selected formation.',
    skippable: true,
  },
  {
    title: 'Strategic operations',
    text: 'Open OPERATIONS in the command bar. Command points buy reconnaissance sweeps, artillery preparation, close support, emergency resupply and fortification. Open the list (and pick one if you wish).',
    skippable: true,
  },
  {
    title: 'End the turn',
    text: 'When your orders are placed, press END TURN. You will see the enemy act, then supply, reinforcement and recovery resolve. You will be warned about anything left undone.',
  },
  {
    title: 'The objective',
    text: 'Victory comes from holding and taking the cities that matter (see the OBJECTIVES map mode), preserving your army and keeping national war support intact. Decisive objectives can end the campaign early. Good luck, Commander.',
  },
];

export function Tutorial() {
  const game = useStore((s) => s.game);
  const step = game?.tutorialStep ?? -1;
  const advanceTutorial = useStore((s) => s.advanceTutorial);
  const skipTutorial = useStore((s) => s.skipTutorial);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const mapMode = useStore((s) => s.mapMode);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const lastCombat = useStore((s) => s.lastCombat);
  const pendingOp = useStore((s) => s.pendingOp);

  // Auto-advance rules.
  useEffect(() => {
    if (!game || step < 0) return;
    switch (step) {
      case 0:
        if (selectedUnitId) advanceTutorial(0);
        break;
      case 1: {
        const moved = Object.values(game.units).some(
          (u) => u.faction === game.playerFaction && u.movement < UNIT_DEFS[u.type].movement,
        );
        if (moved) advanceTutorial(1);
        break;
      }
      case 2:
        if (mapMode === 'supply') advanceTutorial(2);
        break;
      case 3:
        if (pendingAttackId || lastCombat) advanceTutorial(3);
        break;
      case 4: {
        const acted = Object.values(game.units).some(
          (u) => u.faction === game.playerFaction && (u.reinforcing || (u.movement === 0 && u.entrenchment > 0 && !u.hasAttacked)),
        );
        if (acted) advanceTutorial(4);
        break;
      }
      case 5:
        if (pendingOp) advanceTutorial(5);
        break;
      case 6:
        if (game.phase === 'ai') advanceTutorial(6);
        break;
    }
  }, [game, step, selectedUnitId, mapMode, pendingAttackId, lastCombat, pendingOp, advanceTutorial]);

  if (!game || step < 0 || step >= STEPS.length) return null;
  if (game.phase === 'ai' && step !== 7) return null;
  const def = STEPS[step];

  return (
    <div className="tutorial-prompt panel">
      <div className="body">
        <div className="step">GUIDANCE {step + 1}/{STEPS.length} — {def.title.toUpperCase()}</div>
        <div style={{ marginTop: 4 }}>{def.text}</div>
        <div className="links">
          {step === STEPS.length - 1 ? (
            <a onClick={skipTutorial}>Understood — dismiss guidance</a>
          ) : (
            <>
              {def.skippable && <a onClick={() => advanceTutorial(step)}>Next</a>}
              <a onClick={skipTutorial}>Skip all guidance</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
