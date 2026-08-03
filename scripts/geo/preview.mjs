// Visual inspection of the emitted scenario: ASCII maps of terrain, control,
// rivers/bridges/corridors and unit positions. Run after build-scenario.mjs:
//   node scripts/geo/preview.mjs

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const scenarioPath = fileURLToPath(
  new URL('../../src/game/scenarios/blackEarth2025.ts', import.meta.url),
);
const src = fs.readFileSync(scenarioPath, 'utf8');

function extractRows(name) {
  const m = src.match(new RegExp(`export const ${name}[^=]*= \\[([^\\]]+)\\];`, 's'));
  return m[1].match(/'([^']*)'/g).map((s) => s.slice(1, -1));
}
function extractPairs(re) {
  const out = [];
  for (const m of src.matchAll(re)) out.push(m);
  return out;
}

const terrain = extractRows('TERRAIN_ROWS');
const control = extractRows('CONTROL_ROWS');

// Rivers: mark bank tiles.
const riverTiles = new Set();
for (const m of src.matchAll(/bank[AB]: \[([^\]]+(?:\], \[[^\]]+)*)\]/g)) {
  for (const p of m[1].matchAll(/\[(\d+), (\d+)\]/g)) riverTiles.add(`${p[1]},${p[2]}`);
}
// Cities.
const cityAt = new Map();
for (const m of src.matchAll(/\{ id: '([a-z]+)'[^}]*x: (\d+), y: (\d+)[^}]*size: '(\w+)'/g)) {
  cityAt.set(`${m[2]},${m[3]}`, { id: m[1], size: m[4] });
}
// Units.
const unitAt = new Map();
for (const m of src.matchAll(/\{ id: '([ur]\d+)', faction: '(\w+)'[^}]*x: (\d+), y: (\d+)/g)) {
  unitAt.set(`${m[3]},${m[4]}`, { id: m[1], faction: m[2] });
}

const W = terrain[0].length;
const H = terrain.length;

function printMap(title, cellFn) {
  console.log(`\n=== ${title} ===`);
  const header = '    ' + Array.from({ length: W }, (_, x) => (x % 10 === 0 ? String(x / 10) : ' ')).join(' ');
  console.log(header);
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) row += cellFn(x, y) + ' ';
    // odd-r shift for visual accuracy
    const indent = y % 2 === 1 ? '  ' : ' ';
    console.log(String(y).padStart(2) + indent + row);
  }
}

printMap('terrain + rivers (R) + cities (letter)', (x, y) => {
  const key = `${x},${y}`;
  const c = cityAt.get(key);
  if (c) return c.size === 'capital' ? 'K' : c.size === 'major' ? 'C' : 'c';
  if (riverTiles.has(key)) return 'R';
  const t = terrain[y][x];
  return t === 'p' ? '·' : t;
});

printMap('control + units', (x, y) => {
  const key = `${x},${y}`;
  const u = unitAt.get(key);
  if (u) return u.faction === 'UA' ? 'U' : 'X';
  const c = control[y][x];
  return c === 'u' ? '.' : c === 'r' ? 'r' : ' ';
});
