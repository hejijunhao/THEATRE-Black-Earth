// Code generation: writes src/game/scenarios/blackEarth2025.ts (same module
// shape as the hand-authored v1 file) and src/map/data/terrainData.ts (the
// supersampled heightfield + per-hex land-cover fractions for the Phase B
// render surface). Committed output; the game has no runtime GIS dependency.

import fs from 'node:fs';
import path from 'node:path';
import { GRID_W, GRID_H, SOURCES, RETRIEVED, ELEV_MAX_M } from './config.mjs';
import { WORLD_SPAN_X, WORLD_SPAN_Z, lonLatFromWorld } from './hexlib.mjs';
import { elevationAt } from './data.mjs';
import { elevChar } from './terrain.mjs';
import { SCENARIO_META, FACTION_SETUP } from './design.mjs';

import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

function provenanceHeader() {
  return `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/geo/build-scenario.mjs
//
// Scenario: "Black Earth, Spring 2025". Terrain, hydrography, infrastructure
// and city locations derive from open geospatial data, quantised to a
// ${GRID_W}×${GRID_H} odd-r hex grid (~26 km hexes). The front line, order of
// battle, faction economies and all balance numbers are DESIGNED — this is
// not a reproduction of live battlefield conditions.
//
// Data sources (retrieved ${RETRIEVED}):
//   Elevation:  ${SOURCES.dem.name}
//               ${SOURCES.dem.license}
//   Land cover: ${SOURCES.landcover.name}
//               ${SOURCES.landcover.license}
//   Vectors:    ${SOURCES.naturalEarth.name}
//               ${SOURCES.naturalEarth.license}
`;
}

function rowsLiteral(rows) {
  return rows.map((r) => `  '${r}',`).join('\n');
}

function pairList(pairs) {
  return pairs.map(([x, y]) => `[${x}, ${y}]`).join(', ');
}

function riverLiteral(r) {
  return `  {
    name: '${r.name.replace(/'/g, "\\'")}',
    bankA: [${pairList(r.bankA)}],
    bankB: [${pairList(r.bankB)}],
  },`;
}

function cityLiteral(c) {
  const parts = [
    `id: '${c.id}'`,
    `name: '${c.name.replace(/'/g, "\\'")}'`,
    `x: ${c.x}`,
    `y: ${c.y}`,
    `size: '${c.size}'`,
    `vp: ${c.vp}`,
    `hub: ${c.hub}`,
  ];
  if (c.source) parts.push('source: true');
  if (c.decisiveFor) parts.push(`decisiveFor: '${c.decisiveFor}'`);
  if (c.landmark) parts.push(`landmark: '${c.landmark}'`);
  return `  { ${parts.join(', ')} },`;
}

function unitLiteral(u) {
  const parts = [
    `id: '${u.id}'`,
    `faction: '${u.faction}'`,
    `type: '${u.type}'`,
    `name: '${u.name.replace(/'/g, "\\'")}'`,
    `x: ${u.x}`,
    `y: ${u.y}`,
  ];
  if (u.strength !== undefined) parts.push(`strength: ${u.strength}`);
  if (u.entrenchment !== undefined) parts.push(`entrenchment: ${u.entrenchment}`);
  return `  { ${parts.join(', ')} },`;
}

function factionLiteral(f) {
  const s = FACTION_SETUP[f];
  const reserves = s.reserves
    .map((r) => `{ type: '${r.type}', name: '${r.name.replace(/'/g, "\\'")}', strength: ${r.strength} }`)
    .join(', ');
  return `  ${f}: {
    manpower: ${s.manpower},
    equipment: ${s.equipment},
    command: ${s.command},
    commandMax: ${s.commandMax},
    commandRegen: ${s.commandRegen},
    manpowerIncome: ${s.manpowerIncome},
    equipmentIncome: ${s.equipmentIncome},
    warSupport: ${s.warSupport},
    reserves: [${reserves}],
  },`;
}

export function emitScenario({ terrainRows, controlRows, elevationRows, rivers, bridges, cities, corridors, units }) {
  const corridorLines = corridors
    .map((c) => `  { rail: ${c.rail}, path: [${pairList(c.path)}] },`)
    .join('\n');

  const content = `${provenanceHeader()}
import { CitySize, FactionId, ScenarioMeta, UnitType } from '../types';

export const MAP_W = ${GRID_W};
export const MAP_H = ${GRID_H};

// '.' off-map · 'w' sea · 'p' plains · 'f' forest · 'm' marsh · 'u' urban
export const TERRAIN_ROWS: string[] = [
${rowsLiteral(terrainRows)}
];

export const CONTROL_ROWS: string[] = [
${rowsLiteral(controlRows)}
];

// Per-hex mean elevation, base-36 (0..z ~ 0..1 over a sqrt scale, max ${ELEV_MAX_M} m).
export const ELEVATION_ROWS: string[] = [
${rowsLiteral(elevationRows)}
];

// Rivers live on hex EDGES, generated from two bank chains. Each bank is a
// hex-adjacent "ladder" BY CONSTRUCTION (vertex-walk tracing); the builder
// re-validates every step. See docs/overview.md §6.3.
export interface RiverDef {
  name: string;
  bankA: Array<[number, number]>;
  bankB: Array<[number, number]>;
}

export const RIVERS: RiverDef[] = [
${rivers.map(riverLiteral).join('\n')}
];

// Bridge / crossing edges: derived — corridor steps that cross a river edge.
export const BRIDGES: Array<[[number, number], [number, number]]> = [
${bridges.map(([a, b]) => `  [[${a[0]}, ${a[1]}], [${b[0]}, ${b[1]}]],`).join('\n')}
];

export interface CityDef {
  id: string;
  name: string;
  x: number;
  y: number;
  size: CitySize;
  vp: number;
  hub: boolean;
  source?: boolean;
  decisiveFor?: FactionId;
  landmark?: string;
}

export const CITIES: CityDef[] = [
${cities.map(cityLiteral).join('\n')}
];

export interface CorridorDef {
  rail: boolean;
  path: Array<[number, number]>;
}

export const CORRIDORS: CorridorDef[] = [
${corridorLines}
];

export interface UnitPlacement {
  id: string;
  faction: FactionId;
  type: UnitType;
  name: string;
  x: number;
  y: number;
  strength?: number;
  entrenchment?: number;
}

export const UNITS: UnitPlacement[] = [
${units.map(unitLiteral).join('\n')}
];

export interface FactionSetup {
  manpower: number;
  equipment: number;
  command: number;
  commandMax: number;
  commandRegen: number;
  manpowerIncome: number;
  equipmentIncome: number;
  warSupport: number;
  reserves: Array<{ type: UnitType; name: string; strength: number }>;
}

export const FACTION_SETUP: Record<FactionId, FactionSetup> = {
${factionLiteral('UA')}
${factionLiteral('RU')}
};

export const SCENARIO_META: ScenarioMeta = {
  id: '${SCENARIO_META.id}',
  name: '${SCENARIO_META.name}',
  description:
    '${SCENARIO_META.description.replace(/'/g, "\\'")}',
  dateLabel: '${SCENARIO_META.dateLabel}',
  startDate: { year: ${SCENARIO_META.startDate.year}, month: ${SCENARIO_META.startDate.month}, day: ${SCENARIO_META.startDate.day} },
  maxTurns: ${SCENARIO_META.maxTurns},
  decisive: {
    UA: [${SCENARIO_META.decisive.UA.map((s) => `'${s}'`).join(', ')}],
    RU: [${SCENARIO_META.decisive.RU.map((s) => `'${s}'`).join(', ')}],
  },
};
`;
  const outPath = path.join(ROOT, 'src/game/scenarios/blackEarth2025.ts');
  fs.writeFileSync(outPath, content);
  return outPath;
}

// ---------------------------------------------------- render terrain data

export function emitTerrainData({ cells, riverCourses }) {
  const HEIGHT_W = 512;
  const HEIGHT_H = Math.round((HEIGHT_W * WORLD_SPAN_Z) / WORLD_SPAN_X);
  const HEIGHT_MAX_M = 1530; // metres at byte 255 (6 m / step)

  const heights = new Uint8Array(HEIGHT_W * HEIGHT_H);
  for (let j = 0; j < HEIGHT_H; j++) {
    for (let i = 0; i < HEIGHT_W; i++) {
      const wx = ((i + 0.5) / HEIGHT_W) * WORLD_SPAN_X;
      const wz = ((j + 0.5) / HEIGHT_H) * WORLD_SPAN_Z;
      const { lon, lat } = lonLatFromWorld(wx, wz);
      const m = Math.max(0, elevationAt(lon, lat));
      heights[j * HEIGHT_W + i] = Math.min(255, Math.round((m / HEIGHT_MAX_M) * 255));
    }
  }

  // Per-hex land-cover fractions, 5 bytes each: forest, urban, crop, water, wetland.
  const fracs = new Uint8Array(GRID_W * GRID_H * 5);
  for (const c of cells) {
    const o = (c.y * GRID_W + c.x) * 5;
    fracs[o] = Math.round(c.frac.tree * 255);
    fracs[o + 1] = Math.round(c.frac.built * 255);
    fracs[o + 2] = Math.round(c.frac.crop * 255);
    fracs[o + 3] = Math.round(c.frac.water * 255);
    fracs[o + 4] = Math.round(c.frac.wetland * 255);
  }

  const riverLines = riverCourses
    .map(
      (r) =>
        `  { name: '${r.name.replace(/'/g, "\\'")}', width: ${r.width}, points: [${r.points
          .map(([x, z]) => `[${x.toFixed(2)}, ${z.toFixed(2)}]`)
          .join(', ')}] },`,
    )
    .join('\n');

  const content = `${provenanceHeader()}
// Render-layer terrain data (Phase B consumes this; the simulation does not).
// Heights: row-major Uint8, ${HEIGHT_W}×${HEIGHT_H} over the world rectangle
// [0..${WORLD_SPAN_X.toFixed(3)}] × [0..${WORLD_SPAN_Z.toFixed(3)}]; metres = byte / 255 * ${HEIGHT_MAX_M}.

export const HEIGHT_W = ${HEIGHT_W};
export const HEIGHT_H = ${HEIGHT_H};
export const HEIGHT_MAX_M = ${HEIGHT_MAX_M};
export const WORLD_W = ${WORLD_SPAN_X};
export const WORLD_H = ${WORLD_SPAN_Z};

export const HEIGHT_B64 =
  '${Buffer.from(heights).toString('base64')}';

// Per-hex land-cover fractions (5 bytes per hex: forest, urban, crop, water,
// wetland; 0..255), row-major over the ${GRID_W}×${GRID_H} grid.
export const HEX_FRACS_B64 =
  '${Buffer.from(fracs).toString('base64')}';

// Real river courses in world coordinates (for rendering; the rules use the
// hex-edge river set from the scenario module).
export const RIVER_COURSES: Array<{ name: string; width: number; points: Array<[number, number]> }> = [
${riverLines}
];

// Dependency-free base64 decode (works in browser and Node test runs alike).
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i + 1 < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : -1;
    const d = i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : -1;
    out[o++] = (a << 2) | (b >> 4);
    if (c >= 0) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[o++] = ((c & 3) << 6) | d;
  }
  return out;
}
`;
  const dir = path.join(ROOT, 'src/map/data');
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'terrainData.ts');
  fs.writeFileSync(outPath, content);
  return outPath;
}
