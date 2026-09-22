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
  opts?: { lift?: number; maxEdge?: number; drape?: (x: number, z: number) => number },
): THREE.BufferGeometry | null {
  const tiles = interior instanceof Set ? interior : new Set(interior);
  if (tiles.size === 0) return null;
  const shapes = territoryShapes(tiles);
  if (shapes.length === 0) return null;
  let geo: THREE.BufferGeometry = new THREE.ShapeGeometry(shapes, 1);
  if (opts?.maxEdge) {
    // Earcut triangles can span the entire territory. Subdivide before
    // draping so depth-tested reach does not cut through intervening relief.
    const source = geo.getAttribute('position'), index = geo.index!;
    const vertices: number[] = [], indices: number[] = [];
    const max2 = opts.maxEdge * opts.maxEdge;
    type P = [number, number];
    const emit = (a: P, b: P, c: P): void => {
      const ab = (a[0]-b[0])**2 + (a[1]-b[1])**2;
      const bc = (b[0]-c[0])**2 + (b[1]-c[1])**2;
      const ca = (c[0]-a[0])**2 + (c[1]-a[1])**2;
      if (Math.max(ab, bc, ca) > max2) {
        if (bc > ab && bc >= ca) { emit(b,c,a); return; }
        if (ca > ab && ca > bc) { emit(c,a,b); return; }
        const mid: P = [(a[0]+b[0])/2, (a[1]+b[1])/2];
        emit(a,mid,c); emit(mid,b,c); return;
      }
      const first = vertices.length / 3;
      vertices.push(a[0],a[1],0,b[0],b[1],0,c[0],c[1],0);
      indices.push(first,first+1,first+2);
    };
    const point = (i: number): P => [source.getX(index.getX(i)), source.getY(index.getX(i))];
    for (let i = 0; i < index.count; i += 3) emit(point(i),point(i+1),point(i+2));
    geo.dispose();
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
  }
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
  // ShapeGeometry + Rx(+90) lands facing -Y. Flip so the camera above sees the wash.
  const idx = geo.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
    idx.needsUpdate = true;
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
