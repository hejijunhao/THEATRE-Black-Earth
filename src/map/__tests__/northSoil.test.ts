import { describe, expect, it } from 'vitest';
import { WORLD_H } from '../data/terrainData';
import { WEATHER_ENV } from '../palette';
import { applySoilContinuity, KHAKI_FIELD, northSoilLift } from '../terrain/albedo';

function luma(c: { r: number; g: number; b: number }): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function hexRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

describe('north soil continuity gate', () => {
  it('lifts the north more than the midground, and high ground more than the valley', () => {
    const north = northSoilLift(WORLD_H * 0.08, 80);
    const mid = northSoilLift(WORLD_H * 0.55, 80);
    const south = northSoilLift(WORLD_H * 0.9, 80);
    expect(north).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(south);
    expect(northSoilLift(WORLD_H * 0.4, 240)).toBeGreaterThan(northSoilLift(WORLD_H * 0.4, 40));
  });

  it('will not let charcoal survive on far-north soil', () => {
    const charcoal = { r: 40, g: 36, b: 30 };
    const north = applySoilContinuity(charcoal, WORLD_H * 0.06, 70);
    const mid = applySoilContinuity(charcoal, WORLD_H * 0.5, 70);
    expect(luma(north)).toBeGreaterThan(130);
    expect(luma(north)).toBeGreaterThan(luma(mid));
    expect(north.r).toBeGreaterThan(north.b);
    expect(north.g).toBeGreaterThan(north.b);
  });

  it('targets the same khaki the midground field uses', () => {
    expect(KHAKI_FIELD.r).toBeGreaterThan(180);
    expect(KHAKI_FIELD.g).toBeGreaterThan(150);
    expect(KHAKI_FIELD.b).toBeLessThan(KHAKI_FIELD.g);
  });
});

describe('rain air is warm khaki, not a charcoal veil', () => {
  it('keeps rain fog warm, bright, and thin', () => {
    const rain = WEATHER_ENV.rain;
    const fog = hexRgb(rain.fog);
    expect(rain.fogDensity).toBeLessThan(0.00055);
    expect(luma(fog)).toBeGreaterThan(170);
    expect(fog.r).toBeGreaterThan(fog.b);
    expect(fog.g).toBeGreaterThan(fog.b * 0.95);
    expect(rain.ambient).toBeGreaterThan(0.75);
    expect(rain.sun).toBeGreaterThan(1.1);
  });
});
