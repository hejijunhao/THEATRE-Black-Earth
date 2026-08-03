// Archetypal vehicle and figure factories (v2-vision §6.1): class
// silhouettes — "an MBT", "an IFV", "a towed gun" — not identified hardware.
// That is a tonal choice as much as a workload one. Faction identity lives
// on the base plate; paint stays realistic-muted with only a subtle
// green/earth split between the two armies. Scale: a tank is ~0.2 world
// units on a ~1.7-unit hex — miniatures, not simulation.

import * as THREE from 'three';
import { FactionId } from '../game/types';
import { cbox, ccyl, ccone, csphere } from './parts';

// Muted paint. UA leans grey-green, RU leans earth-olive — silhouette-level.
const PAINT: Record<FactionId, { hull: string; dark: string; accent: string }> = {
  UA: { hull: '#5d6455', dark: '#3d423a', accent: '#6d7566' },
  RU: { hull: '#5f5a49', dark: '#403c31', accent: '#6e6957' },
};
const TRACK = '#2e2c26';
const TIRE = '#26241f';
const CANVAS_TOP = '#6a6250';
const FIGURE = '#44483e';
const BARREL = '#3a3d36';

export function tank(faction: FactionId): THREE.BufferGeometry[] {
  const p = PAINT[faction];
  const parts: THREE.BufferGeometry[] = [];
  // Tracks
  parts.push(cbox(0.2, 0.028, 0.032, TRACK, 0, 0.014, -0.038));
  parts.push(cbox(0.2, 0.028, 0.032, TRACK, 0, 0.014, 0.038));
  // Hull
  parts.push(cbox(0.19, 0.032, 0.085, p.hull, 0, 0.044, 0));
  // Glacis hint
  parts.push(cbox(0.04, 0.026, 0.078, p.accent, 0.085, 0.05, 0));
  if (faction === 'UA') {
    // Angular western-style turret, set slightly back
    parts.push(cbox(0.085, 0.034, 0.062, p.hull, -0.015, 0.078, 0));
  } else {
    // Low rounded turret, centred
    parts.push(ccyl(0.034, 0.042, 0.03, p.hull, -0.005, 0.076, 0, 'y', 8));
  }
  // Gun
  parts.push(ccyl(0.006, 0.006, 0.13, BARREL, 0.075, 0.08, 0, 'x'));
  return parts;
}

export function ifv(faction: FactionId): THREE.BufferGeometry[] {
  const p = PAINT[faction];
  const parts: THREE.BufferGeometry[] = [];
  parts.push(cbox(0.17, 0.026, 0.03, TRACK, 0, 0.013, -0.034));
  parts.push(cbox(0.17, 0.026, 0.03, TRACK, 0, 0.013, 0.034));
  // Sloped hull: lower + upper offset box
  parts.push(cbox(0.165, 0.03, 0.075, p.hull, 0, 0.04, 0));
  parts.push(cbox(0.12, 0.026, 0.068, p.accent, -0.012, 0.066, 0));
  // Small one-man turret with autocannon
  parts.push(cbox(0.045, 0.024, 0.04, p.dark, 0.01, 0.09, 0));
  parts.push(ccyl(0.004, 0.004, 0.09, BARREL, 0.06, 0.094, 0, 'x'));
  return parts;
}

export function lightTruck(faction: FactionId): THREE.BufferGeometry[] {
  const p = PAINT[faction];
  const parts: THREE.BufferGeometry[] = [];
  for (const zx of [-0.05, 0.05]) {
    parts.push(ccyl(0.016, 0.016, 0.02, TIRE, zx, 0.016, -0.036, 'z', 8));
    parts.push(ccyl(0.016, 0.016, 0.02, TIRE, zx, 0.016, 0.036, 'z', 8));
  }
  parts.push(cbox(0.05, 0.04, 0.07, p.hull, 0.05, 0.05, 0)); // cab
  parts.push(cbox(0.1, 0.036, 0.072, CANVAS_TOP, -0.03, 0.052, 0)); // canvas bed
  return parts;
}

export function supplyTruck(faction: FactionId): THREE.BufferGeometry[] {
  const parts = lightTruck(faction);
  // Fuel drums beside the truck: the supply state made visible.
  parts.push(ccyl(0.012, 0.012, 0.024, '#5a4f3a', -0.02, 0.012, 0.062, 'y', 8));
  parts.push(ccyl(0.012, 0.012, 0.024, '#5a4f3a', 0.008, 0.012, 0.062, 'y', 8));
  return parts;
}

export function towedGun(faction: FactionId): THREE.BufferGeometry[] {
  const p = PAINT[faction];
  const parts: THREE.BufferGeometry[] = [];
  // Wheels
  parts.push(ccyl(0.02, 0.02, 0.016, TIRE, 0, 0.02, -0.03, 'z', 8));
  parts.push(ccyl(0.02, 0.02, 0.016, TIRE, 0, 0.02, 0.03, 'z', 8));
  // Cradle + shield
  parts.push(cbox(0.04, 0.022, 0.05, p.hull, 0, 0.036, 0));
  parts.push(cbox(0.008, 0.03, 0.06, p.accent, 0.016, 0.05, 0));
  // Barrel, elevated
  const barrel = ccyl(0.005, 0.007, 0.14, BARREL, 0, 0, 0, 'x');
  barrel.applyMatrix4(new THREE.Matrix4().makeRotationZ(0.28));
  barrel.applyMatrix4(new THREE.Matrix4().makeTranslation(0.055, 0.055, 0));
  parts.push(barrel);
  // Split trails to the rear
  parts.push(cbox(0.09, 0.01, 0.012, p.dark, -0.05, 0.02, -0.018, 0.18));
  parts.push(cbox(0.09, 0.01, 0.012, p.dark, -0.05, 0.02, 0.018, -0.18));
  return parts;
}

export function mrap(faction: FactionId): THREE.BufferGeometry[] {
  const p = PAINT[faction];
  const parts: THREE.BufferGeometry[] = [];
  for (const zx of [-0.045, 0.05]) {
    parts.push(ccyl(0.018, 0.018, 0.02, TIRE, zx, 0.018, -0.034, 'z', 8));
    parts.push(ccyl(0.018, 0.018, 0.02, TIRE, zx, 0.018, 0.034, 'z', 8));
  }
  // Tall v-hull cab with angled hood
  parts.push(cbox(0.09, 0.05, 0.062, p.hull, -0.015, 0.056, 0));
  parts.push(cbox(0.045, 0.032, 0.058, p.accent, 0.055, 0.046, 0));
  // Sensor mast
  parts.push(ccyl(0.003, 0.003, 0.05, p.dark, -0.04, 0.1, 0, 'y'));
  return parts;
}

export function figure(): THREE.BufferGeometry[] {
  // Deliberately abstract: silhouette-level only (v2-vision §6.1). Sized
  // symbolically — a figure must read at gameplay camera height.
  return [
    cbox(0.026, 0.068, 0.02, FIGURE, 0, 0.034, 0),
    csphere(0.014, '#3c4038', 0, 0.082, 0),
  ];
}

export function droneMast(faction: FactionId): THREE.BufferGeometry[] {
  const p = PAINT[faction];
  return [
    ccyl(0.0035, 0.0035, 0.09, p.dark, 0, 0.045, 0, 'y'),
    cbox(0.03, 0.004, 0.03, p.accent, 0, 0.092, 0),
  ];
}

export function smokePuffs(): THREE.BufferGeometry[] {
  return [
    csphere(0.02, '#8b877d', 0.1, 0.1, -0.01),
    csphere(0.014, '#9a968c', 0.12, 0.13, 0.012),
    csphere(0.01, '#a5a198', 0.13, 0.16, -0.006),
  ];
}
