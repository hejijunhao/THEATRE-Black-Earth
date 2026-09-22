// Operational tank model. Deterministic metre-scale geometry with muted
// vertex paint and diffuse lighting; hull, turret and gun retain their depth.

import * as THREE from 'three';
import { FactionId } from '../game/types';
import {
  HERO_SCALE, getHeroMaterial, hbox, hcyl, hsphere, htorus, htrap, mergeHero,
  heroMats,
} from './heroParts';

export function makePanzerHeroGeometry(faction: FactionId): THREE.BufferGeometry {
  // Dark hull / light turret / dark gun — same silhouette language as MECH.
  // Hull roofs stay SHADE so the turret owns the top-down read.
  const {
    BODY, TOP, SHADE, TRACKM, RUBBER, STEEL, DARKSTEEL, MUZZLE, CANVAS, CANVAS2, OPTIC,
  } = heroMats(faction);
  const parts: THREE.BufferGeometry[] = [];

  // ---- Running gear -------------------------------------------------------
  const stations = [-2.55, -1.7, -0.85, 0, 0.85, 1.7, 2.55];
  for (const s of [1, -1] as const) {
    // Road wheels: rubber tire, painted rim, steel hub, eight hub bolts,
    // and the inner wheel of each dual pair glimpsed behind.
    for (const x of stations) {
      parts.push(hcyl(0.35, 0.35, 0.16, 16, RUBBER, 'z', { x, y: 0.44, z: s * 1.52 }));
      parts.push(hcyl(0.27, 0.27, 0.17, 16, BODY, 'z', { x, y: 0.44, z: s * 1.52 }));
      parts.push(hcyl(0.1, 0.1, 0.2, 10, STEEL, 'z', { x, y: 0.44, z: s * 1.52 }));
      parts.push(hcyl(0.05, 0.05, 0.225, 8, DARKSTEEL, 'z', { x, y: 0.44, z: s * 1.52 }));
      for (let b = 0; b < 8; b++) {
        const a = (b / 8) * Math.PI * 2;
        parts.push(hcyl(0.022, 0.022, 0.21, 6, STEEL, 'z', {
          x: x + Math.cos(a) * 0.17, y: 0.44 + Math.sin(a) * 0.17, z: s * 1.52,
        }));
      }
      parts.push(hcyl(0.35, 0.35, 0.12, 14, SHADE, 'z', { x, y: 0.44, z: s * 1.24 }));
      // Swing arm back to the hull bottom.
      parts.push(hbox(0.55, 0.14, 0.12, DARKSTEEL, { rz: 0.6, x: x - 0.24, y: 0.6, z: s * 1.12 }));
    }
    // Idler (front) and drive sprocket (rear) with teeth.
    parts.push(hcyl(0.3, 0.3, 0.15, 16, RUBBER, 'z', { x: 3.15, y: 0.5, z: s * 1.52 }));
    parts.push(hcyl(0.22, 0.22, 0.16, 12, BODY, 'z', { x: 3.15, y: 0.5, z: s * 1.52 }));
    parts.push(hcyl(0.3, 0.3, 0.12, 16, DARKSTEEL, 'z', { x: -3.2, y: 0.5, z: s * 1.55 }));
    parts.push(hcyl(0.3, 0.3, 0.12, 16, DARKSTEEL, 'z', { x: -3.2, y: 0.5, z: s * 1.31 }));
    parts.push(hcyl(0.09, 0.09, 0.34, 8, STEEL, 'z', { x: -3.2, y: 0.5, z: s * 1.43 }));
    for (let tb = 0; tb < 12; tb++) {
      const a = (tb / 12) * Math.PI * 2;
      parts.push(hbox(0.1, 0.12, 0.07, DARKSTEEL, {
        rz: a, x: -3.2 + Math.cos(a) * 0.34, y: 0.5 + Math.sin(a) * 0.34, z: s * 1.55,
      }));
    }

    // Track: individually placed links — pad + guide horn — along the bottom
    // run and around both wrap arcs; the top run hides behind the skirts.
    const link = (x: number, y: number, ang: number) => {
      parts.push(hbox(0.15, 0.09, 0.62, TRACKM, { rz: ang, x, y, z: s * 1.38 }));
      const hy = 0.075; // horn rides on the pad, rotates with it
      parts.push(hbox(0.05, 0.1, 0.07, TRACKM, {
        rz: ang, x: x - Math.sin(ang) * hy, y: y + Math.cos(ang) * hy, z: s * 1.38,
      }));
      // Hinge end connectors — the joint caps that make a run read segmented.
      for (const ez of [-0.29, 0.29]) {
        parts.push(hbox(0.09, 0.11, 0.07, TRACKM, { rz: ang, x, y, z: s * 1.38 + ez }));
      }
    };
    for (let i = 0; i < 37; i++) link(-3.06 + i * 0.17, 0.045, 0);
    for (const deg of [-75, -55, -35, -15, 5, 25, 45]) {
      const a = (deg * Math.PI) / 180;
      link(3.15 + Math.cos(a) * 0.47, 0.5 + Math.sin(a) * 0.47, a + Math.PI / 2);
    }
    for (const deg of [-105, -130, -155, -180, -205, -230]) {
      const a = (deg * Math.PI) / 180;
      link(-3.2 + Math.cos(a) * 0.47, 0.5 + Math.sin(a) * 0.47, a + Math.PI / 2);
    }

    // Skirts: two heavy ballistic blocks forward (with mounting bolts),
    // six hanging rubber panels aft with seeded per-panel jitter.
    parts.push(hbox(0.9, 0.64, 0.12, BODY, { x: 3.3, y: 0.95, z: s * 1.78 }));
    parts.push(hbox(0.83, 0.6, 0.12, BODY, { x: 2.42, y: 0.97, z: s * 1.78 }));
    for (const bx of [3.55, 3.05, 2.6, 2.2]) {
      parts.push(hcyl(0.035, 0.035, 0.05, 6, STEEL, 'z', { x: bx, y: 1.08, z: s * 1.85 }));
    }
    for (let i = 0; i < 6; i++) {
      const jig = Math.sin(i * 12.9898 + (s + 1) * 3.7) * 0.5; // seeded, not random
      parts.push(hbox(0.86, 0.62, 0.05, RUBBER, {
        ry: jig * 0.02, x: 1.55 - 0.91 * (i + 0.5) + 0.455, y: 0.93 + jig * 0.012, z: s * (1.745 + jig * 0.01),
      }));
    }
  }

  // ---- Hull ---------------------------------------------------------------
  parts.push(hbox(7.5, 0.6, 2.1, SHADE, { x: 0, y: 0.65, z: 0 })); // belly tub
  parts.push(htrap(5.6, 3.4, 5.5, 3.4, 0.6, BODY, { x: -1.05, y: 0.95 }, 0.05, 0)); // sponson body
  // Raked glacis and the nose plate beneath it. Glacis stays BODY so the
  // hull does not light-plate into the turret at boot height.
  parts.push(htrap(2.25, 3.32, 0.12, 3.4, 0.71, BODY, { x: 2.725, y: 0.85 }, -1.06, 0));
  parts.push(htrap(0.4, 3.1, 0.4, 3.32, 0.4, BODY, { x: 3.65, y: 0.45 }, 0.1, 0));
  parts.push(hbox(5.5, 0.04, 3.36, SHADE, { x: -1.09, y: 1.555 })); // roof skin
  parts.push(hcyl(1.02, 1.02, 0.07, 24, BODY, 'y', { x: -0.1, y: 1.585 })); // turret ring collar
  parts.push(hcyl(1.16, 1.16, 0.015, 24, SHADE, 'y', { x: -0.1, y: 1.578 })); // baked ring shadow
  // Driver: hatch disc and three periscopes at the glacis top edge.
  parts.push(hcyl(0.3, 0.3, 0.045, 12, BODY, 'y', { x: 1.05, y: 1.585, z: 0.55 }));
  for (const pz of [0.25, 0.55, 0.85]) {
    parts.push(hbox(0.16, 0.07, 0.11, SHADE, { rz: -0.2, x: 1.58, y: 1.6, z: pz }));
  }
  // Fender-line headlights with brush guards; front tow shackles.
  for (const s of [1, -1] as const) {
    parts.push(hcyl(0.09, 0.09, 0.16, 10, DARKSTEEL, 'x', { x: 3.42, y: 1.42, z: s * 1.5 }));
    parts.push(hcyl(0.075, 0.075, 0.012, 10, OPTIC, 'x', { x: 3.51, y: 1.42, z: s * 1.5 }));
    parts.push(hbox(0.02, 0.16, 0.24, STEEL, { x: 3.53, y: 1.55, z: s * 1.5, rx: 0.5 }));
    parts.push(hbox(0.06, 0.2, 0.1, STEEL, { x: 3.82, y: 0.95, z: s * 0.85 }));
    parts.push(hcyl(0.03, 0.03, 0.2, 6, STEEL, 'z', { x: 3.88, y: 0.95, z: s * 0.85 }));
    parts.push(hbox(0.07, 0.5, 0.62, RUBBER, { x: -3.82, y: 0.75, z: s * 1.38 })); // rear mud flaps
    parts.push(hbox(0.05, 0.06, 0.64, STEEL, { x: -3.82, y: 1.02, z: s * 1.38 })); // flap hinge strip
    // Folding fender mirrors, stowed position.
    parts.push(hcyl(0.015, 0.015, 0.32, 5, STEEL, 'y', { rx: s * 0.35, x: 3.22, y: 1.58, z: s * 1.58 }));
    parts.push(hbox(0.04, 0.2, 0.13, DARKSTEEL, { x: 3.22, y: 1.76, z: s * 1.63 }));
    // Tail-light clusters in brush guards; muted, unlit lens.
    parts.push(hbox(0.07, 0.1, 0.14, DARKSTEEL, { x: -3.85, y: 1.38, z: s * 1.5 }));
    parts.push(hbox(0.02, 0.05, 0.05, { c: '#4a2b25', r: 0.35, m: 0.1 }, { x: -3.89, y: 1.38, z: s * 1.5 }));
  }
  // Splash board lying on the glacis plane; weld beads along its side edges.
  parts.push(hbox(0.07, 0.05, 3.2, BODY, { rz: -0.31, x: 2.3, y: 1.36 }));
  for (const s of [1, -1] as const) {
    parts.push(hcyl(0.018, 0.018, 2.1, 5, BODY, 'x', { rz: -0.31, x: 2.72, y: 1.235, z: s * 1.62 }));
    // Bolt row along the sponson side band.
    for (let bi = 0; bi < 8; bi++) {
      parts.push(hcyl(0.022, 0.022, 0.035, 6, STEEL, 'z', { x: 1.3 - bi * 0.65, y: 1.5, z: s * 1.71 }));
    }
  }
  // Infantry telephone box on the right rear plate.
  parts.push(hbox(0.1, 0.24, 0.18, SHADE, { x: -3.84, y: 1.1, z: 0.8 }));
  // Engine deck: proud frame, two louvred radiator fields, engine hatch.
  // SHADE so the deck is hull, not a second light plate under the turret.
  parts.push(hbox(2.7, 0.035, 3.0, SHADE, { x: -2.5, y: 1.575 }));
  for (const s of [1, -1] as const) {
    parts.push(hbox(1.34, 0.03, 1.16, SHADE, { x: -2.55, y: 1.59, z: s * 0.72 }));
    for (let i = 0; i < 7; i++) {
      parts.push(hbox(0.07, 0.022, 1.04, DARKSTEEL, { rz: 0.55, x: -3.1 + i * 0.185, y: 1.605, z: s * 0.72 }));
    }
    parts.push(hcyl(0.09, 0.09, 0.035, 10, STEEL, 'y', { x: 1.0, y: 1.57, z: s * 1.45 })); // filler caps
    parts.push(hbox(0.55, 0.5, 0.09, DARKSTEEL, { x: -3.83, y: 1.2, z: s * 1.05 })); // exhaust boxes
    for (let sl = 0; sl < 4; sl++) {
      parts.push(hbox(0.03, 0.06, 0.5, STEEL, { x: -3.885, y: 1.03 + sl * 0.12, z: s * 1.05 }));
    }
  }
  parts.push(hbox(1.0, 0.035, 0.9, BODY, { x: -1.55, y: 1.575 }));
  // Grab rails along the sponson sides; tow cable on the right roof edge.
  for (const s of [1, -1] as const) {
    for (const rx of [0.5, -0.7, -1.9]) {
      parts.push(hcyl(0.022, 0.022, 0.55, 6, STEEL, 'x', { x: rx, y: 1.46, z: s * 1.72 }));
      parts.push(hbox(0.04, 0.1, 0.04, STEEL, { x: rx - 0.24, y: 1.42, z: s * 1.71 }));
      parts.push(hbox(0.04, 0.1, 0.04, STEEL, { x: rx + 0.24, y: 1.42, z: s * 1.71 }));
    }
  }
  parts.push(hcyl(0.026, 0.026, 2.6, 8, STEEL, 'x', { x: 0.2, y: 1.585, z: 1.58 }));
  parts.push(htorus(0.055, 0.018, STEEL, { ry: Math.PI / 2, x: 1.55, y: 1.59, z: 1.58 }));
  parts.push(htorus(0.055, 0.018, STEEL, { ry: Math.PI / 2, x: -1.15, y: 1.59, z: 1.58 }));
  // Pioneer tools on the left rear deck edge.
  parts.push(hcyl(0.02, 0.02, 0.95, 6, CANVAS2, 'x', { x: -2.2, y: 1.6, z: -1.42 }));
  parts.push(htrap(0.22, 0.18, 0.16, 0.14, 0.05, STEEL, { x: -1.6, y: 1.585, z: -1.42 }));
  parts.push(hcyl(0.016, 0.016, 1.1, 6, STEEL, 'x', { x: -2.3, y: 1.6, z: -1.56 }));
  // Two spare track links bolted to the rear plate.
  for (const s of [1, -1] as const) {
    parts.push(hbox(0.15, 0.62, 0.09, TRACKM, { x: -3.83, y: 1.25, z: s * 0.45 }));
  }

  // ---- Turret -------------------------------------------------------------
  // Light turret owns the silhouette. Hull stayed BODY/SHADE; this is TOP.
  parts.push(htrap(3.8, 3.0, 3.66, 2.7, 0.82, TOP, { x: -0.45, y: 1.6 }, -0.06, 0));
  parts.push(hbox(3.5, 0.028, 2.52, TOP, { x: -0.5, y: 2.43 })); // roof skin
  // Recessed panel seams so the big flat walls read as built-up plate.
  for (const s of [1, -1] as const) {
    for (const sx of [0.4, -1.2]) {
      parts.push(hbox(0.03, 0.72, 0.024, SHADE, { rx: s * -0.18, x: sx, y: 2.0, z: s * 1.45 }));
    }
    for (const hx of [0.9, -0.3, -2.6]) {
      parts.push(hbox(0.03, 0.55, 0.024, SHADE, { x: hx, y: 1.25, z: s * 1.705 }));
    }
  }
  // The signature spaced wedge: two big inclined slabs meeting at the apex,
  // hollow behind them left open — the shadow gap IS the spaced armour.
  parts.push(hbox(1.95, 0.88, 0.14, TOP, { rx: 0.28, ry: 0.75, x: 2.15, y: 1.97, z: 0.785 }));
  parts.push(hbox(1.95, 0.88, 0.14, TOP, { rx: -0.28, ry: -0.75, x: 2.15, y: 1.97, z: -0.785 }));
  // Two rows of module bolts on each wedge face, transformed with the slab.
  for (const s of [1, -1] as const) {
    const slabM = new THREE.Matrix4()
      .makeTranslation(2.15, 1.97, s * 0.785)
      .multiply(new THREE.Matrix4().makeRotationY(s * 0.75))
      .multiply(new THREE.Matrix4().makeRotationX(s * 0.28));
    for (let bi = 0; bi < 4; bi++) {
      for (const ly of [0.18, -0.16]) {
        const bolt = hcyl(0.032, 0.032, 0.06, 6, STEEL, 'z');
        bolt.applyMatrix4(new THREE.Matrix4().makeTranslation(-0.62 + bi * 0.4, ly, s * 0.095));
        bolt.applyMatrix4(slabM);
        parts.push(bolt);
      }
    }
  }
  parts.push(hbox(0.45, 0.6, 0.7, SHADE, { x: 1.62, y: 1.95 })); // mantlet block
  parts.push(hcyl(0.19, 0.21, 0.5, 12, SHADE, 'x', { x: 2.08, y: 1.95 }));

  // L55-class smoothbore: collar, thermal sleeves either side of the bore
  // evacuator with a clamp ring, bare muzzle, MRS block at the tip.
  parts.push(hcyl(0.165, 0.175, 0.5, 16, DARKSTEEL, 'x', { x: 2.3, y: 1.95 }));
  parts.push(hcyl(0.122, 0.114, 1.7, 16, DARKSTEEL, 'x', { x: 3.4, y: 1.95 }));
  parts.push(hcyl(0.132, 0.132, 0.16, 16, DARKSTEEL, 'x', { x: 4.33, y: 1.95 }));
  parts.push(hcyl(0.15, 0.144, 0.75, 16, DARKSTEEL, 'x', { x: 4.78, y: 1.95 }));
  parts.push(hcyl(0.114, 0.106, 1.75, 16, DARKSTEEL, 'x', { x: 6.03, y: 1.95 }));
  // Sleeve retaining straps — the periodic clamp rings on the real sleeve.
  for (const cx of [2.95, 3.85, 5.5, 6.55]) {
    parts.push(hcyl(0.127, 0.127, 0.07, 16, DARKSTEEL, 'x', { x: cx, y: 1.95 }));
  }
  parts.push(hcyl(0.088, 0.088, 1.45, 16, MUZZLE, 'x', { x: 7.63, y: 1.95 }));
  parts.push(hcyl(0.098, 0.098, 0.09, 16, DARKSTEEL, 'x', { x: 8.24, y: 1.95 })); // muzzle collar
  parts.push(hbox(0.16, 0.15, 0.16, SHADE, { x: 8.2, y: 2.08 }));

  // Roof fit. Gunner's primary sight in an armoured housing (right/front),
  // panoramic commander sight on its pedestal, both with matte glass only.
  parts.push(hbox(0.55, 0.17, 0.5, BODY, { x: 0.68, y: 2.5, z: 0.55 }));
  parts.push(hbox(0.57, 0.03, 0.52, TOP, { x: 0.68, y: 2.59, z: 0.55 }));
  parts.push(hbox(0.05, 0.1, 0.32, SHADE, { x: 0.96, y: 2.51, z: 0.55 }));
  parts.push(hbox(0.02, 0.07, 0.26, OPTIC, { x: 0.985, y: 2.51, z: 0.55 }));
  parts.push(hcyl(0.09, 0.1, 0.18, 10, SHADE, 'y', { x: -0.3, y: 2.52, z: -0.25 }));
  parts.push(hbox(0.26, 0.28, 0.22, SHADE, { x: -0.3, y: 2.75, z: -0.25 }));
  parts.push(hbox(0.02, 0.16, 0.15, OPTIC, { x: -0.165, y: 2.75, z: -0.25 }));
  parts.push(hbox(0.28, 0.02, 0.24, TOP, { x: -0.3, y: 2.9, z: -0.25 }));
  // Hatches: commander right with periscope ring, loader left with MG.
  parts.push(hcyl(0.33, 0.33, 0.05, 14, BODY, 'y', { x: -0.8, y: 2.47, z: 0.62 }));
  parts.push(hcyl(0.29, 0.29, 0.04, 14, TOP, 'y', { x: -0.8, y: 2.51, z: 0.62 }));
  parts.push(hbox(0.16, 0.03, 0.05, STEEL, { x: -0.8, y: 2.535, z: 0.75 }));
  for (let pn = 0; pn < 5; pn++) {
    const a = -0.4 + pn * 0.55;
    parts.push(hbox(0.09, 0.07, 0.07, SHADE, {
      ry: -a, x: -0.8 + Math.cos(a) * 0.42, y: 2.47, z: 0.62 + Math.sin(a) * 0.42,
    }));
  }
  parts.push(hcyl(0.31, 0.31, 0.05, 14, BODY, 'y', { x: -0.75, y: 2.47, z: -0.62 }));
  parts.push(hcyl(0.27, 0.27, 0.04, 14, TOP, 'y', { x: -0.75, y: 2.51, z: -0.62 }));
  parts.push(hbox(0.15, 0.03, 0.05, STEEL, { x: -0.75, y: 2.535, z: -0.78 })); // loader lid handle
  parts.push(hbox(0.14, 0.08, 0.1, SHADE, { x: -0.32, y: 2.47, z: -0.95 })); // loader periscope
  parts.push(hcyl(0.05, 0.05, 0.04, 8, SHADE, 'y', { x: -1.3, y: 2.45, z: 0.3 })); // sat-nav puck
  parts.push(hcyl(0.012, 0.012, 1.2, 5, SHADE, 'x', { x: -0.1, y: 2.446, z: 0.5 })); // cable conduit
  // Loader's MG on a pintle: post, cradle, receiver, barrel, ammo box.
  parts.push(hcyl(0.03, 0.03, 0.22, 8, STEEL, 'y', { x: -0.42, y: 2.56, z: -0.62 }));
  parts.push(hbox(0.1, 0.08, 0.09, DARKSTEEL, { x: -0.42, y: 2.68, z: -0.62 }));
  parts.push(hbox(0.34, 0.09, 0.07, DARKSTEEL, { rz: 0.08, x: -0.28, y: 2.74, z: -0.62 }));
  parts.push(hcyl(0.02, 0.02, 0.55, 8, DARKSTEEL, 'x', { rz: 0.08, x: 0.15, y: 2.775, z: -0.62 }));
  parts.push(hbox(0.12, 0.11, 0.07, CANVAS2, { x: -0.32, y: 2.72, z: -0.72 }));
  // Crosswind mast and the two whip antennas.
  parts.push(hcyl(0.018, 0.018, 0.55, 6, SHADE, 'y', { x: -1.95, y: 2.7 }));
  parts.push(hbox(0.05, 0.05, 0.05, SHADE, { x: -1.95, y: 2.99 }));
  for (const s of [1, -1] as const) {
    parts.push(hcyl(0.05, 0.06, 0.1, 8, DARKSTEEL, 'y', { x: -2.15, y: 2.48, z: s * 1.05 }));
    parts.push(htorus(0.032, 0.013, DARKSTEEL, { rx: Math.PI / 2, x: -2.15, y: 2.55, z: s * 1.05 }));
    parts.push(htorus(0.028, 0.011, DARKSTEEL, { rx: Math.PI / 2, x: -2.15, y: 2.59, z: s * 1.05 }));
    parts.push(hcyl(0.012, 0.016, 0.85, 5, DARKSTEEL, 'y', { rx: s * 0.12, x: -2.15, y: 2.95, z: s * 1.05 }));
  }
  // Lifting eyes at the roof corners.
  for (const [ex, ez] of [[1.25, 1.0], [1.25, -1.0], [-2.15, 0.85]] as const) {
    parts.push(htorus(0.07, 0.018, STEEL, { ry: 0.9, x: ex, y: 2.47, z: ez }));
  }

  // Bustle rack on the turret rear: slat floor, rail frame, stowage.
  for (let sl = 0; sl < 5; sl++) {
    parts.push(hbox(0.5, 0.03, 0.09, DARKSTEEL, { x: -2.62, y: 1.98, z: -1.1 + sl * 0.55 }));
  }
  parts.push(hcyl(0.025, 0.025, 2.5, 6, DARKSTEEL, 'z', { x: -2.88, y: 2.28 }));
  parts.push(hcyl(0.025, 0.025, 0.55, 6, DARKSTEEL, 'x', { x: -2.62, y: 2.28, z: 1.24 }));
  parts.push(hcyl(0.025, 0.025, 0.55, 6, DARKSTEEL, 'x', { x: -2.62, y: 2.28, z: -1.24 }));
  for (const [px, pz] of [[-2.88, 1.24], [-2.88, -1.24]] as const) {
    parts.push(hcyl(0.022, 0.022, 0.34, 6, DARKSTEEL, 'y', { x: px, y: 2.12, z: pz }));
  }
  parts.push(hsphere(0.22, CANVAS, { x: -2.6, y: 2.06, z: 0.5 }));
  parts.push(hsphere(0.2, CANVAS2, { x: -2.65, y: 2.04, z: -0.15 }));
  parts.push(hbox(0.3, 0.42, 0.24, DARKSTEEL, { x: -2.6, y: 2.2, z: -0.85 })); // jerry can
  parts.push(hbox(0.04, 0.1, 0.26, STEEL, { x: -2.6, y: 2.42, z: -0.85 })); // can handle bar
  parts.push(hbox(0.34, 0.2, 0.28, CANVAS2, { x: -2.62, y: 2.08, z: -0.52 })); // ammo box
  parts.push(hcyl(0.09, 0.09, 1.1, 8, CANVAS, 'z', { x: -2.55, y: 2.38, z: 0.35 })); // tarp roll
  for (const strapZ of [0.0, 0.38, 0.72]) {
    parts.push(hbox(0.2, 0.2, 0.035, CANVAS2, { x: -2.55, y: 2.38, z: strapZ - 0.05 })); // tarp straps
  }

  // Turret side stowage: long bin right, short bin + rope coil left.
  parts.push(hbox(1.05, 0.42, 0.16, BODY, { x: -1.45, y: 2.02, z: 1.5 }));
  parts.push(hbox(0.1, 0.44, 0.17, STEEL, { x: -1.75, y: 2.02, z: 1.5 }));
  parts.push(hbox(0.1, 0.44, 0.17, STEEL, { x: -1.15, y: 2.02, z: 1.5 }));
  parts.push(hbox(0.7, 0.4, 0.15, BODY, { x: -1.7, y: 2.0, z: -1.48 }));
  parts.push(htorus(0.17, 0.035, CANVAS2, { x: -0.85, y: 2.05, z: -1.47 }));

  // Smoke-discharger banks: four capped tubes a side, splayed forward.
  for (const s of [1, -1] as const) {
    parts.push(hbox(0.36, 0.24, 0.05, BODY, { ry: s * 0.35, x: 0.98, y: 2.08, z: s * 1.46 }));
    for (let i = 0; i < 4; i++) {
      parts.push(hcyl(0.045, 0.045, 0.3, 8, SHADE, 'x', {
        rz: 0.5, ry: s * -(0.6 + 0.12 * i), x: 1.05 - 0.1 * i, y: 2.12, z: s * (1.5 + 0.05 * i),
      }));
    }
  }

  const merged = mergeHero(parts);
  merged.scale(HERO_SCALE, HERO_SCALE, HERO_SCALE);
  return merged;
}

const geoCache = new Map<FactionId, THREE.BufferGeometry>();

export function makePanzerHero(faction: FactionId): {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
} {
  let geometry = geoCache.get(faction);
  if (!geometry) {
    geometry = makePanzerHeroGeometry(faction);
    geoCache.set(faction, geometry);
  }
  return { geometry, material: getHeroMaterial() };
}
