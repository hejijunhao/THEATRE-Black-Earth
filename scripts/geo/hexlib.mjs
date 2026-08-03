// Hex math for the pipeline. MUST mirror src/game/hex.ts exactly:
// odd-r offset, pointy-top, HEX_SIZE = 1 (circumradius), world x = east,
// world z = south. The river bank-ladder invariant depends on this parity
// math being identical to the runtime's.

import { GRID_W, GRID_H, LON_MIN, LON_MAX, LAT_MIN, LAT_MAX } from './config.mjs';

export const HEX_W = Math.sqrt(3); // = sqrt(3) * HEX_SIZE
export const HEX_H = 1.5;          // row spacing

const EVEN_NEIGHBORS = [[+1, 0], [-1, 0], [0, -1], [-1, -1], [0, +1], [-1, +1]];
const ODD_NEIGHBORS = [[+1, 0], [-1, 0], [+1, -1], [0, -1], [+1, +1], [0, +1]];

export function neighborCoords(x, y) {
  const offsets = y % 2 === 0 ? EVEN_NEIGHBORS : ODD_NEIGHBORS;
  return offsets.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
}

export function isAdjacent(a, b) {
  return neighborCoords(a.x, a.y).some((n) => n.x === b.x && n.y === b.y);
}

export function inGrid(x, y) {
  return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
}

export function tileWorld(x, y) {
  return { wx: (x + (y % 2 === 0 ? 0 : 0.5)) * HEX_W, wz: y * HEX_H };
}

// World -> nearest hex via axial cube rounding (pointy-top).
export function worldToHex(wx, wz) {
  const rf = wz / HEX_H;
  const qf = wx / HEX_W - rf / 2;
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { x: q + (r - (r & 1)) / 2, y: r };
}

function offsetToAxial(x, y) {
  return { q: x - (y - (y & 1)) / 2, r: y };
}

export function hexDistance(a, b) {
  const aa = offsetToAxial(a.x, a.y);
  const ab = offsetToAxial(b.x, b.y);
  const dq = aa.q - ab.q;
  const dr = aa.r - ab.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

// Contiguous hex line between two hexes (cube lerp + round). Guarantees
// consecutive results are hex-adjacent — used to repair polyline gaps.
export function hexLine(a, b) {
  const n = hexDistance(a, b);
  if (n === 0) return [a];
  const aw = tileWorld(a.x, a.y);
  const bw = tileWorld(b.x, b.y);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // tiny epsilon nudge avoids landing exactly on edges
    const wx = aw.wx + (bw.wx - aw.wx) * t + 1e-6;
    const wz = aw.wz + (bw.wz - aw.wz) * t + 2e-6;
    const h = worldToHex(wx, wz);
    if (out.length === 0 || out[out.length - 1].x !== h.x || out[out.length - 1].y !== h.y) {
      out.push(h);
    }
  }
  return out;
}

// Pointy-top hex vertices relative to centre (R = 1), clockwise from top point.
export const VERTEX_OFFSETS = [
  [0, -1], [HEX_W / 2, -0.5], [HEX_W / 2, 0.5],
  [0, 1], [-HEX_W / 2, 0.5], [-HEX_W / 2, -0.5],
];

export function hexVertices(x, y) {
  const { wx, wz } = tileWorld(x, y);
  return VERTEX_OFFSETS.map(([dx, dz]) => ({ vx: wx + dx, vz: wz + dz }));
}

// ------------------------------------------------------------- geo mapping
// Linear plate-carrée mapping of the world rectangle onto the lon/lat box.
// ~6.5% anisotropy at this latitude span — acceptable for a designed scenario.

export const WORLD_SPAN_X = (GRID_W - 1 + 0.5) * HEX_W;
export const WORLD_SPAN_Z = (GRID_H - 1) * HEX_H;

export function lonLatFromWorld(wx, wz) {
  const lon = LON_MIN + (wx / WORLD_SPAN_X) * (LON_MAX - LON_MIN);
  const lat = LAT_MAX - (wz / WORLD_SPAN_Z) * (LAT_MAX - LAT_MIN);
  return { lon, lat };
}

export function worldFromLonLat(lon, lat) {
  const wx = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * WORLD_SPAN_X;
  const wz = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * WORLD_SPAN_Z;
  return { wx, wz };
}

export function hexFromLonLat(lon, lat) {
  const { wx, wz } = worldFromLonLat(lon, lat);
  return worldToHex(wx, wz);
}

export function lonLatOfHex(x, y) {
  const { wx, wz } = tileWorld(x, y);
  return lonLatFromWorld(wx, wz);
}

// Approximate km scale (for reporting only).
export function kmPerWorldUnit() {
  const midLat = (LAT_MIN + LAT_MAX) / 2;
  const kmX = ((LON_MAX - LON_MIN) * 111.32 * Math.cos((midLat * Math.PI) / 180)) / WORLD_SPAN_X;
  const kmZ = ((LAT_MAX - LAT_MIN) * 110.57) / WORLD_SPAN_Z;
  return { kmX, kmZ };
}

// Deterministic string hash (mirrors src/game/rng.ts hashSeed) — the pipeline
// must not use Math.random so re-runs are byte-identical.
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function noise01(str) {
  return (hashSeed(str) % 10000) / 10000;
}
