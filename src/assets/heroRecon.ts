// Hero-grade 4x4 reconnaissance vehicle (Fennek-family idiom, class-level —
// no insignia, no catalogued marks). Low angular hull, long sloped bonnet,
// big road tires, and the class signature: an elevating sensor mast aft of
// the crew compartment. Same doctrine as the other hero factories.

import * as THREE from 'three';
import { FactionId } from '../game/types';
import {
  HERO_SCALE, getHeroMaterial, hbox, hcyl, heroMats, hsphere, htorus, htrap, mergeHero,
} from './heroParts';
import { treadWheel } from './heroAssemblies';

export function makeReconHeroGeometry(faction: FactionId): THREE.BufferGeometry {
  const M = heroMats(faction);
  const { BODY, TOP, SHADE, RUBBER, STEEL, DARKSTEEL, CANVAS2, OPTIC } = M;
  const parts: THREE.BufferGeometry[] = [];

  // ---- Wheels, axles, suspension -----------------------------------------
  for (const s of [1, -1] as const) {
    for (const ax of [1.6, -1.6]) {
      parts.push(...treadWheel(ax, 0.5, s * 1.02, M, 0.5, 0.34, 14));
      // Coil spring stack and upper arm behind each wheel.
      parts.push(htorus(0.09, 0.028, DARKSTEEL, { rx: Math.PI / 2, x: ax, y: 0.62, z: s * 0.82 }));
      parts.push(htorus(0.09, 0.028, DARKSTEEL, { rx: Math.PI / 2, x: ax, y: 0.72, z: s * 0.82 }));
      parts.push(hbox(0.4, 0.08, 0.1, DARKSTEEL, { x: ax - 0.3, y: 0.55, z: s * 0.85 }));
    }
  }
  for (const ax of [1.6, -1.6]) {
    parts.push(hcyl(0.05, 0.05, 2.0, 8, DARKSTEEL, 'z', { x: ax, y: 0.5 }));
    parts.push(hsphere(0.14, DARKSTEEL, { x: ax, y: 0.5, z: 0.12 })); // differential
  }
  parts.push(hcyl(0.04, 0.04, 2.9, 8, DARKSTEEL, 'x', { x: 0, y: 0.5, z: 0.12 })); // drive shaft
  parts.push(htrap(1.0, 1.5, 0.9, 1.4, 0.08, SHADE, { x: 2.2, y: 0.42 })); // front skid plate
  // Exhaust: muffler and pipe low on the right sill.
  parts.push(hbox(0.7, 0.16, 0.14, DARKSTEEL, { x: -0.5, y: 0.62, z: 1.06 }));
  parts.push(hcyl(0.045, 0.045, 1.1, 8, DARKSTEEL, 'x', { x: -1.35, y: 0.6, z: 1.06 }));

  // ---- Hull ---------------------------------------------------------------
  parts.push(htrap(5.2, 1.5, 5.3, 2.3, 0.5, SHADE, { x: 0, y: 0.55 }, 0, 0)); // v-flare tub
  parts.push(hbox(5.3, 0.42, 2.3, BODY, { x: 0, y: 1.26 }));                  // mid hull band
  // Bonnet: low block and long sloped top running to the nose.
  parts.push(hbox(2.05, 0.3, 2.25, BODY, { x: 1.78, y: 1.2 }));
  parts.push(htrap(2.05, 2.25, 0.12, 2.15, 0.12, TOP, { x: 1.78, y: 1.35 }, -0.9, 0));
  // Windshield: raked glass with frame pillars, wipers.
  parts.push(hbox(0.42, 0.05, 1.9, OPTIC, { rz: -0.75, x: 0.6, y: 1.6 }));
  parts.push(hbox(0.46, 0.04, 0.08, BODY, { rz: -0.75, x: 0.6, y: 1.6, z: 0 }));
  for (const s of [1, -1] as const) {
    parts.push(hbox(0.46, 0.04, 0.07, BODY, { rz: -0.75, x: 0.6, y: 1.6, z: s * 0.93 }));
    parts.push(hbox(0.28, 0.015, 0.03, DARKSTEEL, { rz: -0.75, ry: s * 0.2, x: 0.66, y: 1.63, z: s * 0.42 }));
  }
  parts.push(hbox(1.15, 0.08, 2.1, TOP, { x: -0.12, y: 1.77 }));  // cab roof
  parts.push(hbox(2.1, 0.5, 2.2, BODY, { x: -1.75, y: 1.3 }));    // rear body
  parts.push(hbox(2.1, 0.035, 2.14, TOP, { x: -1.75, y: 1.57 })); // rear deck skin
  parts.push(htrap(0.5, 2.1, 0.1, 2.05, 0.22, TOP, { x: -0.55, y: 1.57 }, 0.18, 0)); // cab-to-deck step
  // Wheel arch flares and dark inner wells.
  for (const s of [1, -1] as const) {
    for (const ax of [1.6, -1.6]) {
      parts.push(hbox(1.3, 0.1, 0.3, BODY, { x: ax, y: 1.12, z: s * 1.12 }));
      parts.push(hbox(1.2, 0.45, 0.24, SHADE, { x: ax, y: 0.85, z: s * 1.08 }));
      parts.push(hbox(0.06, 0.28, 0.28, RUBBER, { x: ax + (ax > 0 ? -0.72 : 0.72), y: 0.42, z: s * 1.05 })); // mud flaps
    }
    // Door seams, handles, and a vision block per side.
    for (const dx of [0.15, -0.85]) {
      parts.push(hbox(0.03, 0.55, 0.025, SHADE, { x: dx, y: 1.28, z: s * 1.16 }));
      parts.push(hbox(0.12, 0.04, 0.05, STEEL, { x: dx - 0.25, y: 1.38, z: s * 1.165 }));
    }
    parts.push(hbox(0.28, 0.12, 0.03, OPTIC, { x: -0.35, y: 1.52, z: s * 1.165 }));
    // Mirror arms with heads.
    parts.push(hcyl(0.015, 0.015, 0.4, 5, STEEL, 'y', { rx: s * 0.5, x: 0.95, y: 1.62, z: s * 1.25 }));
    parts.push(hbox(0.04, 0.22, 0.14, DARKSTEEL, { x: 0.95, y: 1.82, z: s * 1.35 }));
  }
  // Bow: brush-bar frame, recessed headlights, tow hooks.
  parts.push(hcyl(0.03, 0.03, 2.0, 8, STEEL, 'z', { x: 2.88, y: 1.05 }));
  for (const s of [1, -1] as const) {
    parts.push(hcyl(0.03, 0.03, 0.45, 8, STEEL, 'y', { x: 2.86, y: 0.85, z: s * 0.95 }));
    parts.push(hcyl(0.075, 0.075, 0.1, 10, DARKSTEEL, 'x', { x: 2.78, y: 1.12, z: s * 0.75 }));
    parts.push(hcyl(0.06, 0.06, 0.012, 10, OPTIC, 'x', { x: 2.84, y: 1.12, z: s * 0.75 }));
    parts.push(hbox(0.06, 0.16, 0.09, STEEL, { x: 2.85, y: 0.68, z: s * 0.55 }));
  }
  // Roof: driver hatch, commander ring with MG, stowage basket right.
  parts.push(hcyl(0.26, 0.26, 0.04, 12, BODY, 'y', { x: 0.05, y: 1.83, z: -0.55 }));
  parts.push(hcyl(0.28, 0.28, 0.045, 14, BODY, 'y', { x: -0.35, y: 1.83, z: 0.45 }));
  parts.push(hcyl(0.24, 0.24, 0.035, 14, TOP, 'y', { x: -0.35, y: 1.87, z: 0.45 }));
  parts.push(hcyl(0.025, 0.025, 0.18, 6, STEEL, 'y', { x: -0.05, y: 1.92, z: 0.45 }));
  parts.push(hbox(0.3, 0.08, 0.06, DARKSTEEL, { rz: 0.08, x: 0.1, y: 2.0, z: 0.45 }));
  parts.push(hcyl(0.018, 0.018, 0.45, 6, DARKSTEEL, 'x', { rz: 0.08, x: 0.45, y: 2.03, z: 0.45 }));
  parts.push(hbox(0.1, 0.09, 0.06, CANVAS2, { x: 0.05, y: 1.98, z: 0.35 })); // ammo pouch
  // Stowage basket on the rear deck right: rails and slat floor.
  parts.push(hcyl(0.02, 0.02, 1.3, 6, DARKSTEEL, 'x', { x: -1.9, y: 1.78, z: 0.95 }));
  parts.push(hcyl(0.02, 0.02, 1.3, 6, DARKSTEEL, 'x', { x: -1.9, y: 1.78, z: 0.35 }));
  for (const px of [-1.3, -2.5]) {
    parts.push(hcyl(0.02, 0.02, 0.6, 6, DARKSTEEL, 'z', { x: px, y: 1.78, z: 0.65 }));
    parts.push(hcyl(0.018, 0.018, 0.18, 5, DARKSTEEL, 'y', { x: px, y: 1.68, z: 0.95 }));
    parts.push(hcyl(0.018, 0.018, 0.18, 5, DARKSTEEL, 'y', { x: px, y: 1.68, z: 0.35 }));
  }
  parts.push(hbox(1.1, 0.03, 0.55, SHADE, { x: -1.9, y: 1.6, z: 0.65 }));
  parts.push(hsphere(0.18, CANVAS2, { x: -2.15, y: 1.72, z: 0.6 })); // duffel in basket
  // The signature: elevating sensor mast aft-centre, head panned slightly.
  parts.push(hbox(0.42, 0.16, 0.42, BODY, { x: -1.3, y: 1.66, z: -0.45 }));
  parts.push(hcyl(0.06, 0.07, 0.5, 8, DARKSTEEL, 'y', { x: -1.3, y: 1.95, z: -0.45 }));
  parts.push(hcyl(0.04, 0.05, 0.45, 8, DARKSTEEL, 'y', { x: -1.3, y: 2.42, z: -0.45 }));
  parts.push(hbox(0.42, 0.3, 0.28, SHADE, { ry: 0.35, x: -1.3, y: 2.78, z: -0.45 }));
  parts.push(hbox(0.02, 0.16, 0.16, OPTIC, { ry: 0.35, x: -1.09, y: 2.8, z: -0.38 }));
  parts.push(hbox(0.02, 0.08, 0.1, OPTIC, { ry: 0.35, x: -1.1, y: 2.72, z: -0.52 }));
  parts.push(hbox(0.1, 0.06, 0.34, TOP, { ry: 0.35, x: -1.3, y: 2.96, z: -0.45 }));
  // Antennas with spring bases, sat-nav puck.
  for (const [axx, az] of [[-2.6, 0.9], [-2.6, -0.9]] as const) {
    parts.push(hcyl(0.04, 0.05, 0.08, 8, DARKSTEEL, 'y', { x: axx, y: 1.62, z: az }));
    parts.push(htorus(0.026, 0.01, DARKSTEEL, { rx: Math.PI / 2, x: axx, y: 1.68, z: az }));
    parts.push(hcyl(0.01, 0.013, 0.7, 5, DARKSTEEL, 'y', { rx: az > 0 ? 0.12 : -0.12, x: axx, y: 2.04, z: az }));
  }
  parts.push(hcyl(0.05, 0.05, 0.04, 8, SHADE, 'y', { x: -0.7, y: 1.83, z: -0.2 }));
  // Rear face: spare wheel, jerry cans, ladder rungs, taillights.
  const spare = mergeHero(treadWheel(0, 0, 0, M, 0.44, 0.28, 12));
  spare.rotateY(Math.PI / 2);
  spare.translate(-2.92, 1.05, -0.35);
  parts.push(spare);
  for (const jz of [0.55, 0.9]) {
    parts.push(hbox(0.14, 0.42, 0.3, SHADE, { x: -2.88, y: 1.05, z: jz }));
    parts.push(hbox(0.04, 0.08, 0.22, STEEL, { x: -2.96, y: 1.28, z: jz }));
  }
  for (let r = 0; r < 3; r++) {
    parts.push(hbox(0.05, 0.04, 0.3, STEEL, { x: -2.87, y: 0.55 + r * 0.3, z: -0.85 }));
  }
  for (const s of [1, -1] as const) {
    parts.push(hbox(0.06, 0.09, 0.13, DARKSTEEL, { x: -2.84, y: 1.45, z: s * 0.95 }));
    parts.push(hbox(0.02, 0.045, 0.045, { c: '#4a2b25', r: 0.35, m: 0.1 }, { x: -2.87, y: 1.45, z: s * 0.95 }));
  }
  // Bolt rows along the hull band.
  for (const s of [1, -1] as const) {
    for (let bi = 0; bi < 6; bi++) {
      parts.push(hcyl(0.018, 0.018, 0.03, 6, STEEL, 'z', { x: 2.0 - bi * 0.8, y: 1.08, z: s * 1.16 }));
    }
  }

  const merged = mergeHero(parts);
  merged.scale(HERO_SCALE, HERO_SCALE, HERO_SCALE);
  return merged;
}

const geoCache = new Map<FactionId, THREE.BufferGeometry>();

export function makeReconHero(faction: FactionId): {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
} {
  let geometry = geoCache.get(faction);
  if (!geometry) {
    geometry = makeReconHeroGeometry(faction);
    geoCache.set(faction, geometry);
  }
  return { geometry, material: getHeroMaterial() };
}
