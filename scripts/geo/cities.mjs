// City roster: Natural Earth populated places above the population threshold
// + designed strategic towns + axis pseudo-cities. Population bands set
// size/vp; designed overrides adjust the strategically weighted ones.

import { GRID_W, CITY_POP_MIN } from './config.mjs';
import { hexFromLonLat, neighborCoords, inGrid, hexDistance } from './hexlib.mjs';
import { loadNaturalEarth, inTheatreLand } from './data.mjs';
import { NAME_FIXES, STRATEGIC_TOWNS, AXIS_CITIES, CITY_OVERRIDES, cityBand } from './design.mjs';

function slug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Snap to the nearest usable land hex (cities on sea-classified coastal
// hexes drift inland by up to 2 hexes; beyond that we drop with a warning).
function snapToLand(h, cells) {
  const usable = (c) => inGrid(c.x, c.y) && (() => {
    const t = cells[c.y * GRID_W + c.x].terrain;
    return t !== null && t !== 'w';
  })();
  if (usable(h)) return h;
  let frontier = [h];
  const seen = new Set([`${h.x},${h.y}`]);
  for (let d = 0; d < 2; d++) {
    const next = [];
    for (const cur of frontier) {
      for (const nb of neighborCoords(cur.x, cur.y)) {
        const key = `${nb.x},${nb.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (usable(nb)) return nb;
        next.push(nb);
      }
    }
    frontier = next;
  }
  return null;
}

export function buildCities(cells) {
  const { places } = loadNaturalEarth();
  const candidates = [];

  for (const f of places.features) {
    const p = f.properties;
    if (!f.geometry) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (!(p.pop_max >= CITY_POP_MIN)) continue;
    const h = hexFromLonLat(lon, lat);
    if (!inGrid(h.x, h.y)) continue;
    // The city itself must be inside the theatre (Tiraspol sits in Moldova
    // but its hex centre falls inside Ukraine — filter by the place's own
    // coordinates, not its hex).
    if (!inTheatreLand(lon, lat)) continue;
    const name = NAME_FIXES[p.name] ?? p.name;
    candidates.push({ id: slug(name), name, lon, lat, pop: p.pop_max, kind: 'auto' });
  }

  for (const t of STRATEGIC_TOWNS) {
    candidates.push({ ...t, pop: 0, kind: 'town' });
  }
  for (const a of AXIS_CITIES) {
    candidates.push({ ...a, pop: 0, kind: 'axis' });
  }

  // Bigger cities claim hexes first; smaller ones on the same hex are dropped.
  candidates.sort((a, b) => b.pop - a.pop);
  const byHex = new Map();
  const byId = new Map();
  const out = [];
  for (const c of candidates) {
    if (byId.has(c.id)) continue;
    const raw = hexFromLonLat(c.lon, c.lat);
    const h = snapToLand(raw, cells);
    if (!h) {
      console.warn(`city ${c.name}: no land hex within reach, dropped`);
      continue;
    }
    const hexKey = `${h.x},${h.y}`;
    if (byHex.has(hexKey)) continue; // merged into the bigger city
    const band = c.kind === 'auto' ? cityBand(c.pop) : { size: 'town', vp: c.vp ?? 3 };
    const over = CITY_OVERRIDES[c.id] ?? {};
    const city = {
      id: c.id,
      name: c.name,
      x: h.x,
      y: h.y,
      size: over.size ?? band.size,
      vp: over.vp ?? band.vp,
      hub: over.hub ?? (c.kind === 'auto' ? c.pop >= 250000 : Boolean(c.hub)),
      source: over.source ?? Boolean(c.source),
      decisiveFor: over.decisiveFor,
      landmark: over.landmark,
    };
    byHex.set(hexKey, city);
    byId.set(c.id, city);
    out.push(city);
  }

  // Post-pass: mark sub-250k towns as hubs when they sit on rail (set later
  // by the orchestrator once corridors exist).
  return out;
}

export function markRailHubs(cities, corridors) {
  const railTiles = new Set();
  for (const c of corridors) {
    if (!c.rail) continue;
    for (const [x, y] of c.path) railTiles.add(`${x},${y}`);
  }
  for (const city of cities) {
    if (!city.hub && railTiles.has(`${city.x},${city.y}`)) city.hub = true;
  }
}

// Sanity: required ids for decisive victory + tests.
export function assertRequiredCities(cities) {
  const required = ['kyiv', 'kharkiv', 'zaporizhzhia', 'melitopol', 'mariupol', 'donetsk', 'sevastopol', 'kherson', 'dnipro', 'odesa', 'lviv'];
  const ids = new Set(cities.map((c) => c.id));
  for (const id of required) {
    if (!ids.has(id)) throw new Error(`required city missing from roster: ${id}`);
  }
  // No two cities within distance 0 (same hex) — guaranteed by byHex — but
  // warn about crowded pairs for the report.
  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const d = hexDistance({ x: cities[i].x, y: cities[i].y }, { x: cities[j].x, y: cities[j].y });
      if (d === 0) throw new Error(`cities share a hex: ${cities[i].id} / ${cities[j].id}`);
    }
  }
}
