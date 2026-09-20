import { describe, expect, it } from 'vitest';
import { HEX_H, HEX_W, tileWorld } from '../../game/hex';
import {
  ATTACK_CHEV_R,
  BOOT,
  BOOT_CAM,
  BOOT_COL,
  BOOT_ROW,
  COUNTER_PLATE_H,
  COUNTER_PLATE_W,
  COUNTER_ZOOM_IN,
  MINI_BASE_D,
  MINI_BASE_W,
  MINI_SCALE,
  PLATE_MAX_H,
  PLATE_MAX_W,
  SELECT_RING_OUT,
  STANDARD_H,
  STANDARD_W,
  bootCamera,
  plateFitsHex,
  selectFitsHex,
} from '../lod';

describe('campaign LOD gate', () => {
  it('caps every plate below a hex so soil stays visible', () => {
    expect(PLATE_MAX_W).toBeLessThan(HEX_W);
    expect(PLATE_MAX_H).toBeLessThan(HEX_H);
    expect(plateFitsHex(COUNTER_PLATE_W, COUNTER_PLATE_H)).toBe(true);
    expect(plateFitsHex(STANDARD_W, STANDARD_H)).toBe(true);
    expect(plateFitsHex(MINI_BASE_W, MINI_BASE_D)).toBe(true);
    expect(MINI_BASE_W * MINI_SCALE).toBeLessThan(HEX_W);
    expect(MINI_BASE_D * MINI_SCALE).toBeLessThan(HEX_H);
  });

  it('keeps select as a ring inside the hex, not a blotting card', () => {
    expect(selectFitsHex()).toBe(true);
    expect(SELECT_RING_OUT * 2).toBeLessThan(HEX_W * 0.8);
    expect(ATTACK_CHEV_R * 2).toBeLessThan(0.5);
  });

  it('does not treat a neighbour-covering card as a legal plate', () => {
    expect(plateFitsHex(2.62, 1.64)).toBe(false);
    expect(plateFitsHex(1.75, 1.26)).toBe(false);
    expect(selectFitsHex(1.26)).toBe(false);
  });
});

describe('boot camera gate', () => {
  it('frames the Kupiansk–Sloviansk midpoint at mid-zoom', () => {
    const kup = tileWorld(39, 10);
    const slo = tileWorld(39, 14);
    expect(BOOT_COL).toBe(39);
    expect(BOOT_ROW).toBe(12);
    expect(BOOT.wx).toBeCloseTo((kup.wx + slo.wx) / 2, 5);
    expect(BOOT.wz).toBeCloseTo((kup.wz + slo.wz) / 2, 5);

    const cam = bootCamera();
    expect(cam.py).toBeLessThan(COUNTER_ZOOM_IN);
    expect(cam.py).toBeGreaterThan(8);
    const dist = Math.hypot(cam.px - cam.tx, cam.py, cam.pz - cam.tz);
    // FOV 42°: this distance keeps ~6 hexes in the vertical — the scar, not Donbas.
    expect(dist).toBeLessThan(14.5);
    expect(dist).toBeGreaterThan(10);
    expect(BOOT_CAM.dz).toBeLessThan(8);
  });
});
