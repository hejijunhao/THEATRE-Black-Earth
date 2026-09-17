// Campaign LOD and boot framing. Presentation constants only — the sim
// never reads this. The hard gate: a token must leave soil visible in its
// hex at every zoom, and select must not promote to a blotting card.

import { HEX_H, HEX_W, tileWorld } from '../game/hex';

/** Hard world-size caps. A plate that exceeds these buries the hex. */
export const PLATE_MAX_W = 1.18;
export const PLATE_MAX_H = 0.74;

export const COUNTER_PLATE_W = 1.16;
export const COUNTER_PLATE_H = 0.72;
export const COUNTER_BASE_W = 0.78;
export const COUNTER_BASE_D = 0.50;

export const STANDARD_W = 1.06;
export const STANDARD_H = 0.31;

export const MINI_BASE_W = 0.86;
export const MINI_BASE_D = 0.60;
export const MINI_SCALE = 1.18;
/** Vehicle group only — plates stay at MINI_BASE_*. Must still fit the hex. */
export const MACHINE_SCALE = 1.34;

/** Select is a ground annulus, never a camera-facing parchment card. */
export const SELECT_RING_IN = 0.48;
export const SELECT_RING_OUT = 0.62;
export const ATTACK_CHEV_R = 0.20;

export const COUNTER_ZOOM_IN = 24;
export const COUNTER_ZOOM_FULL = 42;

/** Kupiansk (39,10) – Sloviansk (39,14) midpoint. The scar, not Donbas. */
export const BOOT_COL = 39;
export const BOOT_ROW = 12;
export const BOOT = tileWorld(BOOT_COL, BOOT_ROW);

/** Mid-zoom, tight on the scar. Height stays below the counter crossfade. */
export const BOOT_CAM = { dx: -0.25, y: 10.4, dz: 6.7 } as const;

export function bootCamera(): { px: number; py: number; pz: number; tx: number; tz: number } {
  return {
    px: BOOT.wx + BOOT_CAM.dx,
    py: BOOT_CAM.y,
    pz: BOOT.wz + BOOT_CAM.dz,
    tx: BOOT.wx,
    tz: BOOT.wz,
  };
}

export function plateFitsHex(w: number, h: number): boolean {
  return w <= PLATE_MAX_W && h <= PLATE_MAX_H && w < HEX_W && h < HEX_H;
}

export function selectFitsHex(outer = SELECT_RING_OUT): boolean {
  return outer * 2 < HEX_W && outer < HEX_H * 0.5;
}
