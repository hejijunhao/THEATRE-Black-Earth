// Archetypal vehicle and figure factories (v2-vision §6.1): class
// silhouettes — "an MBT", "an IFV", "a towed gun" — not identified hardware.
// That is a tonal choice as much as a workload one. Faction identity lives
// on the base plate; paint stays realistic-muted with only a subtle
// green/earth split between the two armies. Scale: a tank is ~0.2 world
// units on a ~1.7-unit hex — miniatures, not simulation.

import * as THREE from 'three';
import { FactionId } from '../game/types';
import { cbox, ccyl, ccone, csphere, ctrap } from './parts';

// Muted paint. UA leans grey-green, RU leans earth-olive — silhouette-level.
const PAINT: Record<FactionId, { hull: string; dark: string; accent: string }> = {
  UA: { hull: '#5d6455', dark: '#3d423a', accent: '#6d7566' },
  RU: { hull: '#5f5a49', dark: '#403c31', accent: '#6e6957' },
};
const TRACK = '#2e2c26';
const TIRE = '#1a1814';
const CANVAS_TOP = '#2a281e';
const FIGURE = '#2e3824';
const FIGURE_DARK = '#1c2416';
const FIGURE_HELM = '#24301c';
const FIGURE_RIM = '#3c4a2c';
const RIFLE = '#14160e';
const BARREL = '#3a3d36';
const GLASS = '#101410';

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

// High-detail modern German-pattern MBT (Leopard-family idiom, class-level:
// wedge appliqué turret, long thermal-sleeved smoothbore, seven road wheels,
// raked glacis, side skirts). Still archetypal — no insignia, no unit
// markings; faction identity stays on the base plate. Recessed and lower
// surfaces are painted a step darker, top plates a step lighter: baked
// ambient occlusion is what makes a flat-shaded miniature read at this
// scale. ~85 parts / ~1.4k triangles, merging to one draw call like every
// other factory. Ledger status: review.
export function panzer(faction: FactionId): THREE.BufferGeometry[] {
  const p = PAINT[faction];
  const RUBBER = '#33352c';
  const WHEEL = '#3f4239';
  const SLEEVE = '#484b41';
  const OPTIC = '#3f4a47';
  const STEEL = '#4a4a42';
  const parts: THREE.BufferGeometry[] = [];

  // --- Running gear (per side) -------------------------------------------
  for (const s of [1, -1] as const) {
    // Lower track run and the dark track body behind the wheels.
    parts.push(cbox(0.186, 0.007, 0.026, TRACK, -0.002, 0.0035, s * 0.041));
    parts.push(cbox(0.18, 0.026, 0.018, TRACK, -0.002, 0.016, s * 0.037));
    // Seven road wheels, drive sprocket aft, idler forward.
    for (let i = 0; i < 7; i++) {
      parts.push(ccyl(0.0125, 0.0125, 0.009, WHEEL, -0.075 + i * 0.024, 0.0125, s * 0.0455, 'z', 8));
    }
    parts.push(ccyl(0.0115, 0.0115, 0.01, WHEEL, -0.092, 0.013, s * 0.0455, 'z', 8));
    parts.push(ccyl(0.0105, 0.0105, 0.009, WHEEL, 0.086, 0.014, s * 0.0455, 'z', 8));
    // Skirts: heavy ballistic block over the front third, rubber aft, with
    // proud seam strips marking the panel divisions.
    parts.push(cbox(0.058, 0.026, 0.008, p.hull, 0.066, 0.041, s * 0.0555));
    parts.push(cbox(0.132, 0.022, 0.005, RUBBER, -0.03, 0.041, s * 0.055));
    for (const xk of [-0.066, -0.03, 0.006]) {
      parts.push(cbox(0.0022, 0.02, 0.002, p.dark, xk, 0.041, s * 0.0575));
    }
    parts.push(cbox(0.005, 0.016, 0.024, RUBBER, -0.1005, 0.032, s * 0.041)); // mud flap
    parts.push(cbox(0.02, 0.004, 0.024, p.accent, 0.09, 0.05, s * 0.043)); // front fender
  }

  // --- Hull ---------------------------------------------------------------
  parts.push(cbox(0.192, 0.024, 0.054, p.dark, 0, 0.032, 0)); // tub between tracks
  // Sponson body with slightly sloped sides.
  parts.push(ctrap(0.128, 0.104, 0.126, 0.098, 0.018, p.hull, -0.036, 0.046, 0, -0.001, 0));
  // The long raked glacis, nose plate below it.
  parts.push(ctrap(0.072, 0.104, 0.008, 0.096, 0.0175, p.accent, 0.064, 0.046, 0, -0.032, 0));
  parts.push(ctrap(0.008, 0.088, 0.008, 0.1, 0.016, p.hull, 0.092, 0.03, 0, 0.006, 0));
  parts.push(cbox(0.006, 0.0035, 0.02, p.dark, 0.04, 0.0645, 0.02)); // driver periscopes
  // Engine deck: raised plate with two dark intake louvre fields.
  parts.push(cbox(0.07, 0.005, 0.092, p.accent, -0.062, 0.0655, 0));
  parts.push(cbox(0.022, 0.0025, 0.08, p.dark, -0.048, 0.0685, 0));
  parts.push(cbox(0.022, 0.0025, 0.08, p.dark, -0.078, 0.0685, 0));
  parts.push(cbox(0.004, 0.014, 0.02, p.dark, -0.1005, 0.052, 0.03)); // exhaust grilles
  parts.push(cbox(0.004, 0.014, 0.02, p.dark, -0.1005, 0.052, -0.03));
  parts.push(ccyl(0.0013, 0.0013, 0.075, STEEL, -0.02, 0.065, 0.048, 'x', 5)); // tow cable

  // --- Turret -------------------------------------------------------------
  parts.push(ctrap(0.092, 0.068, 0.084, 0.058, 0.03, p.hull, -0.018, 0.064, 0, -0.002, 0));
  parts.push(cbox(0.08, 0.0025, 0.054, p.accent, -0.02, 0.0945, 0)); // roof plate
  // The signature wedge: two spaced appliqué slabs meeting at a forward apex;
  // the gap behind them stays open — that hollow *is* the spaced armour.
  parts.push(cbox(0.05, 0.026, 0.007, p.hull, 0.041, 0.078, 0.0188, 0.795));
  parts.push(cbox(0.05, 0.026, 0.007, p.hull, 0.041, 0.078, -0.0188, -0.795));
  parts.push(cbox(0.016, 0.018, 0.022, p.dark, 0.032, 0.078, 0)); // mantlet in the gap

  // Smoothbore in five sections: base tube, thermal sleeves either side of
  // the bore evacuator, bare muzzle, reference-sensor block on top.
  parts.push(ccyl(0.0048, 0.0048, 0.026, BARREL, 0.053, 0.079, 0, 'x', 8));
  parts.push(ccyl(0.0058, 0.0058, 0.034, SLEEVE, 0.083, 0.079, 0, 'x', 8));
  parts.push(ccyl(0.0072, 0.0072, 0.015, BARREL, 0.1075, 0.079, 0, 'x', 8));
  parts.push(ccyl(0.0056, 0.0056, 0.042, SLEEVE, 0.136, 0.079, 0, 'x', 8));
  parts.push(ccyl(0.0044, 0.0044, 0.02, BARREL, 0.167, 0.079, 0, 'x', 8));
  parts.push(cbox(0.005, 0.0045, 0.0045, p.dark, 0.1745, 0.0835, 0));

  // Roof fit: gunner's primary sight, hatch rings, panoramic sight pedestal,
  // loader's MG, crosswind mast. Optics get a muted glass chip, never a glow.
  parts.push(cbox(0.013, 0.006, 0.012, p.dark, 0.01, 0.0965, 0.016));
  parts.push(cbox(0.01, 0.0025, 0.009, OPTIC, 0.0145, 0.097, 0.016));
  parts.push(ccyl(0.0088, 0.0088, 0.003, p.accent, -0.034, 0.0965, 0.0155, 'y', 8));
  parts.push(ccyl(0.007, 0.007, 0.002, p.hull, -0.034, 0.0985, 0.0155, 'y', 8));
  parts.push(ccyl(0.0082, 0.0082, 0.003, p.accent, -0.03, 0.0965, -0.017, 'y', 8));
  parts.push(ccyl(0.003, 0.003, 0.008, p.dark, -0.048, 0.098, 0.004, 'y', 6));
  parts.push(cbox(0.007, 0.0075, 0.006, p.dark, -0.048, 0.1055, 0.004));
  parts.push(cbox(0.0015, 0.004, 0.0045, OPTIC, -0.0445, 0.1055, 0.004));
  parts.push(ccyl(0.0012, 0.0012, 0.02, BARREL, -0.018, 0.1005, -0.021, 'x', 5));
  parts.push(cbox(0.002, 0.005, 0.002, p.dark, -0.026, 0.0985, -0.021));
  parts.push(ccyl(0.0011, 0.0011, 0.015, p.dark, -0.058, 0.1015, 0, 'y', 5));

  // Bustle rack: floor, rails, two canvas stowage lumps; whip antennas.
  parts.push(cbox(0.018, 0.0025, 0.052, p.dark, -0.073, 0.0765, 0));
  parts.push(cbox(0.0025, 0.009, 0.052, p.dark, -0.0835, 0.0815, 0));
  parts.push(cbox(0.018, 0.009, 0.0025, p.dark, -0.073, 0.0815, 0.0255));
  parts.push(cbox(0.018, 0.009, 0.0025, p.dark, -0.073, 0.0815, -0.0255));
  parts.push(cbox(0.013, 0.008, 0.019, '#5b5443', -0.072, 0.082, 0.011));
  parts.push(cbox(0.012, 0.007, 0.016, '#544e3e', -0.072, 0.0815, -0.012));
  parts.push(ccyl(0.0008, 0.0008, 0.024, p.dark, -0.06, 0.106, 0.024, 'y', 4));
  parts.push(ccyl(0.0008, 0.0008, 0.024, p.dark, -0.06, 0.106, -0.024, 'y', 4));
  parts.push(cbox(0.02, 0.014, 0.005, p.accent, -0.044, 0.079, 0.0335)); // side stowage bin

  // Smoke-discharger banks, three tubes a side, splayed forward and up.
  for (const s of [1, -1] as const) {
    for (let i = 0; i < 3; i++) {
      const t = ccyl(0.0024, 0.0024, 0.01, p.dark, 0, 0, 0, 'x', 5);
      t.applyMatrix4(new THREE.Matrix4().makeRotationZ(0.5));
      t.applyMatrix4(new THREE.Matrix4().makeRotationY(s * -0.7));
      t.applyMatrix4(new THREE.Matrix4().makeTranslation(0.02 - i * 0.0065, 0.083, s * (0.0335 + i * 0.0012)));
      parts.push(t);
    }
  }

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
    parts.push(ccyl(0.010, 0.010, 0.008, p.dark, zx, 0.016, -0.036, 'z', 6));
    parts.push(ccyl(0.016, 0.016, 0.02, TIRE, zx, 0.016, 0.036, 'z', 8));
    parts.push(ccyl(0.010, 0.010, 0.008, p.dark, zx, 0.016, 0.036, 'z', 6));
  }
  parts.push(cbox(0.11, 0.012, 0.068, p.dark, 0.0, 0.022, 0)); // chassis
  parts.push(cbox(0.048, 0.038, 0.068, p.hull, 0.052, 0.052, 0)); // cab
  parts.push(cbox(0.028, 0.016, 0.056, GLASS, 0.068, 0.058, 0)); // windshield
  parts.push(cbox(0.092, 0.032, 0.066, CANVAS_TOP, -0.028, 0.048, 0)); // canvas bed
  return parts;
}

// Infantry command wagon: cab / canvas / wheels / whip antenna. Same
// scale as lightTruck so it stays a truck, not a barn, but the parts
// separate so mid-zoom reads "soft-skin" instead of a pale plate.
export function commandTruck(faction: FactionId): THREE.BufferGeometry[] {
  const parts = lightTruck(faction);
  const p = PAINT[faction];
  parts.push(ccyl(0.0022, 0.0022, 0.055, p.dark, 0.042, 0.094, 0.018, 'y', 5));
  parts.push(cbox(0.012, 0.008, 0.028, p.dark, 0.052, 0.074, 0.028)); // wing mirror block
  parts.push(cbox(0.018, 0.006, 0.062, p.accent, 0.078, 0.030, 0)); // bumper
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
  // Chunky 15mm-style infantry, still abstract (no face, no wounds).
  // Mid-zoom read is a squat person + a thick rifle. Near-black pins
  // alias away on the plate shadow; mid-olive stamps on khaki. Infantry
  // composition scales this up; mech/recon dismounts keep the raw size.
  const parts: THREE.BufferGeometry[] = [
    cbox(0.040, 0.036, 0.028, FIGURE, 0.002, 0.050, 0),           // torso
    cbox(0.016, 0.032, 0.016, FIGURE_DARK, -0.006, 0.016, 0.008), // rear leg
    cbox(0.016, 0.032, 0.016, FIGURE_DARK, 0.010, 0.016, -0.008), // stride leg
    cbox(0.046, 0.012, 0.030, FIGURE_RIM, 0.000, 0.070, 0),       // shoulders
    cbox(0.018, 0.022, 0.016, FIGURE_DARK, -0.016, 0.052, 0),     // pack
    csphere(0.012, FIGURE_HELM, 0.002, 0.082, 0),                 // head
    ccyl(0.014, 0.015, 0.010, FIGURE_HELM, 0.002, 0.092, 0, 'y', 6), // helmet
    cbox(0.014, 0.008, 0.014, FIGURE_RIM, 0.002, 0.098, 0),       // helmet rim
    cbox(0.024, 0.012, 0.012, FIGURE, 0.020, 0.054, 0.014),       // support arm
    cbox(0.026, 0.010, 0.010, FIGURE_DARK, -0.006, 0.048, -0.016), // off arm
    ccyl(0.0048, 0.0044, 0.072, RIFLE, 0.040, 0.050, 0.015, 'x', 6), // barrel
    cbox(0.020, 0.010, 0.010, RIFLE, 0.004, 0.048, 0.015),        // stock
    cbox(0.010, 0.012, 0.008, RIFLE, 0.020, 0.054, 0.015),        // receiver
  ];
  return parts;
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
