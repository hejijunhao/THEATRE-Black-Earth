// Miniature composition (v2-vision §6.2): GameState already carries
// everything needed to make condition legible without a single number.
// strength -> element count (the Civ6 trick), supply -> truck present or
// absent, disorganized -> off-formation scatter, reinforcing -> replacement
// column. Each composed miniature merges to ONE vertex-coloured geometry.

import * as THREE from 'three';
import { mergeGeometries } from '../map/geomUtils';
import { FactionId, UnitType } from '../game/types';
import { place } from './parts';
import { HeroUnitType, hasHeroModel } from './heroFleet';
import {
  commandTruck, figure, lightTruck, smokePuffs, supplyTruck,
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

// Where one hero vehicle sits on the base plate. Vehicles are authored +x
// forward, so a slot is a ground position plus a heading; `rz` is the slight
// roll a bogged-down element gets when the formation is disorganized.
export interface HeroSlot {
  x: number;
  z: number;
  ry: number;
  rz: number;
}

// A composed formation: the vertex-coloured props merge to one geometry as
// before, while the fighting vehicles are instance transforms against a
// shared hero geometry. Keeping them apart is what lets a 19k-triangle
// panzer appear four times on a plate without four copies of it in memory.
export interface MiniatureBuild {
  props: THREE.BufferGeometry | null;
  heroType: HeroUnitType | null;
  heroSlots: HeroSlot[];
}

export function tierFromStrength(strength: number): 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(1, Math.ceil(strength / 25))) as 1 | 2 | 3 | 4;
}

export function miniatureKey(s: MiniatureSpec): string {
  return [s.type, s.faction, s.tier, s.supplyTruck, s.reinforcing, s.disorganized, s.smoke].join('|');
}

// Infantry ranks on the plate. Authored figures (person + rifle) plus a
// command truck are the boot-height silhouette — a pale plate must not win.
const INF_RANKS: Array<[number, number]> = Array.from({ length: 24 }, (_, i) => {
  const squad = Math.floor(i / 6), file = i % 3, rank = Math.floor(i % 6 / 3);
  return [-0.23 + file * 0.070 + squad * 0.055, -0.24 + squad * 0.115 + rank * 0.047];
});
const INF_FIGURE_SCALE = 0.65;
const INF_TRUCK_SCALE = 0.85;

// Hero formations are echelons. Vehicles are authored +x forward, and a hero
// hull with its gun reaches ~0.32 across a 0.74 base plate, so a file abreast
// would interpenetrate and a line ahead would not fit four. The diagonal is
// the only layout that takes the full tier — and it is how armour actually
// moves. Symmetric about the plate centre, so strength reads as formation
// depth rather than as a lopsided cluster, and the two off-diagonal corners
// stay clear for the supply truck and the replacement column.
//
// The steps are bounded by the plate, not by taste. A tier-4 panzer echelon
// reaches (0.085·1.5 + 0.162) × (0.115·1.5 + 0.0485) ≈ 0.29 × 0.22, and
// Units.tsx spins the whole formation by up to UNIT_FACING_JITTER against a
// plate that does not turn with it, which costs another ~0.03 in z. That
// lands inside the plate's 0.37 × 0.26 half-extent with a little to spare;
// widening either step, or the jitter, puts tanks over the edge.
const HERO_STEP_X = 0.085;
const HERO_STEP_Z = 0.115;

// Fixed off-formation displacement per slot for disorganized formations —
// same intent as the old miniature scatter: the pattern reads, and it stays
// deterministic (no Math.random anywhere in the asset layer).
const HERO_SCATTER: Array<[number, number, number]> = [
  [0.052, -0.062, 0.55],
  [-0.061, 0.049, -0.42],
  [0.043, 0.072, 0.9],
  [-0.034, -0.055, 0.28],
];

function heroFormation(count: number, disorganized: boolean): HeroSlot[] {
  const slots: HeroSlot[] = [];
  for (let i = 0; i < count; i++) {
    const t = i - (count - 1) / 2;
    let x = -t * HERO_STEP_X;
    let z = t * HERO_STEP_Z;
    // Headings fan by a hair — dead-parallel elements read as CG.
    let ry = (((i * 37) % 7) - 3) * 0.012;
    let rz = 0;
    if (disorganized) {
      const [dx, dz, dr] = HERO_SCATTER[i % HERO_SCATTER.length];
      x += dx;
      z += dz;
      ry += dr;
      if (i === 0) rz = 0.06; // one element bogged, canted off its tracks
    }
    slots.push({ x, z, ry, rz });
  }
  return slots;
}

const cache = new Map<string, MiniatureBuild>();

export function makeMiniatureBuild(spec: MiniatureSpec): MiniatureBuild {
  const key = miniatureKey(spec);
  const hit = cache.get(key);
  if (hit) return hit;

  const parts: THREE.BufferGeometry[] = [];
  const heroType = hasHeroModel(spec.type) ? spec.type : null;
  let heroSlots: HeroSlot[] = [];

  if (heroType === null) {
    // Infantry — no hero factory for this class yet. Rank of rifle figures
    // plus a command truck so the boot read is people, not a ghost plate.
    const figures = Math.min(INF_RANKS.length, spec.tier * 6); // 6..24 in squad echelons
    for (let i = 0; i < figures; i++) {
      const [fx, fz] = INF_RANKS[i];
      const sx = spec.disorganized ? fx * 1.45 : fx;
      const sz = spec.disorganized ? fz * 1.35 + 0.04 : fz;
      parts.push(...place(figure(i), sx, sz, ((i * 37) % 7 - 3) * 0.035, 0, INF_FIGURE_SCALE));
    }
    parts.push(...place(commandTruck(spec.faction), 0.20, 0.06, spec.disorganized ? 0.7 : 0.10, 0, INF_TRUCK_SCALE));
    if (spec.tier >= 3) {
      parts.push(...place(commandTruck(spec.faction), 0.17, 0.17, spec.disorganized ? -0.4 : -0.08, 0, INF_TRUCK_SCALE));
    }
  } else {
    const count = spec.type === 'recon' ? Math.min(2, Math.ceil(spec.tier / 2)) : spec.tier;
    heroSlots = heroFormation(count, spec.disorganized);
    // Foot elements move to the rear-left quarter, which the echelon leaves
    // open — at hero scale they no longer fit between the vehicles.
    if (spec.type === 'mechanized' && spec.tier >= 2 && !spec.disorganized) {
      parts.push(...place(figure(), -0.262, -0.142, 0.3, 0, INF_FIGURE_SCALE));
      parts.push(...place(figure(), -0.309, -0.196, 0.62, 0, INF_FIGURE_SCALE));
    }
    if (spec.type === 'recon') {
      // The hero recon carries its own sensor mast, so the separate
      // droneMast prop is gone; one dismounted scout stays for scale.
      parts.push(...place(figure(), -0.256, -0.166, 0.2, 0, INF_FIGURE_SCALE));
    }
    if (spec.type === 'artillery' && spec.tier >= 2) {
      // Limber parked behind the gun line (guns fire toward +x).
      parts.push(...place(lightTruck(spec.faction), -0.284, -0.164, 0.25));
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

  const build: MiniatureBuild = {
    props: parts.length > 0 ? mergeGeometries(parts) : null,
    heroType,
    heroSlots,
  };
  cache.set(key, build);
  return build;
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
