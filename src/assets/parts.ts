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

// Flat-shaded frustum box: a bottom w×d rectangle at (x, y, z) rising h to a
// top wT×dT rectangle offset by (shiftX, shiftZ). The sloped-armour workhorse
// — glacis, sponsons and turret sides read as raked plate, not stacked
// bricks. Indexed on purpose: geomUtils' mergeGeometries only remaps indexed
// triangles, so a non-indexed part would merge into nothing.
export function ctrap(
  w: number, d: number, wT: number, dT: number, h: number, color: string,
  x = 0, y = 0, z = 0, shiftX = 0, shiftZ = 0, ry = 0,
): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2, hwT = wT / 2, hdT = dT / 2;
  const b0 = [hw, 0, -hd], b1 = [hw, 0, hd], b2 = [-hw, 0, hd], b3 = [-hw, 0, -hd];
  const t0 = [shiftX + hwT, h, shiftZ - hdT], t1 = [shiftX + hwT, h, shiftZ + hdT];
  const t2 = [shiftX - hwT, h, shiftZ + hdT], t3 = [shiftX - hwT, h, shiftZ - hdT];
  // Outward-wound quads: top, bottom, front (+x), rear, +z, -z.
  const quads = [
    [t3, t2, t1, t0], [b0, b1, b2, b3],
    [b1, b0, t0, t1], [b3, b2, t2, t3],
    [b2, b1, t1, t2], [b0, b3, t3, t0],
  ];
  const pos: number[] = [];
  const idx: number[] = [];
  for (const q of quads) {
    const base = pos.length / 3;
    for (const v of q) pos.push(v[0], v[1], v[2]);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return paint(g, color);
}

// Transform a list of parts as one rigid piece.
export function place(
  parts: THREE.BufferGeometry[],
  x: number, z: number, ry = 0, rz = 0, scale = 1,
): THREE.BufferGeometry[] {
  const m = new THREE.Matrix4();
  if (rz) m.multiply(new THREE.Matrix4().makeRotationZ(rz));
  if (scale !== 1) m.multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
  const rot = new THREE.Matrix4().makeRotationY(ry);
  const trans = new THREE.Matrix4().makeTranslation(x, 0, z);
  const full = trans.clone().multiply(rot).multiply(m);
  for (const g of parts) {
    g.applyMatrix4(full);
    // Preserve each rigid prop's foot point through the formation merge.
    const anchor = new Float32Array(g.getAttribute('position').count * 2);
    for (let i = 0; i < anchor.length; i += 2) { anchor[i] = x; anchor[i + 1] = z; }
    g.setAttribute('aAnchor', new THREE.BufferAttribute(anchor, 2));
  }
  return parts;
}
