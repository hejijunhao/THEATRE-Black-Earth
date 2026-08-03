// Minimal geometry merge (positions/normals/index) shared by draped ribbon
// layers — avoids importing three/examples.

import * as THREE from 'three';

export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;
  let totalVerts = 0;
  let totalIndex = 0;
  const anyColor = geos.some((g) => g.attributes.color);
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIndex += g.index ? g.index.count : 0;
  }
  const merged = new THREE.BufferGeometry();
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const col = anyColor ? new Float32Array(totalVerts * 3).fill(1) : null;
  const idx = new Uint32Array(totalIndex);
  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    pos.set(p.array as Float32Array, vOff * 3);
    norm.set(n.array as Float32Array, vOff * 3);
    if (col && g.attributes.color) {
      col.set(g.attributes.color.array as Float32Array, vOff * 3);
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        idx[iOff + i] = g.index.array[i] + vOff;
      }
      iOff += g.index.count;
    }
    vOff += p.count;
  }
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  if (col) merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  return merged;
}
