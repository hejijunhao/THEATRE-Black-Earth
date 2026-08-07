// Hero-grade tracked IFV (Marder-family idiom, class-level — no insignia,
// no catalogued marks). Front drive sprocket, long lower glacis, compact
// autocannon turret, tall troop compartment with rear ramp. Same doctrine
// as panzerHero: metres, one merged draw call, weathering shader finish.

import * as THREE from 'three';
import { FactionId } from '../game/types';
import {
  HERO_SCALE, getHeroMaterial, hbox, hcyl, heroMats, htorus, htrap, mergeHero,
} from './heroParts';
import { linkRun, trackWheel } from './heroAssemblies';

export function makeMechHeroGeometry(faction: FactionId): THREE.BufferGeometry {
  const M = heroMats(faction);
  const { BODY, TOP, SHADE, RUBBER, STEEL, DARKSTEEL, CANVAS2, OPTIC } = M;
  const parts: THREE.BufferGeometry[] = [];

  // ---- Running gear: six stations, drive sprocket FORWARD --------------
  const stations = [-2.3, -1.4, -0.5, 0.4, 1.3, 2.2];
  for (const s of [1, -1] as const) {
    // Dark track body behind the wheels — without it the base plate reads
    // straight through the running gear.
    parts.push(hbox(5.7, 0.55, 0.22, { c: '#2c2b26', r: 0.85, m: 0.3 }, { x: -0.05, y: 0.42, z: s * 1.2 }));
    for (const x of stations) {
      parts.push(...trackWheel(x, 0.4, s * 1.35, M, 0.31, 0.24, 0.14, 6, 0.15));
      parts.push(hbox(0.5, 0.12, 0.1, DARKSTEEL, { rz: 0.6, x: x - 0.2, y: 0.55, z: s * 1.12 }));
    }
    // Drive sprocket forward: twin discs and teeth; idler aft.
    parts.push(hcyl(0.27, 0.27, 0.1, 16, DARKSTEEL, 'z', { x: 2.85, y: 0.46, z: s * 1.42 }));
    parts.push(hcyl(0.27, 0.27, 0.1, 16, DARKSTEEL, 'z', { x: 2.85, y: 0.46, z: s * 1.24 }));
    parts.push(hcyl(0.08, 0.08, 0.3, 8, STEEL, 'z', { x: 2.85, y: 0.46, z: s * 1.33 }));
    for (let tb = 0; tb < 11; tb++) {
      const a = (tb / 11) * Math.PI * 2;
      parts.push(hbox(0.09, 0.1, 0.06, DARKSTEEL, {
        rz: a, x: 2.85 + Math.cos(a) * 0.3, y: 0.46 + Math.sin(a) * 0.3, z: s * 1.42,
      }));
    }
    parts.push(...trackWheel(-2.85, 0.44, s * 1.35, M, 0.27, 0.2, 0.13, 6, 0.12));
    // Track links: bottom run plus both wraps.
    parts.push(...linkRun({
      z: s * 1.35,
      padW: 0.45,
      bottom: { x0: -2.7, x1: 2.55, y: 0.04, pitch: 0.15 },
      wraps: [
        { cx: 2.85, cy: 0.46, r: 0.4, degs: [-70, -45, -20, 5, 30, 55] },
        { cx: -2.85, cy: 0.44, r: 0.38, degs: [-110, -135, -160, -185, -210] },
      ],
    }, M));
    // Shallow skirts: sponson lip plus four hanging rubber panels.
    parts.push(hbox(5.9, 0.16, 0.08, BODY, { x: -0.15, y: 0.98, z: s * 1.6 }));
    for (let i = 0; i < 4; i++) {
      const jig = Math.sin(i * 9.173 + (s + 1) * 2.3) * 0.5;
      parts.push(hbox(1.32, 0.34, 0.05, RUBBER, {
        ry: jig * 0.02, x: 2.05 - 1.42 * i, y: 0.78 + jig * 0.012, z: s * (1.575 + jig * 0.01),
      }));
    }
  }

  // ---- Hull --------------------------------------------------------------
  parts.push(hbox(6.4, 0.5, 2.2, SHADE, { x: 0, y: 0.65, z: 0 })); // belly tub
  parts.push(htrap(6.6, 3.2, 6.5, 3.14, 0.55, BODY, { x: -0.3, y: 0.9 }, 0.02, 0)); // sponson
  // Marder profile: one long lower glacis, short upper glacis to the roof.
  parts.push(htrap(1.5, 3.0, 0.14, 3.14, 0.9, TOP, { x: 2.65, y: 0.55 }, -0.65, 0));
  parts.push(htrap(0.9, 3.1, 0.1, 3.0, 0.4, TOP, { x: 1.6, y: 1.45 }, -0.38, 0));
  // Troop compartment: tall rear box, flat roof.
  parts.push(htrap(4.6, 3.14, 4.55, 2.96, 0.42, BODY, { x: -1.1, y: 1.45 }, -0.02, 0));
  parts.push(hbox(4.5, 0.035, 2.9, TOP, { x: -1.12, y: 1.885 })); // roof skin
  // Rear ramp with seams, handle, convoy kit.
  parts.push(hbox(0.08, 0.95, 2.5, BODY, { x: -3.42, y: 1.32 }));
  for (const rz of [-0.55, 0.55]) {
    parts.push(hbox(0.03, 0.85, 0.035, SHADE, { x: -3.465, y: 1.32, z: rz }));
  }
  parts.push(hbox(0.05, 0.06, 0.4, STEEL, { x: -3.475, y: 1.5, z: 0 }));
  for (const s of [1, -1] as const) {
    parts.push(hbox(0.07, 0.1, 0.14, DARKSTEEL, { x: -3.44, y: 1.72, z: s * 1.25 }));
    parts.push(hbox(0.02, 0.05, 0.05, { c: '#4a2b25', r: 0.35, m: 0.1 }, { x: -3.49, y: 1.72, z: s * 1.25 }));
    parts.push(hbox(0.07, 0.45, 0.55, RUBBER, { x: -3.42, y: 0.62, z: s * 1.3 })); // mud flaps
    parts.push(hbox(0.05, 0.05, 0.57, STEEL, { x: -3.42, y: 0.87, z: s * 1.3 }));
  }
  // Bow: splash board on the glacis, guarded headlights, tow hooks, mirrors.
  parts.push(hbox(0.06, 0.05, 2.7, BODY, { rz: -0.54, x: 2.6, y: 1.0 }));
  for (const s of [1, -1] as const) {
    parts.push(hcyl(0.08, 0.08, 0.14, 10, DARKSTEEL, 'x', { x: 3.1, y: 1.28, z: s * 1.25 }));
    parts.push(hcyl(0.065, 0.065, 0.012, 10, OPTIC, 'x', { x: 3.18, y: 1.28, z: s * 1.25 }));
    parts.push(hbox(0.02, 0.14, 0.2, STEEL, { x: 3.2, y: 1.39, z: s * 1.25, rx: 0.5 }));
    parts.push(hbox(0.06, 0.18, 0.1, STEEL, { x: 3.38, y: 0.8, z: s * 0.8 }));
    parts.push(hcyl(0.028, 0.028, 0.18, 6, STEEL, 'z', { x: 3.43, y: 0.8, z: s * 0.8 }));
    parts.push(hcyl(0.014, 0.014, 0.3, 5, STEEL, 'y', { rx: s * 0.35, x: 2.55, y: 1.62, z: s * 1.48 }));
    parts.push(hbox(0.04, 0.18, 0.12, DARKSTEEL, { x: 2.55, y: 1.79, z: s * 1.53 }));
  }
  // Driver station front-left: hatch and periscope row.
  parts.push(hcyl(0.28, 0.28, 0.04, 12, BODY, 'y', { x: 1.75, y: 1.9, z: -0.85 }));
  for (const pz of [-1.05, -0.85, -0.65]) {
    parts.push(hbox(0.14, 0.06, 0.1, SHADE, { x: 2.0, y: 1.9, z: pz }));
  }
  // Powerpack forward-right: louvred intake field and side exhaust vent.
  parts.push(hbox(1.15, 0.03, 1.0, SHADE, { x: 1.8, y: 1.9, z: 0.62 }));
  for (let i = 0; i < 5; i++) {
    parts.push(hbox(0.07, 0.02, 0.9, DARKSTEEL, { rz: 0.55, x: 1.42 + i * 0.19, y: 1.905, z: 0.62 }));
  }
  parts.push(hbox(0.5, 0.28, 0.08, DARKSTEEL, { x: 2.3, y: 1.55, z: 1.62 }));
  for (let sl = 0; sl < 3; sl++) {
    parts.push(hbox(0.4, 0.05, 0.03, STEEL, { x: 2.3, y: 1.46 + sl * 0.09, z: 1.665 }));
  }
  // Roof rear: two troop hatches, periscope nubs, grab rails, antennas.
  parts.push(hbox(0.75, 0.035, 0.65, BODY, { x: -1.7, y: 1.905, z: 0.55 }));
  parts.push(hbox(0.75, 0.035, 0.65, BODY, { x: -1.7, y: 1.905, z: -0.55 }));
  for (const pz of [0.9, 0.3, -0.3, -0.9]) {
    parts.push(hbox(0.1, 0.07, 0.08, SHADE, { x: -2.45, y: 1.9, z: pz }));
  }
  for (const s of [1, -1] as const) {
    parts.push(hcyl(0.02, 0.02, 0.5, 6, STEEL, 'x', { x: -0.9, y: 1.93, z: s * 1.32 }));
    parts.push(hcyl(0.045, 0.055, 0.09, 8, DARKSTEEL, 'y', { x: -2.95, y: 1.93, z: s * 1.05 }));
    parts.push(htorus(0.028, 0.011, DARKSTEEL, { rx: Math.PI / 2, x: -2.95, y: 1.99, z: s * 1.05 }));
    parts.push(hcyl(0.011, 0.014, 0.75, 5, DARKSTEEL, 'y', { rx: s * 0.12, x: -2.95, y: 2.36, z: s * 1.05 }));
  }
  // Side stowage bins left, pioneer tools and tow cable right.
  parts.push(hbox(0.95, 0.32, 0.14, BODY, { x: 0.1, y: 1.62, z: -1.62 }));
  parts.push(hbox(0.8, 0.32, 0.14, BODY, { x: -1.15, y: 1.62, z: -1.62 }));
  for (const bx of [0.5, -0.3, -0.75, -1.5]) {
    parts.push(hbox(0.06, 0.34, 0.15, STEEL, { x: bx, y: 1.62, z: -1.62 }));
  }
  parts.push(hcyl(0.018, 0.018, 0.85, 6, CANVAS2, 'x', { x: -0.4, y: 1.93, z: 1.38 }));
  parts.push(htrap(0.2, 0.16, 0.14, 0.12, 0.05, STEEL, { x: 0.15, y: 1.915, z: 1.38 }));
  parts.push(hcyl(0.024, 0.024, 2.0, 8, STEEL, 'x', { x: -0.2, y: 1.93, z: 1.5 }));
  // Bolt rows along the sponson band.
  for (const s of [1, -1] as const) {
    for (let bi = 0; bi < 7; bi++) {
      parts.push(hcyl(0.02, 0.02, 0.035, 6, STEEL, 'z', { x: 2.1 - bi * 0.75, y: 1.32, z: s * 1.61 }));
    }
  }

  // ---- Turret: compact, autocannon ---------------------------------------
  parts.push(htrap(1.5, 1.35, 1.3, 1.1, 0.55, BODY, { x: 0.35, y: 1.9 }, -0.05, 0));
  parts.push(hbox(1.24, 0.025, 1.04, TOP, { x: 0.32, y: 2.45 }));
  parts.push(hbox(0.3, 0.4, 0.5, SHADE, { x: 1.05, y: 2.12 })); // mantlet
  // Autocannon: stepped barrel, perforated-sleeve hint, flash hider.
  parts.push(hcyl(0.08, 0.09, 0.7, 10, DARKSTEEL, 'x', { x: 1.55, y: 2.18 }));
  parts.push(hcyl(0.058, 0.065, 1.55, 10, DARKSTEEL, 'x', { x: 2.65, y: 2.18 }));
  parts.push(hcyl(0.078, 0.078, 0.2, 10, DARKSTEEL, 'x', { x: 3.52, y: 2.18 }));
  parts.push(hcyl(0.02, 0.02, 0.5, 6, DARKSTEEL, 'x', { x: 1.7, y: 2.05, z: 0.18 })); // coax
  // Gunner sight, commander hatch with periscope nubs, spotlight.
  parts.push(hbox(0.32, 0.14, 0.3, SHADE, { x: 0.55, y: 2.5, z: -0.25 }));
  parts.push(hbox(0.02, 0.06, 0.2, OPTIC, { x: 0.72, y: 2.51, z: -0.25 }));
  parts.push(hcyl(0.27, 0.27, 0.045, 14, BODY, 'y', { x: 0.05, y: 2.47, z: 0.2 }));
  parts.push(hcyl(0.23, 0.23, 0.035, 14, TOP, 'y', { x: 0.05, y: 2.51, z: 0.2 }));
  for (let pn = 0; pn < 4; pn++) {
    const a = 0.3 + pn * 0.7;
    parts.push(hbox(0.08, 0.06, 0.06, SHADE, {
      ry: -a, x: 0.05 + Math.cos(a) * 0.34, y: 2.47, z: 0.2 + Math.sin(a) * 0.34,
    }));
  }
  parts.push(hcyl(0.09, 0.09, 0.14, 10, DARKSTEEL, 'x', { x: 0.7, y: 2.56, z: 0.3 }));
  parts.push(hcyl(0.075, 0.075, 0.012, 10, OPTIC, 'x', { x: 0.78, y: 2.56, z: 0.3 }));
  // Smoke dischargers: banks of three on each turret rear cheek.
  for (const s of [1, -1] as const) {
    parts.push(hbox(0.26, 0.2, 0.04, BODY, { ry: s * 0.4, x: -0.15, y: 2.2, z: s * 0.66 }));
    for (let i = 0; i < 3; i++) {
      parts.push(hcyl(0.04, 0.04, 0.26, 8, SHADE, 'x', {
        rz: 0.5, ry: s * -(0.7 + 0.14 * i), x: -0.1 - 0.09 * i, y: 2.24, z: s * (0.68 + 0.04 * i),
      }));
    }
  }

  const merged = mergeHero(parts);
  merged.scale(HERO_SCALE, HERO_SCALE, HERO_SCALE);
  return merged;
}

const geoCache = new Map<FactionId, THREE.BufferGeometry>();

export function makeMechHero(faction: FactionId): {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
} {
  let geometry = geoCache.get(faction);
  if (!geometry) {
    geometry = makeMechHeroGeometry(faction);
    geoCache.set(faction, geometry);
  }
  return { geometry, material: getHeroMaterial() };
}
