// Movement: Dijkstra over hexes with movement points. Enemy zones of control
// (tiles adjacent to enemy units) cost extra to enter and stop movement,
// which is what makes frontlines and encirclement meaningful.

import { TERRAIN_DEFS, WEATHER_DEFS } from '../data/defs';
import { neighborIds } from '../hex';
import { unitSupplyFactor } from './supply';
import {
  edgeKey,
  FactionId,
  GameState,
  opposing,
  TileId,
  Unit,
} from '../types';

export interface ReachableTile {
  id: TileId;
  cost: number;
  path: TileId[]; // includes destination, excludes origin
  entersZOC: boolean;
}

export function unitOnTile(state: GameState, tile: TileId): Unit | undefined {
  for (const u of Object.values(state.units)) {
    if (u.tile === tile && u.strength > 0) return u;
  }
  return undefined;
}

export function isEnemyZOC(state: GameState, tile: TileId, faction: FactionId): boolean {
  const enemy = opposing(faction);
  for (const nId of neighborIds(tile)) {
    const u = unitOnTile(state, nId);
    if (u && u.faction === enemy) return true;
  }
  return false;
}

export function riverBetween(state: GameState, a: TileId, b: TileId): 'none' | 'river' | 'bridge' {
  const key = edgeKey(a, b);
  if (state.bridgeEdges.includes(key)) return 'bridge';
  if (state.riverEdges.includes(key)) return 'river';
  return 'none';
}

// Movement pool granted at the start of a turn, given the unit's condition.
// unit.movement then holds the REMAINING pool for the rest of the turn.
export function computeTurnMovement(state: GameState, unit: Unit, baseMovement: number): number {
  const supply = unitSupplyFactor(unit);
  let mp = baseMovement * supply.movementMod;
  if (unit.reinforcing) mp *= 0.5;
  if (unit.disorganized > 0) mp *= 0.5;
  return Math.max(0, Math.round(mp * 2) / 2);
}

export function moveCostInto(
  state: GameState,
  from: TileId,
  to: TileId,
  unit: Unit,
): number | null {
  const tile = state.tiles[to];
  if (!tile) return null;
  if (tile.terrain === 'water') return null;
  const occupant = unitOnTile(state, to);
  if (occupant) return null; // no stacking; enemy tiles are attacked, not entered

  let cost = TERRAIN_DEFS[tile.terrain].moveCost;
  if (tile.road || tile.rail) {
    cost = 1;
  } else {
    cost += WEATHER_DEFS[state.weather].moveCostBonus;
  }
  const river = riverBetween(state, from, to);
  if (river === 'river') cost += 2;
  else if (river === 'bridge') cost += 0.5;

  if (isEnemyZOC(state, to, unit.faction)) cost += 1;
  return cost;
}

// All tiles a unit can reach this turn with remaining MP.
export function reachableTiles(state: GameState, unit: Unit): Map<TileId, ReachableTile> {
  const result = new Map<TileId, ReachableTile>();
  const mp = unit.movement;
  if (mp <= 0) return result;

  const best = new Map<TileId, number>([[unit.tile, 0]]);
  const open: Array<{ id: TileId; cost: number; path: TileId[] }> = [
    { id: unit.tile, cost: 0, path: [] },
  ];

  while (open.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].cost < open[bestIdx].cost) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0];
    if ((best.get(cur.id) ?? Infinity) < cur.cost) continue;

    // Entering an enemy ZOC tile ends movement: don't expand further from it.
    const curInZOC = cur.id !== unit.tile && isEnemyZOC(state, cur.id, unit.faction);
    if (curInZOC) continue;

    for (const nId of neighborIds(cur.id)) {
      const stepCost = moveCostInto(state, cur.id, nId, unit);
      if (stepCost === null) continue;
      const total = cur.cost + stepCost;
      if (total > mp + 1e-9) continue;
      if (total < (best.get(nId) ?? Infinity)) {
        best.set(nId, total);
        const path = [...cur.path, nId];
        open.push({ id: nId, cost: total, path });
        result.set(nId, {
          id: nId,
          cost: total,
          path,
          entersZOC: isEnemyZOC(state, nId, unit.faction),
        });
      }
    }
  }
  return result;
}

// Apply a movement along a path. Mutates draft state. Returns captured tiles.
export function applyMove(state: GameState, unitId: string, dest: TileId): TileId[] {
  const unit = state.units[unitId];
  const reach = reachableTiles(state, unit);
  const target = reach.get(dest);
  if (!target) return [];

  const captured: TileId[] = [];
  for (const stepId of target.path) {
    const tile = state.tiles[stepId];
    if (tile.controller !== unit.faction) {
      tile.controller = unit.faction;
      // Captured fortifications don't transfer.
      tile.fortified = false;
      captured.push(stepId);
    }
  }
  unit.tile = dest;
  unit.movement = Math.max(0, unit.movement - target.cost);
  // Moving abandons entrenchment and interrupts reinforcement.
  unit.entrenchment = 0;
  unit.reinforcing = false;
  return captured;
}

// Adjacent enemy units this unit could attack.
export function attackableTargets(state: GameState, unit: Unit): Unit[] {
  if (unit.hasAttacked || unit.movement <= 0 || unit.reinforcing) return [];
  const targets: Unit[] = [];
  for (const nId of neighborIds(unit.tile)) {
    const u = unitOnTile(state, nId);
    if (u && u.faction !== unit.faction) targets.push(u);
  }
  return targets;
}
