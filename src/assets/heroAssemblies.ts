// Reusable hero-tier sub-assemblies: running gear is where most of a
// vehicle's perceived fidelity lives, and it is the same everywhere —
// parameterise it once. panzerHero keeps its already-reviewed inline build;
// factories added after it compose from here.

import * as THREE from 'three';
import { HeroMatSet, hbox, hcyl } from './heroParts';

// Tracked-vehicle road wheel: rubber tire, painted rim, steel hub, hub cap,
// bolt circle. Axis is lateral (z).
export function trackWheel(
  x: number, y: number, z: number, M: HeroMatSet,
  r = 0.35, rimR = 0.27, tireW = 0.16, bolts = 8, boltR = 0.17,
): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [
    hcyl(r, r, tireW, 16, M.RUBBER, 'z', { x, y, z }),
    hcyl(rimR, rimR, tireW + 0.01, 16, M.BODY, 'z', { x, y, z }),
    hcyl(r * 0.28, r * 0.28, tireW + 0.04, 10, M.STEEL, 'z', { x, y, z }),
    hcyl(r * 0.14, r * 0.14, tireW + 0.065, 8, M.DARKSTEEL, 'z', { x, y, z }),
  ];
  for (let b = 0; b < bolts; b++) {
    const a = (b / bolts) * Math.PI * 2;
    parts.push(hcyl(0.022, 0.022, tireW + 0.05, 6, M.STEEL, 'z', {
      x: x + Math.cos(a) * boltR, y: y + Math.sin(a) * boltR, z,
    }));
  }
  return parts;
}

// Wheeled-vehicle tire with tread blocks around the circumference, dished
// rim and bolt circle. Built with lateral (z) axis; rotate after if needed.
export function treadWheel(
  x: number, y: number, z: number, M: HeroMatSet,
  r = 0.5, w = 0.34, blocks = 14,
): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [
    hcyl(r - 0.03, r - 0.03, w, 18, M.RUBBER, 'z', { x, y, z }),
  ];
  for (let b = 0; b < blocks; b++) {
    const a = (b / blocks) * Math.PI * 2;
    parts.push(hbox(0.1, 0.07, w + 0.01, M.RUBBER, {
      rz: a, x: x + Math.cos(a) * (r - 0.035), y: y + Math.sin(a) * (r - 0.035), z,
    }));
  }
  parts.push(hcyl(r * 0.56, r * 0.6, w + 0.02, 14, M.BODY, 'z', { x, y, z }));
  parts.push(hcyl(r * 0.2, r * 0.2, w + 0.05, 10, M.STEEL, 'z', { x, y, z }));
  for (let b = 0; b < 6; b++) {
    const a = (b / 6) * Math.PI * 2;
    parts.push(hcyl(0.025, 0.025, w + 0.04, 6, M.STEEL, 'z', {
      x: x + Math.cos(a) * r * 0.36, y: y + Math.sin(a) * r * 0.36, z,
    }));
  }
  return parts;
}

export interface LinkRunSpec {
  z: number;                     // lateral centre of the run
  padW: number;                  // track width
  bottom: { x0: number; x1: number; y: number; pitch: number };
  wraps: Array<{ cx: number; cy: number; r: number; degs: number[] }>;
}

// Individually placed track links — pad, guide horn, hinge end connectors —
// along the bottom run and any wrap arcs. Top runs hide behind skirts and
// are deliberately not spent on.
export function linkRun(spec: LinkRunSpec, M: HeroMatSet): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const conZ = spec.padW / 2 - 0.02;
  const link = (x: number, y: number, ang: number) => {
    parts.push(hbox(0.15, 0.09, spec.padW, M.TRACKM, { rz: ang, x, y, z: spec.z }));
    const hy = 0.075;
    parts.push(hbox(0.05, 0.1, 0.07, M.TRACKM, {
      rz: ang, x: x - Math.sin(ang) * hy, y: y + Math.cos(ang) * hy, z: spec.z,
    }));
    for (const ez of [-conZ, conZ]) {
      parts.push(hbox(0.09, 0.11, 0.07, M.TRACKM, { rz: ang, x, y, z: spec.z + ez }));
    }
  };
  const n = Math.floor((spec.bottom.x1 - spec.bottom.x0) / spec.bottom.pitch) + 1;
  for (let i = 0; i < n; i++) {
    link(spec.bottom.x0 + i * spec.bottom.pitch, spec.bottom.y, 0);
  }
  for (const wrap of spec.wraps) {
    for (const deg of wrap.degs) {
      const a = (deg * Math.PI) / 180;
      link(wrap.cx + Math.cos(a) * wrap.r, wrap.cy + Math.sin(a) * wrap.r, a + Math.PI / 2);
    }
  }
  return parts;
}
