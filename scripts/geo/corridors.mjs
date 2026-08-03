// Road / rail corridor extraction: Natural Earth polylines -> contiguous hex
// chains (gaps repaired with hexLine so build.ts's adjacency assert holds),
// split wherever they leave usable land.

import { GRID_W, ROAD_MAX_SCALERANK, RAIL_MAX_SCALERANK } from './config.mjs';
import { worldFromLonLat, worldToHex, hexLine, inGrid } from './hexlib.mjs';
import { loadNaturalEarth, flattenLines, bboxOverlaps } from './data.mjs';

function lineToChains(coords, isUsable) {
  const chains = [];
  let cur = [];
  let prev = null;
  const push = (h) => {
    if (!isUsable(h)) {
      if (cur.length >= 2) chains.push(cur);
      cur = [];
      prev = null;
      return;
    }
    if (prev && prev.x === h.x && prev.y === h.y) return;
    if (prev) {
      // Repair any gap with an adjacent hex line (skipping the start point).
      const seg = hexLine(prev, h);
      for (let i = 1; i < seg.length; i++) {
        if (!isUsable(seg[i])) {
          if (cur.length >= 2) chains.push(cur);
          cur = [];
          prev = null;
          return;
        }
        cur.push(seg[i]);
      }
    } else {
      cur.push(h);
    }
    prev = h;
  };
  for (const [lon, lat] of coords) {
    const { wx, wz } = worldFromLonLat(lon, lat);
    push(worldToHex(wx, wz));
  }
  if (cur.length >= 2) chains.push(cur);
  return chains;
}

export function extractCorridors(cells) {
  const { roads, railroads } = loadNaturalEarth();
  const isUsable = (h) => {
    if (!inGrid(h.x, h.y)) return false;
    const t = cells[h.y * GRID_W + h.x].terrain;
    return t !== null && t !== 'w';
  };

  const corridors = [];
  const seen = new Set(); // dedup identical chains

  const addChains = (feature, rail) => {
    for (const line of flattenLines(feature.geometry)) {
      if (!bboxOverlaps(line)) continue;
      for (const chain of lineToChains(line, isUsable)) {
        const key = rail + ':' + chain.map((h) => `${h.x},${h.y}`).join(';');
        if (seen.has(key)) continue;
        seen.add(key);
        corridors.push({ rail, path: chain.map((h) => [h.x, h.y]) });
      }
    }
  };

  for (const f of roads.features) {
    if (!f.geometry) continue;
    const p = f.properties;
    if (p.type === 'Ferry Route') continue;
    // Highways only. Density is a balance lever (roads flatten movement
    // cost to 1 and speed supply) — the local road net is assumed ambient.
    const isHighway = p.type === 'Major Highway' || p.type === 'Secondary Highway';
    if (!isHighway) continue;
    if (p.scalerank > ROAD_MAX_SCALERANK + 4) continue;
    addChains(f, false);
  }
  for (const f of railroads.features) {
    if (!f.geometry) continue;
    if (f.properties.scalerank > RAIL_MAX_SCALERANK) continue;
    addChains(f, true);
  }
  return corridors;
}

// Bridges: corridor steps that cross a river edge. This is the generative
// rule — a crossing exists where infrastructure actually crosses the river.
export function deriveBridges(corridors, riverEdgeSet) {
  const bridges = [];
  const seen = new Set();
  for (const c of corridors) {
    for (let i = 1; i < c.path.length; i++) {
      const [ax, ay] = c.path[i - 1];
      const [bx, by] = c.path[i];
      const aKey = `${ax},${ay}`;
      const bKey = `${bx},${by}`;
      const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
      if (riverEdgeSet.has(key) && !seen.has(key)) {
        seen.add(key);
        bridges.push([[ax, ay], [bx, by]]);
      }
    }
  }
  return bridges;
}

// Coverage stats for the report.
export function corridorStats(corridors, cells) {
  const road = new Set();
  const rail = new Set();
  for (const c of corridors) {
    for (const [x, y] of c.path) {
      road.add(`${x},${y}`);
      if (c.rail) rail.add(`${x},${y}`);
    }
  }
  const land = cells.filter((c) => c.terrain !== null && c.terrain !== 'w').length;
  return { roadTiles: road.size, railTiles: rail.size, landTiles: land };
}
