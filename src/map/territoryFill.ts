// One territorial Shape from a tile union — Vic/Civ province blob, not discs.
// Decorative only. Callers must put raycast={() => null} on the mesh.

import * as THREE from 'three';
import { TileId } from '../game/types';
import {
  loopSignedArea,
  partitionTerritoryLoops,
  REACH_FILL_LIFT,
  TerritoryPoint,
  tileUnionLoops,
} from './boardTelegraph';
import { groundY } from './terrain/heightfield';

function centroid(loop: readonly TerritoryPoint[]): TerritoryPoint {
  let x = 0;
  let z = 0;
  for (const p of loop) {
    x += p.x;
    z += p.z;
  }
  const n = Math.max(1, loop.length);
  return { x: x / n, z: z / n };
}

function pointInLoop(p: TerritoryPoint, loop: readonly TerritoryPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i]!;
    const b = loop[j]!;
    const crosses = (a.z > p.z) !== (b.z > p.z);
    if (!crosses) continue;
    const x = ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x;
    if (p.x < x) inside = !inside;
  }
  return inside;
}

function oriented(loop: readonly TerritoryPoint[], wantCCW: boolean): TerritoryPoint[] {
  const ccw = loopSignedArea(loop) >= 0;
  return ccw === wantCCW ? [...loop] : [...loop].reverse();
}

function traceShape(loop: readonly TerritoryPoint[], wantCCW: boolean): THREE.Shape {
  const pts = oriented(loop, wantCCW);
  const shape = new THREE.Shape();
  const first = pts[0]!;
  shape.moveTo(first.x, first.z);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i]!.x, pts[i]!.z);
  shape.closePath();
  return shape;
}

function tracePath(loop: readonly TerritoryPoint[], wantCCW: boolean): THREE.Path {
  const pts = oriented(loop, wantCCW);
  const path = new THREE.Path();
  const first = pts[0]!;
  path.moveTo(first.x, first.z);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i]!.x, pts[i]!.z);
  path.closePath();
  return path;
}

/** Build THREE.Shape list from the tile-union outline (outers + holes). */
export function territoryShapes(interior: Iterable<TileId>): THREE.Shape[] {
  const loops = tileUnionLoops(interior);
  const { outers, holes } = partitionTerritoryLoops(loops);
  if (outers.length === 0) return [];
  return outers.map((outer) => {
    const shape = traceShape(outer, true);
    for (const hole of holes) {
      if (!pointInLoop(centroid(hole), outer)) continue;
      shape.holes.push(tracePath(hole, false));
    }
    return shape;
  });
}

export function buildTerritoryGeometry(
  interior: Iterable<TileId>,
  opts?: { lift?: number; drape?: (x: number, z: number) => number },
): THREE.BufferGeometry | null {
  const tiles = interior instanceof Set ? interior : new Set(interior);
  if (tiles.size === 0) return null;
  const shapes = territoryShapes(tiles);
  if (shapes.length === 0) return null;
  const geo = new THREE.ShapeGeometry(shapes, 1);
  // Shape lives in XY; +X east, +Y = world +Z (south). Rx(+90) stands it up.
  geo.rotateX(Math.PI / 2);
  const lift = opts?.lift ?? REACH_FILL_LIFT;
  const drape = opts?.drape ?? ((x, z) => groundY(x, z) + lift);
  const pos = geo.attributes.position;
  if (!pos) return null;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, drape(x, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
