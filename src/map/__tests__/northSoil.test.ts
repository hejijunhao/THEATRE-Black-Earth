import { describe, expect, it } from 'vitest';
import { HERO_PAINT } from '../../assets/heroParts';
import { WORLD_H } from '../data/terrainData';
import { FOREST_NORTH, FOREST_SOUTH, forestStemCount, northForestWeight } from '../forestPaint';
import { WEATHER_ENV } from '../palette';
import { WEATHER_GRADE } from '../postfx/Grade';
import { RAIN_AO, RAIN_VIGNETTE } from '../postfx/rainStack';
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
    expect(luma(north)).toBeGreaterThan(108);
    expect(luma(north)).toBeGreaterThan(luma(mid));
    expect(north.r).toBeGreaterThan(north.b);
    expect(north.g).toBeGreaterThan(north.b);
  });

  it('targets surveyed loess, not painted khaki or cool grey', () => {
    const l = luma(KHAKI_FIELD);
    expect(KHAKI_FIELD.r).toBeGreaterThan(KHAKI_FIELD.g);
    expect(KHAKI_FIELD.g).toBeGreaterThan(KHAKI_FIELD.b);
    expect(KHAKI_FIELD.r).toBeLessThan(200);
    expect(KHAKI_FIELD.r - KHAKI_FIELD.b).toBeGreaterThan(40);
    expect(l).toBeGreaterThan(130);
    expect(l).toBeLessThan(170);
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

  it('refuses rain AO/vignette values that crush the north into charcoal', () => {
    expect(RAIN_AO.intensity).toBeLessThan(0.32);
    const ao = hexRgb(RAIN_AO.color);
    expect(luma(ao)).toBeGreaterThan(110);
    expect(ao.r).toBeGreaterThan(ao.b);
    expect(RAIN_VIGNETTE.darkness).toBeLessThan(0.02);
    expect(RAIN_VIGNETTE.offset).toBeGreaterThan(0.75);
    expect(WEATHER_GRADE.rain.veil).toBe(1);
    expect(WEATHER_GRADE.rain.lift).toBeGreaterThan(0.035);
  });
});

describe('north forest instances cannot become a charcoal band', () => {
  it('thins and lightens stems on the far north', () => {
    expect(northForestWeight(WORLD_H * 0.08, WORLD_H)).toBeGreaterThan(0.7);
    expect(northForestWeight(WORLD_H * 0.6, WORLD_H)).toBeLessThan(0.25);
    const north = forestStemCount(true, 0.8, WORLD_H * 0.08, 3, WORLD_H);
    const mid = forestStemCount(true, 0.8, WORLD_H * 0.6, 3, WORLD_H);
    expect(north).toBeLessThan(mid);
    expect(luma(hexRgb(FOREST_NORTH))).toBeGreaterThan(luma(hexRgb(FOREST_SOUTH)));
    expect(luma(hexRgb(FOREST_NORTH))).toBeGreaterThan(130);
  });
});

describe('machine paint silhouettes on khaki', () => {
  it('keeps a dark hull and a lighter top that still sits under khaki', () => {
    const field = luma(KHAKI_FIELD);
    for (const side of ['UA', 'RU'] as const) {
      const p = HERO_PAINT[side];
      const dark = luma(hexRgb(p.dark));
      const light = luma(hexRgb(p.light));
      expect(dark).toBeLessThan(40);
      expect(light).toBeGreaterThan(100);
      expect(light).toBeLessThan(field * 0.85);
      expect(light - dark).toBeGreaterThan(70);
    }
  });
});
