// Geodata pipeline orchestrator (docs/plans/v2-vision.md §3).
// Usage: node scripts/geo/build-scenario.mjs
//
// Downloads are cached under scripts/geo/cache/ (gitignored); the emitted
// scenario module and render terrain data are committed. build.ts remains
// the acceptance test: it throws on any invariant violation at startup.

import { GRID_W, GRID_H, RIVER_NAMES, RIVER_MIN_EDGES } from './config.mjs';
import { kmPerWorldUnit, isAdjacent, worldFromLonLat, lonLatOfHex } from './hexlib.mjs';
import { prefetchWorldCover, loadNaturalEarth, flattenLines, bboxOverlaps } from './data.mjs';
import { classifyTiles, floodSea, assignTerrain, trimSeaBand, assignControl, elevChar } from './terrain.mjs';
import { extractRivers, validateAndDeriveEdges } from './rivers.mjs';
import { extractCorridors, deriveBridges, corridorStats } from './corridors.mjs';
import { buildCities, markRailHubs, assertRequiredCities } from './cities.mjs';
import { placeUnits } from './units.mjs';
import { emitScenario, emitTerrainData } from './emit.mjs';

const t0 = performance.now();
const log = (msg) => console.log(`[${((performance.now() - t0) / 1000).toFixed(1)}s] ${msg}`);

const { kmX, kmZ } = kmPerWorldUnit();
log(`grid ${GRID_W}×${GRID_H}, hex ≈ ${(kmX * Math.sqrt(3)).toFixed(1)} km E-W × ${(kmZ * 1.5).toFixed(1)} km row spacing`);

log('prefetching WorldCover class grids…');
await prefetchWorldCover();

log('classifying tiles…');
const cells = classifyTiles();
const sea = floodSea(cells);
assignTerrain(cells, sea);
trimSeaBand(cells, sea);
assignControl(cells);

const counts = {};
for (const c of cells) counts[c.terrain ?? '.'] = (counts[c.terrain ?? '.'] || 0) + 1;
log(`terrain: ${JSON.stringify(counts)}`);

log('tracing rivers…');
const rivers = extractRivers(RIVER_NAMES, RIVER_MIN_EDGES, cells);
const riverEdgeSet = validateAndDeriveEdges(rivers, cells, isAdjacent);
log(`rivers: ${rivers.map((r) => `${r.name}(${r.bankA.length})`).join(', ')} — ${riverEdgeSet.size} edges`);

log('extracting corridors…');
const corridors = extractCorridors(cells);
const stats = corridorStats(corridors, cells);
log(`corridors: ${corridors.length} chains; road tiles ${stats.roadTiles}/${stats.landTiles} (${((stats.roadTiles / stats.landTiles) * 100).toFixed(0)}%), rail ${stats.railTiles} (${((stats.railTiles / stats.landTiles) * 100).toFixed(0)}%)`);

const bridges = deriveBridges(corridors, riverEdgeSet);
log(`bridges: ${bridges.length} corridor crossings`);

log('building city roster…');
const cities = buildCities(cells);
markRailHubs(cities, corridors);
assertRequiredCities(cities);

// Control sanity for key cities + VP totals per side.
const cellAt = (x, y) => cells[y * GRID_W + x];
let vpUA = 0;
let vpRU = 0;
for (const c of cities) {
  const ctl = cellAt(c.x, c.y).controller;
  if (ctl === 'u') vpUA += c.vp;
  else if (ctl === 'r') vpRU += c.vp;
}
log(`cities: ${cities.length}; starting VP UA ${vpUA} / RU ${vpRU}`);
const expect = { kyiv: 'u', kharkiv: 'u', kherson: 'u', donetsk: 'r', sevastopol: 'r', melitopol: 'r', mariupol: 'r', luhansk: 'r', zaporizhzhia: 'u', dnipro: 'u' };
for (const [id, want] of Object.entries(expect)) {
  const city = cities.find((c) => c.id === id);
  if (!city) throw new Error(`expected city ${id} missing`);
  const got = cellAt(city.x, city.y).controller;
  if (got !== want) {
    throw new Error(`city ${id} at ${city.x},${city.y}: controller ${got}, designed front expects ${want}`);
  }
}
log('key-city control verified against the designed front');

log('placing formations…');
const units = placeUnits(cells);
const ua = units.filter((u) => u.faction === 'UA').length;
log(`units: ${ua} UA / ${units.length - ua} RU`);

// ---- compose ASCII layers
const terrainRows = [];
const controlRows = [];
const elevationRows = [];
for (let y = 0; y < GRID_H; y++) {
  let tr = '';
  let cr = '';
  let er = '';
  for (let x = 0; x < GRID_W; x++) {
    const c = cellAt(x, y);
    tr += c.terrain ?? '.';
    cr += c.terrain !== null && c.terrain !== 'w' ? c.controller : '.';
    er += c.terrain === null ? '0' : elevChar(c.elevM);
  }
  terrainRows.push(tr);
  controlRows.push(cr);
  elevationRows.push(er);
}

// Real river courses (world coords) for the render layer.
const { rivers: neRivers } = loadNaturalEarth();
const riverCourses = [];
for (const name of RIVER_NAMES) {
  const feats = neRivers.features.filter(
    (f) => f.geometry && (f.properties.name === name || f.properties.name_en === name),
  );
  for (const f of feats) {
    for (const line of flattenLines(f.geometry)) {
      if (!bboxOverlaps(line)) continue;
      const pts = line
        .filter(([lon, lat], i) => i % 2 === 0 || i === line.length - 1)
        .map(([lon, lat]) => {
          const { wx, wz } = worldFromLonLat(lon, lat);
          return [wx, wz];
        });
      if (pts.length >= 2) {
        riverCourses.push({ name, width: name === 'Dnipro' ? 1.0 : 0.4, points: pts });
      }
    }
  }
}

log('emitting…');
const scenarioPath = emitScenario({ terrainRows, controlRows, elevationRows, rivers, bridges, cities, corridors, units });
const terrainPath = emitTerrainData({ cells, riverCourses });
log(`wrote ${scenarioPath}`);
log(`wrote ${terrainPath}`);

// ---- report: city hex table for design review
console.log('\ncity assignments:');
for (const c of [...cities].sort((a, b) => b.vp - a.vp)) {
  const ctl = cellAt(c.x, c.y).controller;
  const { lon, lat } = lonLatOfHex(c.x, c.y);
  console.log(
    `  ${c.id.padEnd(18)} ${String(c.x).padStart(2)},${String(c.y).padStart(2)} ${ctl} vp${String(c.vp).padStart(2)} ${c.size}${c.hub ? ' hub' : ''}${c.source ? ' source' : ''}${c.decisiveFor ? ' decisive:' + c.decisiveFor : ''} (${lon.toFixed(2)}E ${lat.toFixed(2)}N)`,
  );
}
log('done');
