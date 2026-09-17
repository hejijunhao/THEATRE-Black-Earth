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

const ELEV = 0.4; // rad — barrel elevation about the trunnion. Mid-zoom
                  // needs the tube off the carriage, not buried in it.

export function makeArtilleryHeroGeometry(faction: FactionId): THREE.BufferGeometry {
  const M = heroMats(faction);
  const { BODY, TOP, SHADE, RUBBER, STEEL, DARKSTEEL, CANVAS2, OPTIC } = M;
  const parts: THREE.BufferGeometry[] = [];

  // ---- Elevating mass: breech, barrel, recoil system ----------------------
  // Barrel thickness is a silhouette lie. A true 155 tube vanishes at boot
  // height; this one has to read as a gun, not a pale carriage plate.
  const elev: THREE.BufferGeometry[] = [];
  elev.push(hbox(0.55, 0.58, 0.50, DARKSTEEL, { x: -0.58 }));           // breech block
  elev.push(hcyl(0.14, 0.14, 0.08, 12, STEEL, 'x', { x: -0.88 }));      // breech screw
  elev.push(hbox(0.05, 0.32, 0.06, STEEL, { rx: 0.4, x: -0.74, y: -0.1, z: 0.26 })); // lever
  elev.push(hcyl(0.22, 0.24, 0.55, 14, DARKSTEEL, 'x', { x: -0.05 }));  // breech ring
  elev.push(hcyl(0.18, 0.20, 1.5, 14, DARKSTEEL, 'x', { x: 0.95 }));
  elev.push(hcyl(0.16, 0.17, 1.7, 14, DARKSTEEL, 'x', { x: 2.50 }));
  elev.push(hcyl(0.14, 0.15, 1.7, 14, DARKSTEEL, 'x', { x: 4.15 }));
  elev.push(hcyl(0.17, 0.17, 0.24, 12, SHADE, 'x', { x: 5.10 }));       // brake collar
  // Double-baffle muzzle brake: the blob at the end of the tube.
  elev.push(hcyl(0.20, 0.20, 0.55, 12, SHADE, 'x', { x: 5.48 }));
  elev.push(hcyl(0.26, 0.26, 0.12, 12, SHADE, 'x', { x: 5.28 }));
  elev.push(hcyl(0.26, 0.26, 0.12, 12, SHADE, 'x', { x: 5.64 }));
  for (const sz of [1, -1] as const) {
    elev.push(hbox(0.24, 0.18, 0.07, { c: '#1c1c18', r: 0.6, m: 0.6 }, { x: 5.48, y: 0, z: sz * 0.18 }));
  }
  elev.push(hcyl(0.14, 0.15, 0.14, 12, SHADE, 'x', { x: 5.84 }));       // tip
  // Recuperator cylinders above, recoil sleigh below.
  for (const sz of [1, -1] as const) {
    elev.push(hcyl(0.09, 0.09, 1.7, 10, SHADE, 'x', { x: 0.30, y: 0.22, z: sz * 0.12 }));
  }
  elev.push(hbox(1.3, 0.20, 0.34, SHADE, { x: 0.12, y: -0.18 }));
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
    parts.push(...treadWheel(-0.15, 0.55, sz * 1.3, M, 0.64, 0.36, 14));
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
  // The V from above is the carriage read. Hairline trails vanish.
  for (const sz of [1, -1] as const) {
    const ry = sz * 0.47;
    parts.push(hbox(3.4, 0.36, 0.28, SHADE, { ry, x: -2.08, y: 0.40, z: sz * 1.04 }));
    parts.push(hbox(0.55, 0.26, 0.22, BODY, { ry, x: -0.64, y: 0.42, z: sz * 0.34 })); // root gusset
    // Spade, gusset and end lug.
    parts.push(hbox(0.12, 0.62, 0.52, DARKSTEEL, { ry, x: -3.58, y: 0.28, z: sz * 1.82 }));
    parts.push(htrap(0.34, 0.18, 0.06, 0.14, 0.32, BODY, { ry, x: -3.36, y: 0.42, z: sz * 1.70 }));
    parts.push(htorus(0.07, 0.022, STEEL, { ry, x: -3.48, y: 0.64, z: sz * 1.76 }));
    // Clamp blocks and a step plate along each leg.
    parts.push(hbox(0.22, 0.08, 0.26, SHADE, { ry, x: -1.6, y: 0.60, z: sz * 0.84 }));
    parts.push(hbox(0.22, 0.08, 0.26, SHADE, { ry, x: -2.5, y: 0.60, z: sz * 1.26 }));
  }
  // Aiming stakes clamped along the right trail.
  parts.push(hcyl(0.02, 0.02, 1.3, 5, CANVAS2, 'x', { ry: 0.47, x: -1.9, y: 0.62, z: 0.93 }));
  parts.push(hcyl(0.02, 0.02, 1.3, 5, { c: '#6a6252', r: 0.9, m: 0.05 }, 'x', { ry: 0.47, x: -1.94, y: 0.66, z: 0.98 }));
  // Panoramic sight head above the left trunnion, matte glass.
  parts.push(hcyl(0.045, 0.05, 0.22, 8, SHADE, 'y', { x: 0.05, y: 1.32, z: 0.35 }));
  parts.push(hbox(0.14, 0.14, 0.12, SHADE, { x: 0.05, y: 1.48, z: 0.35 }));
  parts.push(hbox(0.015, 0.08, 0.08, OPTIC, { x: 0.13, y: 1.48, z: 0.35 }));

  const merged = mergeHero(parts);
  // Guns sit lower than an IFV hull. Extra scale is a silhouette lie so
  // the tube / trails read at boot height without touching armor.
  merged.scale(HERO_SCALE * 1.42, HERO_SCALE * 1.42, HERO_SCALE * 1.42);
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
