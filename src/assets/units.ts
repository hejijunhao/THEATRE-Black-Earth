// Miniature composition (v2-vision §6.2): GameState already carries
// everything needed to make condition legible without a single number.
// strength -> element count (the Civ6 trick), supply -> truck present or
// absent, disorganized -> off-formation scatter, reinforcing -> replacement
// column. Each composed miniature merges to ONE vertex-coloured geometry.

import * as THREE from 'three';
import { mergeGeometries } from '../map/geomUtils';
import { FactionId, UnitType } from '../game/types';
import { place } from './parts';
import {
  droneMast, figure, ifv, lightTruck, mrap, smokePuffs, supplyTruck, tank, towedGun,
} from './vehicles';

export interface MiniatureSpec {
  type: UnitType;
  faction: FactionId;
  tier: 1 | 2 | 3 | 4;        // from strength: ceil(strength / 25)
  supplyTruck: boolean;        // full / supplied
  reinforcing: boolean;
  disorganized: boolean;
  smoke: boolean;              // hasAttacked
}

export function tierFromStrength(strength: number): 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(1, Math.ceil(strength / 25))) as 1 | 2 | 3 | 4;
}

export function miniatureKey(s: MiniatureSpec): string {
  return [s.type, s.faction, s.tier, s.supplyTruck, s.reinforcing, s.disorganized, s.smoke].join('|');
}

// Formation slots on the base plate (base ≈ 0.72 × 0.5, facing -z "north").
const VEHICLE_SLOTS: Array<[number, number, number]> = [
  [-0.16, 0.06, -0.12],
  [0.1, -0.08, 0.1],
  [-0.02, 0.13, 0.28],
  [0.19, 0.1, -0.3],
];
const FIGURE_SLOTS: Array<[number, number]> = [
  [-0.06, -0.16], [0.04, -0.14], [-0.14, -0.1], [0.13, -0.17], [0.0, -0.02],
];
// Fixed off-formation scatter for disorganized units (same for all — the
// pattern reads, the cache stays small).
const SCATTER: Array<[number, number, number]> = [
  [-0.24, 0.14, 0.6],
  [0.2, -0.02, -0.45],
  [0.05, 0.2, 1.1],
  [0.24, 0.16, 0.3],
];

function vehicleFor(type: UnitType, faction: FactionId): THREE.BufferGeometry[] {
  switch (type) {
    case 'armored': return tank(faction);
    case 'mechanized': return ifv(faction);
    case 'artillery': return towedGun(faction);
    case 'recon': return mrap(faction);
    case 'infantry': return lightTruck(faction);
  }
}

const cache = new Map<string, THREE.BufferGeometry>();

export function makeMiniatureGeometry(spec: MiniatureSpec): THREE.BufferGeometry {
  const key = miniatureKey(spec);
  const hit = cache.get(key);
  if (hit) return hit;

  const parts: THREE.BufferGeometry[] = [];
  const slots = spec.disorganized ? SCATTER : VEHICLE_SLOTS.map(([x, z, r]) => [x, z, r * 0.35] as [number, number, number]);

  if (spec.type === 'infantry') {
    // Figures in loose ranks; a light truck appears from tier 2.
    const figures = 1 + spec.tier; // 2..5
    for (let i = 0; i < figures; i++) {
      const [fx, fz] = FIGURE_SLOTS[i % FIGURE_SLOTS.length];
      const sx = spec.disorganized ? fx * 1.7 : fx;
      const sz = spec.disorganized ? fz * 1.6 + 0.06 : fz;
      parts.push(...place(figure(), sx, sz, (i * 37) % 7 * 0.15));
    }
    if (spec.tier >= 2) {
      parts.push(...place(lightTruck(spec.faction), 0.12, 0.14, spec.disorganized ? 0.7 : 0.12));
    }
  } else {
    const count = spec.type === 'recon' ? Math.min(2, Math.ceil(spec.tier / 2)) : spec.tier;
    for (let i = 0; i < count; i++) {
      const [x, z, ry] = slots[i % slots.length];
      parts.push(...place(vehicleFor(spec.type, spec.faction), x, z, ry, spec.disorganized && i === 0 ? 0.06 : 0));
    }
    if (spec.type === 'mechanized' && spec.tier >= 2 && !spec.disorganized) {
      // Dismounts beside the vehicles.
      parts.push(...place(figure(), -0.02, -0.18));
      parts.push(...place(figure(), 0.07, -0.2, 0.4));
    }
    if (spec.type === 'recon') {
      parts.push(...place(droneMast(spec.faction), -0.18, -0.12));
      parts.push(...place(figure(), -0.12, -0.18, 0.2));
    }
    if (spec.type === 'artillery' && spec.tier >= 2) {
      parts.push(...place(lightTruck(spec.faction), -0.18, 0.16, 0.25)); // limber
    }
  }

  if (spec.supplyTruck) {
    parts.push(...place(supplyTruck(spec.faction), 0.24, 0.19, -0.35));
  }
  if (spec.reinforcing) {
    // Replacement column queued at the rear edge.
    parts.push(...place(lightTruck(spec.faction), -0.3, 0.24, 0.05));
    parts.push(...place(lightTruck(spec.faction), -0.36, 0.3, 0.1));
  }
  if (spec.smoke) {
    parts.push(...smokePuffs());
  }

  const merged = mergeGeometries(parts)!;
  cache.set(key, merged);
  return merged;
}

// Earthworks growing with entrenchment 0..4 (v2-vision §4.3): scrape ->
// berm -> trench line -> revetment; dragon's teeth when fortified.
const earthCache = new Map<string, THREE.BufferGeometry>();

export function makeEarthworksGeometry(level: number, fortified: boolean): THREE.BufferGeometry | null {
  const l = Math.min(4, Math.max(0, level));
  if (l === 0 && !fortified) return null;
  const key = `${l}|${fortified}`;
  const hit = earthCache.get(key);
  if (hit) return hit;

  const parts: THREE.BufferGeometry[] = [];
  const EARTH = '#4d4536';
  const segs = l * 2 + 2;
  const radius = 0.46;
  for (let i = 0; i < segs; i++) {
    // Bias the works toward the front (-z) half.
    const a = -Math.PI / 2 + ((i - (segs - 1) / 2) / segs) * Math.PI * 1.5;
    const bx = Math.cos(a) * radius;
    const bz = Math.sin(a) * radius;
    const g = new THREE.BoxGeometry(0.16, 0.014 + l * 0.009, 0.035);
    g.rotateY(-a + Math.PI / 2);
    g.translate(bx, (0.014 + l * 0.009) / 2, bz);
    parts.push(g);
  }
  for (const g of parts) {
    // paint
    const c = new THREE.Color(EARTH);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  if (fortified) {
    const TEETH = '#8b877c';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + ((i - 3) / 7) * Math.PI * 1.6;
      const g = new THREE.ConeGeometry(0.016, 0.03, 4);
      g.translate(Math.cos(a) * 0.56, 0.015, Math.sin(a) * 0.56);
      const c = new THREE.Color(TEETH);
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) {
        arr[k * 3] = c.r;
        arr[k * 3 + 1] = c.g;
        arr[k * 3 + 2] = c.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      parts.push(g);
    }
  }
  const merged = mergeGeometries(parts)!;
  earthCache.set(key, merged);
  return merged;
}
