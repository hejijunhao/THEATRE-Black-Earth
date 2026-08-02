// Fog of war: terrain, cities and territorial control are always known.
// Enemy formations are only current inside observation range; elsewhere the
// player keeps a decaying last-known intelligence record (a "ghost").

import { UNIT_DEFS, WEATHER_DEFS } from '../data/defs';
import { tilesWithin } from '../hex';
import { GameState, IntelRecord, TileId } from '../types';

export function computeVisibleTiles(state: GameState): Set<TileId> {
  const visible = new Set<TileId>();
  const player = state.playerFaction;
  const reconPenalty = WEATHER_DEFS[state.weather].reconPenalty;

  for (const unit of Object.values(state.units)) {
    if (unit.faction !== player) continue;
    const vision = Math.max(1, UNIT_DEFS[unit.type].vision - reconPenalty);
    for (const t of tilesWithin(unit.tile, vision)) {
      if (state.tiles[t]) visible.add(t);
    }
  }
  for (const city of Object.values(state.cities)) {
    const tile = state.tiles[city.tile];
    if (tile?.controller === player) {
      for (const t of tilesWithin(city.tile, 1)) {
        if (state.tiles[t]) visible.add(t);
      }
    }
  }
  // Recon sweep operations reveal their area.
  for (const e of state.effects) {
    if (e.kind === 'recon' && e.faction === player && e.tile && e.turnsLeft > 0) {
      for (const t of tilesWithin(e.tile, 2)) {
        if (state.tiles[t]) visible.add(t);
      }
    }
  }
  return visible;
}

// Refresh visibility and the intel picture. Mutates draft state.
export function recomputeFog(state: GameState): void {
  const visible = computeVisibleTiles(state);
  state.visibleTiles = [...visible];

  const enemy = state.playerFaction === 'UA' ? 'RU' : 'UA';
  for (const unit of Object.values(state.units)) {
    if (unit.faction !== enemy) continue;
    if (visible.has(unit.tile)) {
      const rec: IntelRecord = {
        unitId: unit.id,
        level: 4,
        tile: unit.tile,
        seenTurn: state.turn,
        type: unit.type,
        strength: unit.strength,
      };
      state.intel[unit.id] = rec;
    }
    // Ghosts persist; decay is applied at turn start.
  }
  // Drop intel for destroyed units.
  for (const id of Object.keys(state.intel)) {
    if (!state.units[id]) delete state.intel[id];
  }
}

// Called at the start of each player turn: old sightings become vaguer.
export function decayIntel(state: GameState): void {
  for (const rec of Object.values(state.intel)) {
    const age = state.turn - rec.seenTurn;
    if (age <= 0) continue;
    if (age >= 6) {
      delete state.intel[rec.unitId];
    } else if (age >= 4) {
      rec.level = 1;
      rec.strength = undefined;
      rec.type = undefined;
    } else if (age >= 2) {
      rec.level = Math.min(rec.level, 2) as IntelRecord['level'];
      rec.strength = undefined;
    } else {
      rec.level = Math.min(rec.level, 3) as IntelRecord['level'];
    }
  }
}
