// Per-hex terrain classification from WorldCover + DEM, sea flood fill,
// and designed control assignment from the front line.

import { GRID_W, GRID_H, THRESHOLDS, WC, ELEV_MAX_M } from './config.mjs';
import {
  tileWorld, worldToHex, lonLatFromWorld, neighborCoords, inGrid, HEX_W,
  worldFromLonLat, lonLatOfHex,
} from './hexlib.mjs';
import { elevationAt, wcClassAt, inTheatreLand } from './data.mjs';
import { FRONT_LINE, RU_POCKETS, INLAND_WATER_BOXES, FORCED_LAND } from './design.mjs';

// A hex cell record produced by classification.
// { x, y, onMap, terrain: 'p'|'f'|'m'|'w'|'u'|null, elevM, frac: {...}, controller }

function inInlandWaterBox(lon, lat) {
  return INLAND_WATER_BOXES.some(
    (b) => lon >= b.lonMin && lon <= b.lonMax && lat >= b.latMin && lat <= b.latMax,
  );
}

export function classifyTiles() {
  const cells = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const { wx, wz } = tileWorld(x, y);
      const centre = lonLatFromWorld(wx, wz);

      // Dense in-hex sampling: 7×7 lattice over the bounding box, keep points
      // that map back to this hex (exact point-in-hex test via worldToHex).
      const counts = {};
      let n = 0;
      let elevSum = 0;
      let landPts = 0;
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          const px = wx + ((i / 6) - 0.5) * HEX_W;
          const pz = wz + ((j / 6) - 0.5) * 2;
          const h = worldToHex(px, pz);
          if (h.x !== x || h.y !== y) continue;
          const { lon, lat } = lonLatFromWorld(px, pz);
          const cls = wcClassAt(lon, lat);
          counts[cls] = (counts[cls] || 0) + 1;
          elevSum += Math.max(0, elevationAt(lon, lat));
          if (inTheatreLand(lon, lat)) landPts += 1;
          n += 1;
        }
      }
      const frac = (cls) => (counts[cls] || 0) / Math.max(1, n);
      const waterFrac = frac(WC.WATER);
      const cell = {
        x,
        y,
        centre,
        elevM: elevSum / Math.max(1, n),
        landFrac: landPts / Math.max(1, n),
        frac: {
          water: waterFrac,
          tree: frac(WC.TREE),
          built: frac(WC.BUILT),
          wetland: frac(WC.WETLAND) + frac(WC.MOSS),
          crop: frac(WC.CROP),
          grass: frac(WC.GRASS) + frac(WC.SHRUB),
          bare: frac(WC.BARE),
        },
        seaCandidate: waterFrac >= THRESHOLDS.seaWaterFrac && !inInlandWaterBox(centre.lon, centre.lat),
        onMapLand: inTheatreLand(centre.lon, centre.lat),
        terrain: null,
        controller: null,
      };
      cells.push(cell);
    }
  }
  return cells;
}

// Sea flood fill: seeds in open Black Sea / Azov, expansion over candidates.
export function floodSea(cells) {
  const at = (x, y) => cells[y * GRID_W + x];
  const isSeed = (c) =>
    c.seaCandidate &&
    (c.centre.lat < 45.2 || (c.centre.lon > 37.6 && c.centre.lat < 47.2 && c.frac.water > 0.85));
  const queue = cells.filter(isSeed);
  const sea = new Set(queue.map((c) => `${c.x},${c.y}`));
  while (queue.length) {
    const c = queue.pop();
    for (const nb of neighborCoords(c.x, c.y)) {
      if (!inGrid(nb.x, nb.y)) continue;
      const cell = at(nb.x, nb.y);
      const key = `${cell.x},${cell.y}`;
      if (sea.has(key) || !cell.seaCandidate) continue;
      sea.add(key);
      queue.push(cell);
    }
  }
  return sea;
}

export function assignTerrain(cells, sea) {
  const T = THRESHOLDS;
  for (const c of cells) {
    const key = `${c.x},${c.y}`;
    if (sea.has(key)) {
      c.terrain = 'w';
      continue;
    }
    if (!c.onMapLand) {
      // Not Ukraine, not sea: off-map (or negligible sliver).
      c.terrain = null;
      continue;
    }
    if (c.frac.wetland >= T.marshWetlandFrac || c.frac.water >= T.marshRiverineWaterFrac) {
      c.terrain = 'm';
    } else if (c.frac.built >= T.urbanBuiltFrac) {
      c.terrain = 'u';
    } else if (c.frac.tree >= T.forestTreeFrac) {
      c.terrain = 'f';
    } else {
      c.terrain = 'p';
    }
  }
  // Designed forced-land corridors (Perekop / Chonhar).
  for (const f of FORCED_LAND) {
    const { wx, wz } = worldFromLonLat(f.lon, f.lat);
    const h = worldToHex(wx, wz);
    const cell = cells[h.y * GRID_W + h.x];
    if (!cell) throw new Error(`Forced-land override off-grid: ${f.label}`);
    cell.terrain = f.terrain === 'marsh' ? 'm' : 'p';
    cell.onMapLand = true;
    sea.delete(`${h.x},${h.y}`);
  }
}

// Keep sea hexes only within a band of the coast; deep sea becomes off-map.
export function trimSeaBand(cells, sea) {
  const isLand = (x, y) => {
    if (!inGrid(x, y)) return false;
    const t = cells[y * GRID_W + x].terrain;
    return t !== null && t !== 'w';
  };
  const keep = new Set();
  let frontier = [];
  for (const key of sea) {
    const [x, y] = key.split(',').map(Number);
    if (neighborCoords(x, y).some((nb) => isLand(nb.x, nb.y))) {
      keep.add(key);
      frontier.push({ x, y });
    }
  }
  for (let d = 1; d < THRESHOLDS.seaBandRadius; d++) {
    const next = [];
    for (const { x, y } of frontier) {
      for (const nb of neighborCoords(x, y)) {
        const key = `${nb.x},${nb.y}`;
        if (sea.has(key) && !keep.has(key)) {
          keep.add(key);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  for (const c of cells) {
    const key = `${c.x},${c.y}`;
    if (c.terrain === 'w' && !keep.has(key)) c.terrain = null;
  }
}

// ------------------------------------------------------------- control
// Side test against the designed front polyline + RU pockets.

function nearestSegmentSide(lon, lat) {
  let best = Infinity;
  let side = 0;
  for (let i = 1; i < FRONT_LINE.length; i++) {
    const [x1, y1] = FRONT_LINE[i - 1];
    const [x2, y2] = FRONT_LINE[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((lon - x1) * dx + (lat - y1) * dy) / len2));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const d = (lon - px) ** 2 + (lat - py) ** 2;
    if (d < best) {
      best = d;
      // For a roughly southward-running line, cross > 0 = left of travel =
      // EAST of the front => RU side. (Verified: Kharkiv gives cross < 0.)
      side = dx * (lat - y1) - dy * (lon - x1);
    }
  }
  return side;
}

export function assignControl(cells) {
  for (const c of cells) {
    if (c.terrain === null || c.terrain === 'w') continue;
    const { lon, lat } = c.centre;
    const pocket = RU_POCKETS.some((p) => {
      const dKm = Math.hypot(
        (lon - p.lon) * 111.32 * Math.cos((lat * Math.PI) / 180),
        (lat - p.lat) * 110.57,
      );
      return dKm <= p.radiusKm;
    });
    if (pocket) {
      c.controller = 'r';
      continue;
    }
    c.controller = nearestSegmentSide(lon, lat) > 0 ? 'r' : 'u';
  }
}

// Elevation char (0..9a..z ~ 0..1 over sqrt scale).
export function elevChar(elevM) {
  const v = Math.sqrt(Math.min(1, Math.max(0, elevM / ELEV_MAX_M)));
  const q = Math.min(35, Math.round(v * 35));
  return q.toString(36);
}
