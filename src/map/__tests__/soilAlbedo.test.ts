import { describe, expect, it } from 'vitest';
import { BOOT } from '../lod';
import { CHERNOZEM, KHAKI_FIELD, LOESS, applySoilContinuity } from '../terrain/albedo';
import { fieldColor, fieldLumaDelta } from '../terrain/strips';

function luma(c: { r: number; g: number; b: number }): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function warm(c: { r: number; g: number; b: number }): void {
  expect(c.r).toBeGreaterThan(c.b);
  expect(c.g).toBeGreaterThan(c.b * 0.85);
}

describe('slice 1 ground albedo — cadastral soil', () => {
  it('uses chernozem under loess, both earth, neither highlighter khaki', () => {
    expect(luma(CHERNOZEM)).toBeLessThan(luma(LOESS));
    expect(luma(CHERNOZEM)).toBeGreaterThan(40);
    expect(luma(LOESS)).toBeLessThan(155);
    warm(CHERNOZEM);
    warm(LOESS);
    expect(CHERNOZEM.r).toBeLessThan(120);
    expect(LOESS.r).toBeLessThan(180);
  });

  it('keeps the continuity target on loess/soil, not a beige flood', () => {
    expect(KHAKI_FIELD.r).toBeLessThan(200);
    expect(luma(KHAKI_FIELD)).toBeLessThan(170);
    warm(KHAKI_FIELD);
    const lifted = applySoilContinuity(CHERNOZEM, BOOT.wz, 80);
    expect(luma(lifted)).toBeLessThan(luma(KHAKI_FIELD) + 8);
  });

  it('does not flatten scar parcels when sampling neighbour dirt', () => {
    const gap = Math.max(
      fieldLumaDelta(BOOT.wx, BOOT.wz, 0.22, 0),
      fieldLumaDelta(BOOT.wx + 1.4, BOOT.wz + 0.8, 0, 0.28),
      fieldLumaDelta(BOOT.wx - 2.1, BOOT.wz + 1.6, 0.18, 0.18),
    );
    expect(gap).toBeGreaterThan(14);
    const c = fieldColor(BOOT.wx, BOOT.wz);
    expect(c.r).toBeLessThan(220);
    warm(c);
  });
});
