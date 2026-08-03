// Low-level colored geometry parts for the procedural miniature factories.
// Models are CODE (v2-vision §8): diffable, tree-shakeable, zero binaries.
// Every part carries vertex colours so a whole miniature merges into one
// geometry / one draw call.

import * as THREE from 'three';

export function paint(g: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export function cbox(
  w: number, h: number, d: number, color: string,
  x = 0, y = 0, z = 0, ry = 0,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return paint(g, color);
}

// Cylinder along Y by default; axis 'x'/'z' rotates it horizontal.
export function ccyl(
  rTop: number, rBot: number, len: number, color: string,
  x = 0, y = 0, z = 0, axis: 'x' | 'y' | 'z' = 'y', seg = 6,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return paint(g, color);
}

export function ccone(
  r: number, h: number, color: string,
  x = 0, y = 0, z = 0, seg = 4,
): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return paint(g, color);
}

export function csphere(
  r: number, color: string, x = 0, y = 0, z = 0,
): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 6, 5);
  g.translate(x, y, z);
  return paint(g, color);
}

// Transform a list of parts as one rigid piece.
export function place(
  parts: THREE.BufferGeometry[],
  x: number, z: number, ry = 0, rz = 0,
): THREE.BufferGeometry[] {
  const m = new THREE.Matrix4();
  if (rz) m.multiply(new THREE.Matrix4().makeRotationZ(rz));
  const rot = new THREE.Matrix4().makeRotationY(ry);
  const trans = new THREE.Matrix4().makeTranslation(x, 0, z);
  const full = trans.clone().multiply(rot).multiply(m);
  for (const g of parts) g.applyMatrix4(full);
  return parts;
}
