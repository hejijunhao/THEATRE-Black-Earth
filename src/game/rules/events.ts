import { EVENT_DEFS } from '../data/events';
import { draw } from '../rng';
import { EventEffects, GameEventDef, GameState, opposing } from '../types';

const EVENT_CHANCE = 0.4;

// Possibly select an event to present at the start of the player's turn.
export function maybeSelectEvent(state: GameState): GameEventDef | null {
  const eligible = EVENT_DEFS.filter(
    (e) =>
      !state.firedEvents.includes(e.id) &&
      (e.faction === 'both' || e.faction === state.playerFaction) &&
      state.turn >= e.minTurn &&
      state.turn <= e.maxTurn,
  );
  if (eligible.length === 0) return null;

  const roll = draw(state.rngState);
  state.rngState = roll.next;
  if (roll.value > EVENT_CHANCE) return null;

  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  const pick = draw(state.rngState);
  state.rngState = pick.next;
  let acc = pick.value * totalWeight;
  for (const e of eligible) {
    acc -= e.weight;
    if (acc <= 0) return e;
  }
  return eligible[eligible.length - 1];
}

export function applyEventEffects(state: GameState, effects: EventEffects): void {
  const f = state.factions[state.playerFaction];
  const enemy = state.factions[opposing(state.playerFaction)];
  if (effects.manpower) f.manpower = Math.max(0, f.manpower + effects.manpower);
  if (effects.equipment) f.equipment = Math.max(0, f.equipment + effects.equipment);
  if (effects.command) f.command = Math.min(f.commandMax, Math.max(0, f.command + effects.command));
  if (effects.warSupport) f.warSupport = Math.min(100, Math.max(0, f.warSupport + effects.warSupport));
  if (effects.enemyWarSupport) {
    enemy.warSupport = Math.min(100, Math.max(0, enemy.warSupport + effects.enemyWarSupport));
  }
  if (effects.readinessAll) {
    for (const u of Object.values(state.units)) {
      if (u.faction === state.playerFaction) {
        u.readiness = Math.min(100, Math.max(0, u.readiness + effects.readinessAll));
      }
    }
  }
  if (effects.reserve) {
    state.unitSeq += 1;
    f.reserves.push({
      id: `res-${state.unitSeq}`,
      type: effects.reserve.type,
      name: effects.reserve.name,
      strength: 85,
    });
  }
}
