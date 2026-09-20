import { describe, expect, it } from 'vitest';
import { BOOT } from '../lod';
import { WORLD_H } from '../data/terrainData';
import { northSoilLift } from '../terrain/albedo';
import { fieldColor, fieldLumaDelta, parcelRelief } from '../terrain/strips';

function luma(c: { r: number; g: number; b: number }): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

describe('contact-scale strip fields', () => {
  it('keeps neighbour-parcel contrast on the scar, not a khaki swatch', () => {
    const samples = [
      fieldLumaDelta(BOOT.wx, BOOT.wz, 0.22, 0),
      fieldLumaDelta(BOOT.wx + 1.4, BOOT.wz + 0.8, 0, 0.28),
      fieldLumaDelta(BOOT.wx - 2.1, BOOT.wz + 1.6, 0.18, 0.18),
    ];
    const max = Math.max(...samples);
    expect(max).toBeGreaterThan(14);
  });

  it('raises parcel lips so the rest mesh is not a flat slab', () => {
    const a = parcelRelief(BOOT.wx, BOOT.wz);
    const b = parcelRelief(BOOT.wx + 0.31, BOOT.wz + 0.12);
    expect(Math.abs(a - b)).toBeGreaterThan(0.004);
    expect(Math.abs(a)).toBeLessThan(0.14);
  });

  it('does not flatten the scar with the north khaki lift', () => {
    expect(northSoilLift(BOOT.wz, 80)).toBeLessThan(0.12);
    expect(northSoilLift(WORLD_H * 0.08, 80)).toBeGreaterThan(0.28);
  });

  it('keeps strip colours khaki-warm, not charcoal', () => {
    const c = fieldColor(BOOT.wx, BOOT.wz);
    expect(c.r).toBeGreaterThan(c.b);
    expect(c.g).toBeGreaterThan(c.b * 0.9);
    expect(luma(c)).toBeGreaterThan(60);
  });
});
