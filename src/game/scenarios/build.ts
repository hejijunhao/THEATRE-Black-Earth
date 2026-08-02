// Compiles the scenario definition (ASCII layers + feature lists) into an
// initial GameState. Validates adjacency of rivers, bridges and corridors so
// authoring mistakes fail loudly at startup rather than corrupting gameplay.

import { UNIT_DEFS } from '../data/defs';
import { neighborIds } from '../hex';
import { hashSeed } from '../rng';
import { recomputeFog } from '../rules/fog';
import { computeTurnMovement } from '../rules/movement';
import { resolveSupply } from '../rules/supply';
import { rollWeather } from '../rules/weather';
import {
  City,
  FactionId,
  GameState,
  SAVE_VERSION,
  TerrainType,
  Tile,
  TileId,
  Unit,
  edgeKey,
  tileId,
} from '../types';
import {
  BRIDGES,
  CITIES,
  CONTROL_ROWS,
  CORRIDORS,
  FACTION_SETUP,
  RIVERS,
  SCENARIO_META,
  TERRAIN_ROWS,
  UNITS,
} from './blackEarth2025';

const TERRAIN_CHARS: Record<string, TerrainType | null> = {
  p: 'plains',
  f: 'forest',
  m: 'marsh',
  w: 'water',
  '.': null,
};

function assertAdjacent(a: [number, number], b: [number, number], context: string): void {
  const aId = tileId(a[0], a[1]);
  const bId = tileId(b[0], b[1]);
  if (!neighborIds(aId).includes(bId)) {
    throw new Error(`Scenario error (${context}): ${aId} and ${bId} are not adjacent`);
  }
}

// Small deterministic per-tile jitter for elevation/visual variation.
function tileNoise(x: number, y: number, salt: number): number {
  const h = hashSeed(`${x}:${y}:${salt}`);
  return (h % 1000) / 1000;
}

export function buildInitialState(playerFaction: FactionId, seed: number): GameState {
  const tiles: Record<TileId, Tile> = {};

  // ---- tiles from ASCII layers
  TERRAIN_ROWS.forEach((row, y) => {
    if (row.length !== 26) throw new Error(`Terrain row ${y} has length ${row.length}, expected 26`);
    for (let x = 0; x < row.length; x++) {
      const terrain = TERRAIN_CHARS[row[x]];
      if (terrain === null || terrain === undefined) continue;
      const controlChar = CONTROL_ROWS[y]?.[x] ?? '.';
      const controller: FactionId | null =
        controlChar === 'u' ? 'UA' : controlChar === 'r' ? 'RU' : null;
      if (terrain !== 'water' && controller === null) {
        throw new Error(`Tile ${x},${y} is land but has no controller`);
      }
      // Elevation: gentle noise, raised in the Carpathian west and south Crimea.
      let elevation = 0.15 + tileNoise(x, y, 7) * 0.25;
      if (x <= 2 && y >= 4 && y <= 8) elevation += 0.45; // Carpathian foothills
      if (y >= 15) elevation += 0.2; // Crimean uplands
      if (terrain === 'forest') elevation += 0.08;
      if (terrain === 'water') elevation = 0;
      tiles[tileId(x, y)] = {
        id: tileId(x, y),
        x,
        y,
        terrain,
        controller: terrain === 'water' ? null : controller,
        originalController: terrain === 'water' ? null : controller,
        road: false,
        rail: false,
        fortified: false,
        elevation,
      };
    }
  });

  // ---- cities
  const cities: Record<string, City> = {};
  for (const c of CITIES) {
    const id = tileId(c.x, c.y);
    const tile = tiles[id];
    if (!tile) throw new Error(`City ${c.id} placed on missing tile ${id}`);
    if (tile.terrain === 'water') throw new Error(`City ${c.id} placed on water`);
    cities[c.id] = {
      id: c.id,
      name: c.name,
      tile: id,
      size: c.size,
      vp: c.vp,
      supplyHub: c.hub,
      supplySource: c.source,
      decisiveFor: c.decisiveFor,
    };
    tile.cityId = c.id;
    if (c.size === 'capital' || c.size === 'major') tile.terrain = 'urban';
  }

  // ---- rivers from bank paths
  const riverEdges = new Set<string>();
  for (const river of RIVERS) {
    // Both banks must be hex-adjacent chains, or the edge set has holes.
    for (const bank of [river.bankA, river.bankB]) {
      for (let i = 1; i < bank.length; i++) {
        assertAdjacent(bank[i - 1], bank[i], `river ${river.name} bank`);
      }
    }
    const bankASet = river.bankA.map(([x, y]) => tileId(x, y));
    const bankBSet = new Set(river.bankB.map(([x, y]) => tileId(x, y)));
    for (const a of bankASet) {
      if (!tiles[a]) throw new Error(`River ${river.name}: bank tile ${a} missing`);
      for (const n of neighborIds(a)) {
        if (bankBSet.has(n)) riverEdges.add(edgeKey(a, n));
      }
    }
    for (const b of bankBSet) {
      if (!tiles[b]) throw new Error(`River ${river.name}: bank tile ${b} missing`);
    }
  }

  const bridgeEdges = new Set<string>();
  for (const [a, b] of BRIDGES) {
    assertAdjacent(a, b, 'bridge');
    const key = edgeKey(tileId(a[0], a[1]), tileId(b[0], b[1]));
    if (!riverEdges.has(key)) throw new Error(`Bridge ${key} is not on a river edge`);
    bridgeEdges.add(key);
  }

  // ---- corridors (roads / rail)
  for (const corridor of CORRIDORS) {
    for (let i = 0; i < corridor.path.length; i++) {
      const [x, y] = corridor.path[i];
      const id = tileId(x, y);
      const tile = tiles[id];
      if (!tile) throw new Error(`Corridor tile ${id} missing`);
      tile.road = true;
      if (corridor.rail) tile.rail = true;
      if (i > 0) assertAdjacent(corridor.path[i - 1], corridor.path[i], 'corridor');
    }
  }

  // ---- units
  const units: Record<string, Unit> = {};
  for (const u of UNITS) {
    const id = tileId(u.x, u.y);
    const tile = tiles[id];
    if (!tile) throw new Error(`Unit ${u.id} placed on missing tile ${id}`);
    if (tile.controller !== u.faction) {
      throw new Error(`Unit ${u.id} (${u.faction}) placed on tile controlled by ${tile.controller}`);
    }
    if (Object.values(units).some((other) => other.tile === id)) {
      throw new Error(`Two units share tile ${id}`);
    }
    units[u.id] = {
      id: u.id,
      faction: u.faction,
      type: u.type,
      name: u.name,
      tile: id,
      strength: u.strength ?? 90 + Math.floor(tileNoise(u.x, u.y, 13) * 10),
      readiness: 85,
      morale: 80,
      supply: 'supplied',
      isolatedTurns: 0,
      movement: UNIT_DEFS[u.type].movement,
      entrenchment: u.entrenchment ?? 0,
      experience: 0,
      reinforcing: false,
      disorganized: 0,
      hasAttacked: false,
    };
  }

  // ---- faction states
  const factionState = (fid: FactionId) => {
    const s = FACTION_SETUP[fid];
    return {
      id: fid,
      name: fid === 'UA' ? 'Ukraine' : 'Russia',
      manpower: s.manpower,
      equipment: s.equipment,
      command: s.command,
      commandMax: s.commandMax,
      commandRegen: s.commandRegen,
      manpowerIncome: s.manpowerIncome,
      equipmentIncome: s.equipmentIncome,
      warSupport: s.warSupport,
      score: 0,
      opCooldowns: {},
      reserves: s.reserves.map((r, i) => ({ id: `${fid}-res-${i}`, ...r })),
    };
  };

  const state: GameState = {
    version: SAVE_VERSION,
    scenario: SCENARIO_META,
    seed,
    rngState: seed >>> 0,
    turn: 1,
    phase: 'player',
    playerFaction,
    weather: 'mud',
    tiles,
    cities,
    riverEdges: [...riverEdges],
    bridgeEdges: [...bridgeEdges],
    units,
    factions: { UA: factionState('UA'), RU: factionState('RU') },
    intel: {},
    visibleTiles: [],
    supplyLevels: { UA: {}, RU: {} },
    aiQueue: [],
    aiIndex: 0,
    effects: [],
    firedEvents: [],
    pendingEvent: null,
    notifications: [],
    notificationSeq: 0,
    result: null,
    tutorialStep: 0,
    unitSeq: 1000,
  };

  state.weather = rollWeather(state);
  resolveSupply(state);
  // Movement pools reflect initial supply.
  for (const unit of Object.values(state.units)) {
    unit.movement = computeTurnMovement(state, unit, UNIT_DEFS[unit.type].movement);
  }
  recomputeFog(state);
  return state;
}
