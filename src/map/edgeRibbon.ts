// Shared draped-edge builder for reach silhouette and the frontline scar.
// Decorative only — callers must put raycast={() => null} on the mesh.

import * as THREE from 'three';
import { mergeGeometries } from './geomUtils';
import { groundY } from './terrain/heightfield';

export interface EdgeAxis {
  mx: number;
  mz: number;
  ex: number;
  ez: number;
}

export function buildEdgeRibbon(
  edges: readonly EdgeAxis[],
  opts: { len: number; height: number; width: number; lift: number },
): THREE.BufferGeometry | null {
  if (edges.length === 0) return null;
  const boxes: THREE.BufferGeometry[] = [];
  for (const e of edges) {
    const seg = new THREE.BoxGeometry(opts.len, opts.height, opts.width);
    const angle = Math.atan2(e.ez, e.ex);
    const y = groundY(e.mx, e.mz) + opts.lift;
    seg.applyMatrix4(new THREE.Matrix4().makeRotationY(-angle).setPosition(e.mx, y, e.mz));
    boxes.push(seg);
  }
  const merged = mergeGeometries(boxes);
  for (const b of boxes) b.dispose();
  merged?.computeBoundingSphere();
  merged?.computeBoundingBox();
  return merged;
}

export function buildSeamHatches(
  edges: readonly EdgeAxis[],
  ts: readonly number[],
  opts: { len: number; height: number; width: number; lift: number },
): THREE.BufferGeometry | null {
  if (edges.length === 0 || ts.length === 0) return null;
  const boxes: THREE.BufferGeometry[] = [];
  for (const e of edges) {
    const angle = Math.atan2(e.ez, e.ex);
    for (const t of ts) {
      const mx = e.mx + e.ex * t;
      const mz = e.mz + e.ez * t;
      const seg = new THREE.BoxGeometry(opts.len, opts.height, opts.width);
      const y = groundY(mx, mz) + opts.lift;
      seg.applyMatrix4(
        new THREE.Matrix4().makeRotationY(-angle + Math.PI / 2).setPosition(mx, y, mz),
      );
      boxes.push(seg);
    }
  }
  const merged = mergeGeometries(boxes);
  for (const b of boxes) b.dispose();
  merged?.computeBoundingSphere();
  merged?.computeBoundingBox();
  return merged;
}
