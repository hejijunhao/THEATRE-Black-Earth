// Strategic operations: limited, command-point-driven capabilities that stand
// in for air power, drones, fires and engineering effort.

import { OPERATION_DEFS } from '../data/defs';
import { FactionId, GameState, OperationId, TileId, opposing } from '../types';
import { unitOnTile } from './movement';

export interface OpValidation {
  ok: boolean;
  reason?: string;
}

export function canUseOperation(
  state: GameState,
  faction: FactionId,
  opId: OperationId,
): OpValidation {
  const def = OPERATION_DEFS[opId];
  const f = state.factions[faction];
  if ((f.opCooldowns[opId] ?? 0) > 0) {
    return { ok: false, reason: `Available again in ${f.opCooldowns[opId]} turn(s)` };
  }
  if (f.command < def.cost[faction]) {
    return { ok: false, reason: `Requires ${def.cost[faction]} command` };
  }
  return { ok: true };
}

export function validateOpTarget(
  state: GameState,
  faction: FactionId,
  opId: OperationId,
  target: TileId,
): OpValidation {
  const def = OPERATION_DEFS[opId];
  const tile = state.tiles[target];
  if (!tile || tile.terrain === 'water') return { ok: false, reason: 'Invalid target' };
  const unit = unitOnTile(state, target);

  switch (def.target) {
    case 'enemy-tile': {
      if (!unit || unit.faction !== opposing(faction)) {
        return { ok: false, reason: 'Select an enemy formation' };
      }
      return { ok: true };
    }
    case 'friendly-unit': {
      if (!unit || unit.faction !== faction) {
        return { ok: false, reason: 'Select a friendly formation' };
      }
      if (opId === 'rapid_reinforcement' && !unit.reinforcing) {
        return { ok: false, reason: 'Formation must be reinforcing' };
      }
      return { ok: true };
    }
    case 'any-tile':
      return { ok: true };
  }
}

// Apply the operation. Mutates draft state; returns a description for the log.
export function applyOperation(
  state: GameState,
  faction: FactionId,
  opId: OperationId,
  target: TileId,
): string {
  const def = OPERATION_DEFS[opId];
  const f = state.factions[faction];
  f.command -= def.cost[faction];
  f.opCooldowns[opId] = def.cooldown + 1; // decremented at turn start

  const unit = unitOnTile(state, target);
  const tile = state.tiles[target];

  switch (opId) {
    case 'recon_sweep': {
      state.effects.push({ kind: 'recon', faction, tile: target, turnsLeft: 1 });
      return 'Reconnaissance assets tasked against the sector.';
    }
    case 'artillery_prep': {
      if (unit) {
        unit.entrenchment = Math.max(0, unit.entrenchment - 2);
        unit.readiness = Math.max(0, unit.readiness - 12);
        unit.morale = Math.max(0, unit.morale - 8);
        return `Preparatory fires strike ${unit.name}: entrenchment reduced.`;
      }
      return 'Preparatory fires strike the sector.';
    }
    case 'close_support': {
      if (unit) {
        state.effects.push({ kind: 'close_support', faction, unitId: unit.id, turnsLeft: 1 });
        return `${unit.name} will receive close support for its next attack.`;
      }
      return 'Close support tasked.';
    }
    case 'emergency_resupply': {
      if (unit) {
        state.effects.push({ kind: 'resupply', faction, unitId: unit.id, turnsLeft: 2 });
        if (unit.supply === 'isolated' || unit.supply === 'low' || unit.supply === 'strained') {
          unit.supply = 'supplied';
        }
        return `Emergency supplies pushed through to ${unit.name}.`;
      }
      return 'Emergency resupply dispatched.';
    }
    case 'rapid_reinforcement': {
      if (unit) {
        const equipCost = 10;
        f.equipment = Math.max(0, f.equipment - equipCost);
        const gain = 12;
        unit.strength = Math.min(100, unit.strength + gain);
        return `${unit.name} receives priority replacements (+${gain} strength).`;
      }
      return 'Priority reinforcement ordered.';
    }
    case 'fortify_position': {
      if (unit) {
        unit.entrenchment = Math.min(4, unit.entrenchment + 2);
        tile.fortified = true;
        return `${unit.name} fortifies its position.`;
      }
      return 'Position fortified.';
    }
  }
}
