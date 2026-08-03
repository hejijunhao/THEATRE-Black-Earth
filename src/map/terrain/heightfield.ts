// The render-layer heightfield: decodes the geodata-derived height grid from
// terrainData.ts and exposes world-space ground sampling for every layer that
// sits on the terrain (units, overlays, decorations, rivers, frontline).
//
// The simulation never reads this — rules elevation stays per-hex in
// GameState. Both derive from the same DEM, so they agree statistically.

import {
  HEIGHT_B64,
  HEIGHT_H,
  HEIGHT_MAX_M,
  HEIGHT_W,
  HEX_FRACS_B64,
  WORLD_H,
  WORLD_W,
  decodeBase64,
} from '../data/terrainData';
import { MAP_H, MAP_W } from '../../game/scenarios/blackEarth2025';
import { tileWorldById } from '../../game/hex';

let heights: Uint8Array | null = null;
let fracs: Uint8Array | null = null;

function ensure(): void {
  if (!heights) heights = decodeBase64(HEIGHT_B64);
  if (!fracs) fracs = decodeBase64(HEX_FRACS_B64);
}

// Raw elevation in metres (bilinear), clamped to the map rectangle.
export function heightM(wx: number, wz: number): number {
  ensure();
  const h = heights!;
  const fx = Math.min(HEIGHT_W - 1.001, Math.max(0, (wx / WORLD_W) * HEIGHT_W - 0.5));
  const fy = Math.min(HEIGHT_H - 1.001, Math.max(0, (wz / WORLD_H) * HEIGHT_H - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const i00 = h[y0 * HEIGHT_W + x0];
  const i10 = h[y0 * HEIGHT_W + x0 + 1];
  const i01 = h[(y0 + 1) * HEIGHT_W + x0];
  const i11 = h[(y0 + 1) * HEIGHT_W + x0 + 1];
  const m =
    i00 * (1 - tx) * (1 - ty) + i10 * tx * (1 - ty) + i01 * (1 - tx) * ty + i11 * tx * ty;
  return (m / 255) * HEIGHT_MAX_M;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export const SEA_LEVEL_Y = 0.02; // world Y of the sea surface plane
const SEA_FLOOR_Y = -0.24;
const LAND_BASE_Y = 0.14;
const RELIEF_SCALE = 2.6;
const RELIEF_EXP = 0.72;

// Continuous metres -> render-Y curve. Sea floor below the water plane,
// a gentle coastal rise, then non-linear relief (low steppe stays subtle,
// the Crimean mountains and the western uplands read as terrain).
export function elevToY(m: number): number {
  const coastal = SEA_FLOOR_Y + (LAND_BASE_Y - SEA_FLOOR_Y) * smoothstep(0, 7, m);
  const relief = RELIEF_SCALE * Math.pow(Math.max(0, m - 5) / HEIGHT_MAX_M, RELIEF_EXP);
  return coastal + relief;
}

export function groundY(wx: number, wz: number): number {
  return elevToY(heightM(wx, wz));
}

// Ground height at a tile centre (the anchor for units and overlays).
export function tileGroundY(tileId: string): number {
  const { wx, wz } = tileWorldById(tileId);
  return Math.max(groundY(wx, wz), LAND_BASE_Y * 0.75);
}

// Per-hex land-cover fractions from the pipeline (0..1).
export interface HexFracs {
  forest: number;
  urban: number;
  crop: number;
  water: number;
  wetland: number;
}

export function hexFracs(x: number, y: number): HexFracs {
  ensure();
  const cx = Math.min(MAP_W - 1, Math.max(0, x));
  const cy = Math.min(MAP_H - 1, Math.max(0, y));
  const o = (cy * MAP_W + cx) * 5;
  const f = fracs!;
  return {
    forest: f[o] / 255,
    urban: f[o + 1] / 255,
    crop: f[o + 2] / 255,
    water: f[o + 3] / 255,
    wetland: f[o + 4] / 255,
  };
}

// Bilinear interpolation of a fraction channel over hex-grid space (soft
// land-cover fields for the albedo painter). Channel: 0..4 as in HexFracs.
export function fracAtWorld(wx: number, wz: number, channel: number): number {
  ensure();
  const f = fracs!;
  // Approximate hex-grid coords (ignoring odd-r shift — fractions are soft).
  const gx = Math.min(MAP_W - 1.001, Math.max(0, wx / Math.sqrt(3) - 0.25));
  const gy = Math.min(MAP_H - 1.001, Math.max(0, wz / 1.5));
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const tx = gx - x0;
  const ty = gy - y0;
  const v = (xx: number, yy: number) => f[(yy * MAP_W + xx) * 5 + channel] / 255;
  return (
    v(x0, y0) * (1 - tx) * (1 - ty) +
    v(x0 + 1, y0) * tx * (1 - ty) +
    v(x0, y0 + 1) * (1 - tx) * ty +
    v(x0 + 1, y0 + 1) * tx * ty
  );
}

// Water mask + shore-distance field for the sea shader, computed once on a
// coarse grid. Value: 0 on land, else min(1, shoreDistPx / 14).
const SHORE_W = 256;
export const SHORE_H = Math.round((SHORE_W * WORLD_H) / WORLD_W);

let shoreField: Float32Array | null = null;
export function getShoreField(): { data: Float32Array; w: number; h: number } {
  if (shoreField) return { data: shoreField, w: SHORE_W, h: SHORE_H };
  const w = SHORE_W;
  const h = SHORE_H;
  const water = new Uint8Array(w * h);
  const dist = new Float32Array(w * h).fill(Infinity);
  const queue: number[] = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const wx = ((i + 0.5) / w) * WORLD_W;
      const wz = ((j + 0.5) / h) * WORLD_H;
      const isWater = heightM(wx, wz) < 3.5;
      water[j * w + i] = isWater ? 1 : 0;
      if (!isWater) {
        dist[j * w + i] = 0;
        queue.push(j * w + i);
      }
    }
  }
  // BFS from land outward across water.
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const ix = idx % w;
    const iy = Math.floor(idx / w);
    const d = dist[idx];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = ix + dx;
      const ny = iy + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const ni = ny * w + nx;
      if (dist[ni] > d + 1) {
        dist[ni] = d + 1;
        queue.push(ni);
      }
    }
  }
  shoreField = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    shoreField[i] = water[i] ? Math.min(1, dist[i] / 14) : 0;
  }
  return { data: shoreField, w, h };
}
