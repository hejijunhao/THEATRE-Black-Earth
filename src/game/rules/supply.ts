// Supply model: a budget flood-fill (Dijkstra) from each faction's supply
// sources through friendly-controlled territory. Roads and rail reduce the
// per-tile cost, so supply "reaches further" along infrastructure. The
// remaining budget at a tile is its supply level; units map that level to a
// discrete supply state.

import { TERRAIN_DEFS } from '../data/defs';
import { neighborIds } from '../hex';
import {
  FactionId,
  GameState,
  SupplyState,
  Tile,
  TileId,
  Unit,
} from '../types';

export const SUPPLY_BUDGET = 16;
const HUB_RECHARGE = 12; // hubs partially recharge the network

function tileSupplyCost(tile: Tile): number {
  const base = TERRAIN_DEFS[tile.terrain].supplyCost;
  if (tile.rail) return 0.5;
  if (tile.road) return 0.75;
  return base;
}

export function computeFactionSupply(state: GameState, faction: FactionId): Record<TileId, number> {
  const levels: Record<TileId, number> = {};
  // Priority queue (small map, simple array-based is fine).
  const open: Array<{ id: TileId; budget: number }> = [];

  for (const city of Object.values(state.cities)) {
    if (!city.supplySource) continue;
    const tile = state.tiles[city.tile];
    if (!tile || tile.controller !== faction) continue;
    open.push({ id: city.tile, budget: SUPPLY_BUDGET });
    levels[city.tile] = SUPPLY_BUDGET;
  }

  while (open.length > 0) {
    // Extract max budget node.
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].budget > open[bestIdx].budget) bestIdx = i;
    }
    const { id, budget } = open.splice(bestIdx, 1)[0];
    if ((levels[id] ?? -1) > budget) continue;

    for (const nId of neighborIds(id)) {
      const nTile = state.tiles[nId];
      if (!nTile || nTile.controller !== faction) continue;
      if (nTile.terrain === 'water') continue;
      let remaining = budget - tileSupplyCost(nTile);
      if (remaining <= 0) continue;
      // Friendly hubs refresh the network partially.
      const city = nTile.cityId ? state.cities[nTile.cityId] : undefined;
      if (city?.supplyHub) remaining = Math.max(remaining, HUB_RECHARGE);
      if (remaining > (levels[nId] ?? 0)) {
        levels[nId] = remaining;
        open.push({ id: nId, budget: remaining });
      }
    }
  }
  return levels;
}

export function supplyStateFromLevel(level: number | undefined): SupplyState {
  if (level === undefined || level <= 0) return 'isolated';
  if (level >= 10) return 'full';
  if (level >= 6) return 'supplied';
  if (level >= 3) return 'strained';
  return 'low';
}

// Recompute supply levels for both factions and update every unit's state.
// Mutates the given (draft) state.
export function resolveSupply(state: GameState): void {
  state.supplyLevels = {
    UA: computeFactionSupply(state, 'UA'),
    RU: computeFactionSupply(state, 'RU'),
  };

  for (const unit of Object.values(state.units)) {
    const level = state.supplyLevels[unit.faction][unit.tile];
    let s = supplyStateFromLevel(level);
    // Active emergency resupply effect overrides a bad state.
    const boosted = state.effects.some(
      (e) => e.kind === 'resupply' && e.unitId === unit.id && e.turnsLeft > 0,
    );
    if (boosted && (s === 'isolated' || s === 'low' || s === 'strained')) s = 'supplied';
    unit.supply = s;
    if (s === 'isolated') {
      unit.isolatedTurns += 1;
    } else {
      unit.isolatedTurns = 0;
    }
  }
}

// Sustained isolation causes attrition: applied during turn processing.
export function applyIsolationAttrition(state: GameState, faction: FactionId): string[] {
  const messages: string[] = [];
  for (const unit of Object.values(state.units)) {
    if (unit.faction !== faction) continue;
    if (unit.supply !== 'isolated' || unit.isolatedTurns < 2) continue;
    const bite = Math.min(4 + unit.isolatedTurns * 2, 14);
    unit.strength = Math.max(0, unit.strength - bite);
    unit.morale = Math.max(0, unit.morale - 6);
    unit.readiness = Math.max(0, unit.readiness - 5);
    messages.push(`${unit.name} is cut off and losing strength (${Math.round(unit.strength)}%).`);
  }
  return messages;
}

export function unitSupplyFactor(unit: Unit): { attack: number; movementMod: number; recovery: number } {
  switch (unit.supply) {
    case 'full': return { attack: 1.0, movementMod: 1.0, recovery: 1.0 };
    case 'supplied': return { attack: 0.95, movementMod: 1.0, recovery: 0.9 };
    case 'strained': return { attack: 0.85, movementMod: 0.85, recovery: 0.7 };
    case 'low': return { attack: 0.7, movementMod: 0.6, recovery: 0.4 };
    case 'isolated': return { attack: 0.5, movementMod: 0.5, recovery: 0.0 };
  }
}
