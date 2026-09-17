import { describe, expect, it } from 'vitest';
import { BOOT } from '../lod';
import { CHERNOZEM, KHAKI_FIELD, LOESS, applySoilContinuity } from '../terrain/albedo';
import { fieldColor, fieldLumaDelta, regionSoil } from '../terrain/strips';

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
    expect(KHAKI_FIELD.g).toBeLessThan(KHAKI_FIELD.r * 0.80);
    const lifted = applySoilContinuity(CHERNOZEM, BOOT.wz, 80);
    expect(luma(lifted)).toBeLessThan(luma(KHAKI_FIELD) + 8);
  });

  it('keeps 14-unit cadastral districts distinct', () => {
    const soils = [];
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        soils.push(regionSoil(BOOT.wx + i * 14, BOOT.wz + j * 14));
      }
    }
    const lumas = soils.map(luma);
    expect(Math.max(...lumas) - Math.min(...lumas)).toBeGreaterThan(20);
    soils.forEach(warm);
    // Chroma families, not one ochre hue: red-brown vs olive must both appear.
    const rg = soils.map((c) => c.r - c.g);
    expect(Math.max(...rg) - Math.min(...rg)).toBeGreaterThan(22);
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

  it('darkens midground field paint off the mustard plate', () => {
    const colors = [];
    for (let i = 0; i < 48; i++) {
      colors.push(fieldColor(BOOT.wx + i * 0.37, BOOT.wz + (i % 6) * 0.41));
    }
    const avg = colors.reduce(
      (a, c) => ({ r: a.r + c.r, g: a.g + c.g, b: a.b + c.b }),
      { r: 0, g: 0, b: 0 },
    );
    avg.r /= colors.length;
    avg.g /= colors.length;
    avg.b /= colors.length;
    expect(luma(avg)).toBeLessThan(110);
    expect(avg.g).toBeLessThan(avg.r * 0.96);
    expect(avg.r - avg.b).toBeGreaterThan(18);
    expect(luma(CHERNOZEM)).toBeLessThan(58);
  });
});
