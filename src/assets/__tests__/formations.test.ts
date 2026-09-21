import { describe, expect, it } from 'vitest';
import { MeshLambertMaterial, Vector3 } from 'three';
import { MACHINE_SCALE } from '../../map/lod';
import { HEX_H, HEX_W } from '../../game/hex';
import { makeMiniatureBuild } from '../units';
import { commandTruck, figure } from '../vehicles';
import { makeArtilleryHero, makeArtilleryHeroGeometry } from '../heroArtillery';
import { makeMechHero, makeMechHeroGeometry } from '../heroMech';
import { makePanzerHero, makePanzerHeroGeometry } from '../panzerHero';
import {
  getHeroMaterial,
  HERO_SCALE,
  HERO_PAINT,
} from '../heroParts';
import { heroMaterial } from '../heroFleet';

function spec(type: 'infantry' | 'mechanized' | 'artillery', tier: 1 | 2 | 3 | 4 = 3) {
  return {
    type,
    faction: 'UA' as const,
    tier,
    supplyTruck: false,
    reinforcing: false,
    disorganized: false,
    smoke: false,
  };
}

function sizeOf(parts: { computeBoundingBox: () => void; boundingBox: { getSize: (v: Vector3) => Vector3 } | null }) {
  parts.computeBoundingBox();
  return parts.boundingBox!.getSize(new Vector3());
}

describe('non-armor boot silhouettes', () => {
  it('gives infantry a rifle rank plus a command truck, not an empty plate', () => {
    const build = makeMiniatureBuild(spec('infantry', 2));
    expect(build.heroType).toBeNull();
    expect(build.props).not.toBeNull();
    const size = sizeOf(build.props!);
    expect(size.y).toBeGreaterThan(0.09);
    expect(size.x * size.z).toBeGreaterThan(0.04);
    expect(size.x * MACHINE_SCALE).toBeLessThan(HEX_W);
    expect(size.z * MACHINE_SCALE).toBeLessThan(HEX_H);
  });

  it('authors the figure as a person plus rifle, not a pale block', () => {
    const parts = figure();
    expect(parts.length).toBeGreaterThan(8);
    const col = parts[0].getAttribute('color');
    // Muted olive cloth retains a small green bias in linear vertex colour.
    expect(col.getY(0)).toBeGreaterThan(0.08);
    expect(col.getY(0)).toBeGreaterThan(col.getX(0));
    expect(col.getZ(0)).toBeLessThan(col.getY(0));

    const mergedX = parts.reduce((m, g) => {
      g.computeBoundingBox();
      return Math.max(m, g.boundingBox!.max.x);
    }, -Infinity);
    const mergedY = parts.reduce((m, g) => {
      g.computeBoundingBox();
      return Math.max(m, g.boundingBox!.max.y);
    }, -Infinity);
    // Rifle must stick forward of the torso; helmet must sit above it.
    expect(mergedX).toBeGreaterThan(0.045);
    expect(mergedY).toBeGreaterThan(0.08);
  });

  it('keeps the command truck a cab/canvas/wheel machine', () => {
    const parts = commandTruck('UA');
    expect(parts.length).toBeGreaterThan(8);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const g of parts) {
      g.computeBoundingBox();
      const b = g.boundingBox!;
      minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x);
      minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
    }
    expect(maxX - minX).toBeGreaterThan(0.12);
    expect(maxY - minY).toBeGreaterThan(0.07);
  });

  it('keeps mech and artillery on hero hulls so they are not plates', () => {
    const mech = makeMiniatureBuild(spec('mechanized', 3));
    const arty = makeMiniatureBuild(spec('artillery', 3));
    expect(mech.heroType).toBe('mechanized');
    expect(arty.heroType).toBe('artillery');
    expect(mech.heroSlots.length).toBe(3);
    expect(arty.heroSlots.length).toBe(3);
  });

  it('gives the IFV a hull / turret / gun extent, not a square plate', () => {
    const geo = makeMechHeroGeometry('UA');
    const size = sizeOf(geo);
    expect(size.x).toBeGreaterThan(size.z * 1.15);
    expect(size.y).toBeGreaterThan(0.05);
    expect(size.x).toBeGreaterThan(0.18);
  });

  it('gives the gun a barrel longer than its carriage width', () => {
    const geo = makeArtilleryHeroGeometry('UA');
    const size = sizeOf(geo);
    expect(size.x).toBeGreaterThan(size.z * 1.2);
    expect(size.y).toBeGreaterThan(0.05);
    expect(size.x).toBeGreaterThan(0.20);
  });
});

function luma(c: { r: number; g: number; b: number }): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function srgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

describe('operational machine materials', () => {
  it('uses one dimensional, matte paint family for every vehicle class', () => {
    const material = getHeroMaterial();
    expect(material).toBeInstanceOf(MeshLambertMaterial);
    for (const type of ['armored', 'mechanized', 'artillery', 'recon'] as const) {
      expect(heroMaterial(type)).toBe(material);
    }
    expect(makeMechHero('UA').material).toBe(material);
    expect(makeArtilleryHero('UA').material).toBe(material);
    expect(makePanzerHero('UA').material).toBe(material);
  });

  it('separates hull and turret without saturated green paint', () => {
    for (const side of ['UA', 'RU'] as const) {
      const p = HERO_PAINT[side];
      for (const hex of [p.base, p.dark, p.light]) {
        const c = srgb(hex);
        expect(Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)).toBeLessThan(0.18);
      }
      expect(luma(srgb(p.light)) - luma(srgb(p.base))).toBeGreaterThan(0.15);
    }
  });
});

function sampleWhere(
  geo: { getAttribute: (name: string) => { count: number; getX: (i: number) => number; getY: (i: number) => number; getZ: (i: number) => number } },
  keep: (x: number, y: number) => boolean,
) {
  const pos = geo.getAttribute('position');
  const col = geo.getAttribute('color');
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    if (!keep(x, y)) continue;
    r += col.getX(i); g += col.getY(i); b += col.getZ(i); n += 1;
  }
  const avg = { r: r / n, g: g / n, b: b / n };
  return { ...avg, n, luma: luma(avg) };
}

describe('armor class silhouette', () => {
  it('authors a dark hull and a light turret, not one wash', () => {
    const geo = makePanzerHeroGeometry('UA');
    const hull = sampleWhere(geo, (_x, y) => y >= 0.85 * HERO_SCALE && y <= 1.55 * HERO_SCALE);
    const turret = sampleWhere(geo, (_x, y) => y >= 2.35 * HERO_SCALE && y <= 2.55 * HERO_SCALE);
    expect(hull.n).toBeGreaterThan(80);
    expect(turret.n).toBeGreaterThan(20);
    expect(turret.luma).toBeGreaterThan(hull.luma * 1.15);
    expect(hull.g).toBeGreaterThan(hull.b);
    expect(turret.g).toBeGreaterThan(turret.b);
  });

  it('keeps the gun a dark finger ahead of the turret', () => {
    const geo = makePanzerHeroGeometry('UA');
    const size = sizeOf(geo);
    expect(size.x).toBeGreaterThan(size.z * 1.3);
    expect(size.x).toBeGreaterThan(0.22);
    const gun = sampleWhere(geo, (x, y) => x > 3.2 * HERO_SCALE && y > 1.7 * HERO_SCALE);
    const turret = sampleWhere(geo, (_x, y) => y >= 2.35 * HERO_SCALE && y <= 2.55 * HERO_SCALE);
    expect(gun.n).toBeGreaterThan(20);
    expect(gun.luma).toBeLessThan(turret.luma * 0.85);
  });
});
