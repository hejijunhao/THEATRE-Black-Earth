// River extraction: Natural Earth centerlines -> vertex-continuous hex-edge
// paths -> bank "ladders".
//
// THE INVARIANT (docs/overview.md §6.3): each bank must be a hex-adjacent
// chain. We get this by construction: the river is traced as a walk along
// hex-lattice VERTICES. Consecutive edges share a vertex; the three tiles
// meeting at any vertex are mutually adjacent; therefore consecutive left
// (and right) tiles are equal or adjacent, and the deduplicated bank
// sequences are ladders. assertAdjacent still runs afterwards as a backstop.

import { GRID_W } from './config.mjs';
import {
  worldToHex, tileWorld, hexVertices, neighborCoords, inGrid, worldFromLonLat,
} from './hexlib.mjs';
import { loadNaturalEarth, flattenLines, bboxOverlaps } from './data.mjs';

const EPS = 1e-4;

// Is `p` a lattice vertex? Snap against the vertices of the hexes around it.
function snapVertex(p) {
  const h = worldToHex(p.vx, p.vz);
  const candidates = [h, ...neighborCoords(h.x, h.y)];
  for (const c of candidates) {
    for (const v of hexVertices(c.x, c.y)) {
      if (Math.abs(v.vx - p.vx) < 0.02 && Math.abs(v.vz - p.vz) < 0.02) {
        return { vx: v.vx, vz: v.vz };
      }
    }
  }
  return null;
}

function vertexKey(v) {
  return `${Math.round(v.vx * 1000)},${Math.round(v.vz * 1000)}`;
}

// The (up to 3) lattice vertices adjacent to v: candidates at distance 1
// (edge length = R = 1) in the six 60° directions; keep the real ones.
function vertexNeighbors(v) {
  const out = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    const cand = { vx: v.vx + Math.cos(a), vz: v.vz + Math.sin(a) };
    const snapped = snapVertex(cand);
    if (snapped) out.push(snapped);
  }
  // Also try the axis-aligned directions (vertex classes alternate).
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    const cand = { vx: v.vx + Math.cos(a), vz: v.vz + Math.sin(a) };
    const snapped = snapVertex(cand);
    if (snapped) out.push(snapped);
  }
  // Dedup.
  const seen = new Set();
  return out.filter((p) => {
    const key = vertexKey(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Nearest lattice vertex to a world point.
function nearestVertex(wx, wz) {
  const h = worldToHex(wx, wz);
  let best = null;
  let bestD = Infinity;
  for (const c of [h, ...neighborCoords(h.x, h.y)]) {
    for (const v of hexVertices(c.x, c.y)) {
      const d = (v.vx - wx) ** 2 + (v.vz - wz) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { vx: v.vx, vz: v.vz };
      }
    }
  }
  return best;
}

// ---- polyline assembly ----------------------------------------------------

// Join same-named Natural Earth features into one polyline (endpoint
// proximity, either orientation), keep the longest chain.
function assemblePolyline(features) {
  const segs = [];
  for (const f of features) {
    for (const line of flattenLines(f.geometry)) {
      if (line.length >= 2) segs.push(line.map(([lon, lat]) => ({ lon, lat })));
    }
  }
  if (segs.length === 0) return null;
  const used = new Set();
  let bestChain = null;
  for (let s = 0; s < segs.length; s++) {
    if (used.has(s)) continue;
    let chain = [...segs[s]];
    used.add(s);
    let extended = true;
    while (extended) {
      extended = false;
      for (let t = 0; t < segs.length; t++) {
        if (used.has(t)) continue;
        const seg = segs[t];
        const d = (a, b) => Math.hypot(a.lon - b.lon, a.lat - b.lat);
        const head = chain[0];
        const tail = chain[chain.length - 1];
        if (d(tail, seg[0]) < 0.12) { chain = chain.concat(seg.slice(1)); used.add(t); extended = true; }
        else if (d(tail, seg[seg.length - 1]) < 0.12) { chain = chain.concat([...seg].reverse().slice(1)); used.add(t); extended = true; }
        else if (d(head, seg[seg.length - 1]) < 0.12) { chain = seg.slice(0, -1).concat(chain); used.add(t); extended = true; }
        else if (d(head, seg[0]) < 0.12) { chain = [...seg].reverse().slice(0, -1).concat(chain); used.add(t); extended = true; }
      }
    }
    if (!bestChain || chain.length > bestChain.length) bestChain = chain;
  }
  return bestChain;
}

// Resample to ~0.35 world units (~9 km) in world space.
function resampleWorld(polyline) {
  const pts = polyline.map(({ lon, lat }) => worldFromLonLat(lon, lat));
  const out = [pts[0]];
  const STEP = 0.35;
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1];
    const cur = pts[i];
    const d = Math.hypot(cur.wx - prev.wx, cur.wz - prev.wz);
    if (d < STEP) continue;
    const n = Math.ceil(d / STEP);
    for (let k = 1; k <= n; k++) {
      out.push({
        wx: prev.wx + ((cur.wx - prev.wx) * k) / n,
        wz: prev.wz + ((cur.wz - prev.wz) * k) / n,
      });
    }
  }
  return out;
}

// ---- vertex walk ----------------------------------------------------------

// Walk lattice vertices following the resampled course. Returns ordered edge
// list entries { left: {x,y}, right: {x,y}, v1, v2 }.
function traceEdges(course) {
  if (course.length < 2) return [];
  let v = nearestVertex(course[0].wx, course[0].wz);
  if (!v) return [];
  const edges = [];
  let j = 1;
  let prevKey = null;
  const maxSteps = course.length * 6;
  for (let step = 0; step < maxSteps; step++) {
    // Advance the course target while it is close to the current vertex.
    while (j < course.length - 1 && Math.hypot(course[j].wx - v.vx, course[j].wz - v.vz) < 1.05) {
      j += 1;
    }
    const target = course[j];
    const done =
      j >= course.length - 1 && Math.hypot(target.wx - v.vx, target.wz - v.vz) < 1.1;
    if (done) break;
    let best = null;
    let bestScore = Infinity;
    for (const cand of vertexNeighbors(v)) {
      const key = vertexKey(cand);
      if (key === prevKey) continue; // no immediate backtrack
      const score = Math.hypot(target.wx - cand.vx, target.wz - cand.vz);
      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }
    if (!best) break;
    // Stop if we are moving away from the course entirely (stuck).
    const curDist = Math.hypot(target.wx - v.vx, target.wz - v.vz);
    if (bestScore > curDist + 1.0) break;
    // Identify the two hexes flanking edge v -> best.
    const mx = (v.vx + best.vx) / 2;
    const mz = (v.vz + best.vz) / 2;
    const dx = best.vx - v.vx;
    const dz = best.vz - v.vz;
    const len = Math.hypot(dx, dz);
    const nx = -dz / len;
    const nz = dx / len;
    const hexA = worldToHex(mx + nx * 0.3, mz + nz * 0.3);
    const hexB = worldToHex(mx - nx * 0.3, mz - nz * 0.3);
    edges.push({ left: hexA, right: hexB, v1: v, v2: best });
    prevKey = vertexKey(v);
    v = best;
  }
  return edges;
}

// ---- bank extraction ------------------------------------------------------

function dedupChain(tiles) {
  const out = [];
  for (const t of tiles) {
    const last = out[out.length - 1];
    if (last && last.x === t.x && last.y === t.y) continue;
    out.push(t);
  }
  return out;
}

// Split the edge list into runs where both flanking tiles are usable land.
function splitRuns(edges, isUsable) {
  const runs = [];
  let cur = [];
  for (const e of edges) {
    if (isUsable(e.left) && isUsable(e.right)) {
      cur.push(e);
    } else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs;
}

export function extractRivers(riverNames, minEdges, cells) {
  const { rivers } = loadNaturalEarth();
  const isUsable = (h) => {
    if (!inGrid(h.x, h.y)) return false;
    const t = cells[h.y * GRID_W + h.x].terrain;
    return t !== null && t !== 'w';
  };
  const out = [];
  for (const name of riverNames) {
    const feats = rivers.features.filter(
      (f) =>
        f.geometry &&
        (f.properties.name === name || f.properties.name_en === name) &&
        bboxOverlaps(flattenLines(f.geometry).flat()),
    );
    if (feats.length === 0) {
      console.warn(`river ${name}: no Natural Earth features in bbox`);
      continue;
    }
    const polyline = assemblePolyline(feats);
    const course = resampleWorld(polyline);
    const edges = traceEdges(course);
    const runs = splitRuns(edges, isUsable);
    let part = 0;
    for (const run of runs) {
      if (run.length < minEdges) continue;
      const bankA = dedupChain(run.map((e) => e.left));
      const bankB = dedupChain(run.map((e) => e.right));
      part += 1;
      out.push({
        name: part > 1 ? `${name} (${part})` : name,
        bankA: bankA.map((t) => [t.x, t.y]),
        bankB: bankB.map((t) => [t.x, t.y]),
      });
    }
  }
  return out;
}

// Mirror of build.ts bank-chain validation + edge derivation, so a bad trace
// fails HERE with context rather than at game startup.
export function validateAndDeriveEdges(riverDefs, cells, isAdjacent) {
  const edgeSet = new Set();
  for (const river of riverDefs) {
    for (const bank of [river.bankA, river.bankB]) {
      for (let i = 1; i < bank.length; i++) {
        const a = { x: bank[i - 1][0], y: bank[i - 1][1] };
        const b = { x: bank[i][0], y: bank[i][1] };
        if (!isAdjacent(a, b)) {
          throw new Error(
            `river ${river.name}: bank step ${a.x},${a.y} -> ${b.x},${b.y} is not hex-adjacent`,
          );
        }
      }
    }
    const bankBSet = new Set(river.bankB.map(([x, y]) => `${x},${y}`));
    for (const [ax, ay] of river.bankA) {
      for (const nb of neighborCoords(ax, ay)) {
        if (bankBSet.has(`${nb.x},${nb.y}`)) {
          const aKey = `${ax},${ay}`;
          const bKey = `${nb.x},${nb.y}`;
          edgeSet.add(aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`);
        }
      }
    }
  }
  return edgeSet;
}
