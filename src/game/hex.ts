// Pointy-top hexes, odd-r offset coordinates: odd rows are shifted +0.5 tiles
// to the right. All map data and rules use offset (x=col, y=row) coordinates;
// axial coordinates are only used internally for distance.

import { TileId, tileId, parseTileId } from './types';

// Neighbor offsets for even rows / odd rows (odd-r layout).
const EVEN_NEIGHBORS: Array<[number, number]> = [
  [+1, 0], [-1, 0], [0, -1], [-1, -1], [0, +1], [-1, +1],
];
const ODD_NEIGHBORS: Array<[number, number]> = [
  [+1, 0], [-1, 0], [+1, -1], [0, -1], [+1, +1], [0, +1],
];

export function neighborCoords(x: number, y: number): Array<{ x: number; y: number }> {
  const offsets = y % 2 === 0 ? EVEN_NEIGHBORS : ODD_NEIGHBORS;
  return offsets.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
}

export function neighborIds(id: TileId): TileId[] {
  const { x, y } = parseTileId(id);
  return neighborCoords(x, y).map((c) => tileId(c.x, c.y));
}

function offsetToAxial(x: number, y: number): { q: number; r: number } {
  const q = x - (y - (y & 1)) / 2;
  return { q, r: y };
}

export function hexDistance(a: TileId, b: TileId): number {
  const pa = parseTileId(a);
  const pb = parseTileId(b);
  const aa = offsetToAxial(pa.x, pa.y);
  const ab = offsetToAxial(pb.x, pb.y);
  const dq = aa.q - ab.q;
  const dr = aa.r - ab.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function tilesWithin(center: TileId, radius: number): TileId[] {
  // BFS ring expansion over offset coordinates.
  const out: TileId[] = [center];
  const seen = new Set<TileId>([center]);
  let frontier = [center];
  for (let i = 0; i < radius; i++) {
    const next: TileId[] = [];
    for (const t of frontier) {
      for (const n of neighborIds(t)) {
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
          out.push(n);
        }
      }
    }
    frontier = next;
  }
  return out;
}

// World-space layout (three.js: x = east, z = south). Size = hex circumradius.
export const HEX_SIZE = 1;
export const HEX_W = Math.sqrt(3) * HEX_SIZE;
export const HEX_H = 1.5 * HEX_SIZE;

export function tileWorld(x: number, y: number): { wx: number; wz: number } {
  const wx = (x + (y % 2 === 0 ? 0 : 0.5)) * HEX_W;
  const wz = y * HEX_H;
  return { wx, wz };
}

export function tileWorldById(id: TileId): { wx: number; wz: number } {
  const { x, y } = parseTileId(id);
  return tileWorld(x, y);
}

/** Pointy-top corners, CCW from the east-south vertex (Red Blob `60i-30`). */
export function hexCorners(id: TileId): Array<{ x: number; z: number }> {
  const { wx, wz } = tileWorldById(id);
  const out: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    out.push({ x: wx + HEX_SIZE * Math.cos(a), z: wz + HEX_SIZE * Math.sin(a) });
  }
  return out;
}

// Midpoint and direction of the shared edge between two adjacent tiles,
// used to render rivers and the frontline along hex edges.
export function sharedEdge(a: TileId, b: TileId): {
  mx: number; mz: number; // edge midpoint
  ex: number; ez: number; // unit vector along the edge
} | null {
  const pa = tileWorldById(a);
  const pb = tileWorldById(b);
  const dx = pb.wx - pa.wx;
  const dz = pb.wz - pa.wz;
  const dist = Math.hypot(dx, dz);
  if (dist > HEX_W * 1.2) return null; // not adjacent
  const mx = (pa.wx + pb.wx) / 2;
  const mz = (pa.wz + pb.wz) / 2;
  // Edge runs perpendicular to the center-to-center vector.
  const ex = -dz / dist;
  const ez = dx / dist;
  return { mx, mz, ex, ez };
}
