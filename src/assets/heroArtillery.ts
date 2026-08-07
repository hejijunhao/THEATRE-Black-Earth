// Hero-grade towed 155-class howitzer (FH70-family idiom, class-level — no
// insignia, no catalogued marks). Firing pose: split trails spread, barrel
// elevated, spades set. The barrel group is authored around the trunnion
// and rotated as one piece, so the elevation angle is a single constant.

import * as THREE from 'three';
import { FactionId } from '../game/types';
import {
  HERO_SCALE, getHeroMaterial, hbox, hcyl, heroMats, htorus, htrap, mergeHero,
} from './heroParts';
import { treadWheel } from './heroAssemblies';

const ELEV = 0.3; // rad — barrel elevation about the trunnion

export function makeArtilleryHeroGeometry(faction: FactionId): THREE.BufferGeometry {
  const M = heroMats(faction);
  const { BODY, TOP, SHADE, RUBBER, STEEL, DARKSTEEL, CANVAS2, OPTIC } = M;
  const parts: THREE.BufferGeometry[] = [];

  // ---- Elevating mass: breech, barrel, recoil system ----------------------
  const elev: THREE.BufferGeometry[] = [];
  elev.push(hbox(0.45, 0.5, 0.42, DARKSTEEL, { x: -0.55 }));           // breech block
  elev.push(hcyl(0.12, 0.12, 0.06, 12, STEEL, 'x', { x: -0.8 }));      // breech screw
  elev.push(hbox(0.04, 0.3, 0.05, STEEL, { rx: 0.4, x: -0.7, y: -0.1, z: 0.24 })); // lever
  elev.push(hcyl(0.16, 0.17, 0.5, 14, BODY, 'x', { x: -0.05 }));       // breech ring
  elev.push(hcyl(0.115, 0.125, 1.4, 14, BODY, 'x', { x: 0.9 }));
  elev.push(hcyl(0.1, 0.11, 1.5, 14, BODY, 'x', { x: 2.35 }));
  elev.push(hcyl(0.088, 0.096, 1.5, 14, BODY, 'x', { x: 3.85 }));
  elev.push(hcyl(0.1, 0.1, 0.2, 12, DARKSTEEL, 'x', { x: 4.7 }));      // brake collar
  // Double-baffle muzzle brake: body, two baffle discs, dark side slots.
  elev.push(hcyl(0.12, 0.12, 0.45, 12, DARKSTEEL, 'x', { x: 5.02 }));
  elev.push(hcyl(0.16, 0.16, 0.08, 12, DARKSTEEL, 'x', { x: 4.88 }));
  elev.push(hcyl(0.16, 0.16, 0.08, 12, DARKSTEEL, 'x', { x: 5.14 }));
  for (const sz of [1, -1] as const) {
    elev.push(hbox(0.18, 0.14, 0.05, { c: '#2b2b26', r: 0.6, m: 0.6 }, { x: 5.01, y: 0, z: sz * 0.12 }));
  }
  elev.push(hcyl(0.095, 0.1, 0.1, 12, DARKSTEEL, 'x', { x: 5.3 }));    // tip
  // Recuperator cylinders above, recoil sleigh below.
  for (const sz of [1, -1] as const) {
    elev.push(hcyl(0.065, 0.065, 1.5, 10, DARKSTEEL, 'x', { x: 0.25, y: 0.17, z: sz * 0.09 }));
  }
  elev.push(hbox(1.1, 0.16, 0.28, SHADE, { x: 0.1, y: -0.16 }));
  const elevM = new THREE.Matrix4()
    .makeTranslation(0.3, 1.05, 0)
    .multiply(new THREE.Matrix4().makeRotationZ(ELEV));
  for (const g of elev) {
    g.applyMatrix4(elevM);
    parts.push(g);
  }

  // ---- Carriage -----------------------------------------------------------
  parts.push(hbox(0.9, 0.5, 0.7, BODY, { x: 0.2, y: 0.72 }));          // saddle
  parts.push(hbox(0.45, 0.35, 0.9, BODY, { x: 0.25, y: 1.0 }));        // top carriage
  for (const sz of [1, -1] as const) {
    parts.push(hbox(0.5, 0.42, 0.06, TOP, { x: 0.3, y: 1.02, z: sz * 0.4 })); // trunnion cheeks
    parts.push(hcyl(0.05, 0.05, 0.9, 8, STEEL, 'z', { x: 0.3, y: 1.05 }));
    // Equilibrator rams angled up to the cradle.
    parts.push(hcyl(0.045, 0.055, 0.65, 8, DARKSTEEL, 'y', { rz: -0.5, x: 0.62, y: 0.78, z: sz * 0.3 }));
    // Small shield plates.
    parts.push(hbox(0.05, 0.8, 0.72, BODY, { ry: sz * -0.12, x: 0.55, y: 1.2, z: sz * 0.82 }));
  }
  // Elevation rack: stepped tooth segments under the breech end.
  for (let i = 0; i < 4; i++) {
    parts.push(hbox(0.1, 0.08, 0.1, STEEL, { x: -0.35 - i * 0.09, y: 0.86 - i * 0.05, z: -0.3 }));
  }
  // Handwheels: rim, three spokes, crank — elevation and traverse.
  for (const [hx, hy] of [[0.15, 0.98], [-0.12, 0.7]] as const) {
    parts.push(htorus(0.15, 0.022, STEEL, { x: hx, y: hy, z: 0.52 }));
    for (let sp = 0; sp < 3; sp++) {
      parts.push(hbox(0.26, 0.03, 0.02, STEEL, { rz: sp * 1.05, x: hx, y: hy, z: 0.52 }));
    }
    parts.push(hcyl(0.02, 0.02, 0.08, 6, DARKSTEEL, 'z', { x: hx + 0.12, y: hy + 0.08, z: 0.56 }));
  }
  // Crew seats flanking the saddle.
  for (const sz of [1, -1] as const) {
    parts.push(hbox(0.3, 0.03, 0.3, SHADE, { x: -0.45, y: 0.78, z: sz * 0.62 }));
    parts.push(hbox(0.03, 0.24, 0.3, SHADE, { x: -0.6, y: 0.92, z: sz * 0.62 }));
  }
  // Axle, main wheels, firing-base jack under the centre.
  parts.push(hcyl(0.06, 0.06, 2.7, 8, DARKSTEEL, 'z', { x: -0.15, y: 0.55 }));
  for (const sz of [1, -1] as const) {
    parts.push(...treadWheel(-0.15, 0.55, sz * 1.3, M, 0.55, 0.3, 14));
  }
  parts.push(hcyl(0.16, 0.18, 0.32, 10, DARKSTEEL, 'y', { x: -0.15, y: 0.25 }));
  parts.push(hcyl(0.32, 0.34, 0.07, 12, STEEL, 'y', { x: -0.15, y: 0.055 }));
  // Auxiliary power unit housing forward of the axle — the class signature
  // boxy nose — with cooling ribs and a small access hatch.
  parts.push(htrap(0.85, 1.05, 0.7, 0.95, 0.62, BODY, { x: 1.05, y: 0.5 }, 0.04, 0));
  for (let i = 0; i < 3; i++) {
    parts.push(hbox(0.02, 0.4, 0.9, SHADE, { x: 1.32 + i * 0.07, y: 0.78 }));
  }
  parts.push(hbox(0.3, 0.02, 0.4, TOP, { x: 1.0, y: 1.13 }));
  for (const sz of [1, -1] as const) {
    parts.push(hcyl(0.14, 0.14, 0.1, 10, RUBBER, 'z', { x: 1.45, y: 0.3, z: sz * 0.42 })); // dolly wheels
    parts.push(hcyl(0.05, 0.05, 0.11, 8, BODY, 'z', { x: 1.45, y: 0.3, z: sz * 0.42 }));
  }

  // ---- Split trails, spread for firing ------------------------------------
  for (const sz of [1, -1] as const) {
    const ry = sz * 0.47;
    parts.push(hbox(3.3, 0.26, 0.18, BODY, { ry, x: -2.02, y: 0.42, z: sz * 1.02 }));
    parts.push(hbox(0.5, 0.2, 0.16, BODY, { ry, x: -0.62, y: 0.42, z: sz * 0.33 })); // root gusset
    // Spade, gusset and end lug.
    parts.push(hbox(0.09, 0.55, 0.45, DARKSTEEL, { ry, x: -3.5, y: 0.28, z: sz * 1.78 }));
    parts.push(htrap(0.3, 0.14, 0.05, 0.12, 0.3, BODY, { ry, x: -3.32, y: 0.42, z: sz * 1.68 }));
    parts.push(htorus(0.06, 0.018, STEEL, { ry, x: -3.42, y: 0.62, z: sz * 1.74 }));
    // Clamp blocks and a step plate along each leg.
    parts.push(hbox(0.2, 0.06, 0.22, SHADE, { ry, x: -1.6, y: 0.58, z: sz * 0.82 }));
    parts.push(hbox(0.2, 0.06, 0.22, SHADE, { ry, x: -2.5, y: 0.58, z: sz * 1.25 }));
  }
  // Aiming stakes clamped along the right trail.
  parts.push(hcyl(0.02, 0.02, 1.3, 5, CANVAS2, 'x', { ry: 0.47, x: -1.9, y: 0.62, z: 0.93 }));
  parts.push(hcyl(0.02, 0.02, 1.3, 5, { c: '#6a6252', r: 0.9, m: 0.05 }, 'x', { ry: 0.47, x: -1.94, y: 0.66, z: 0.98 }));
  // Panoramic sight head above the left trunnion, matte glass.
  parts.push(hcyl(0.045, 0.05, 0.22, 8, SHADE, 'y', { x: 0.05, y: 1.32, z: 0.35 }));
  parts.push(hbox(0.14, 0.14, 0.12, SHADE, { x: 0.05, y: 1.48, z: 0.35 }));
  parts.push(hbox(0.015, 0.08, 0.08, OPTIC, { x: 0.13, y: 1.48, z: 0.35 }));

  const merged = mergeHero(parts);
  merged.scale(HERO_SCALE, HERO_SCALE, HERO_SCALE);
  return merged;
}

const geoCache = new Map<FactionId, THREE.BufferGeometry>();

export function makeArtilleryHero(faction: FactionId): {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
} {
  let geometry = geoCache.get(faction);
  if (!geometry) {
    geometry = makeArtilleryHeroGeometry(faction);
    geoCache.set(faction, geometry);
  }
  return { geometry, material: getHeroMaterial() };
}
