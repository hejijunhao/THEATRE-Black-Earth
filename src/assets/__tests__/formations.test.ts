import { describe, expect, it } from 'vitest';
import { MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three';
import { MACHINE_SCALE } from '../../map/lod';
import { HEX_H, HEX_W } from '../../game/hex';
import { makeMiniatureBuild } from '../units';
import { commandTruck, figure } from '../vehicles';
import { makeArtilleryHero, makeArtilleryHeroGeometry } from '../heroArtillery';
import { makeMechHero, makeMechHeroGeometry } from '../heroMech';
import { makePanzerHero } from '../panzerHero';
import {
  getHeroMaterial,
  getStampHeroMaterial,
  STAMP_HULL,
  STAMP_STEEL,
  STAMP_TOP,
} from '../heroParts';
import { usesStampHero } from '../heroFleet';

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
    // Linear vertex colour (three ColorManagement). Green channel must
    // outrun red/blue or the rain veil treats the rank as grey khaki.
    expect(col.getY(0)).toBeGreaterThan(0.08);
    expect(col.getY(0)).toBeGreaterThan(col.getX(0) * 2);
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

function sat(c: { r: number; g: number; b: number }): number {
  const l = luma(c);
  const dr = c.r - l;
  const dg = c.g - l;
  const db = c.b - l;
  return Math.hypot(dr, dg, db);
}

describe('MECH/ARTY veil-proof stamp', () => {
  it('routes only mechanized and artillery off the shared hero wash', () => {
    expect(usesStampHero('mechanized')).toBe(true);
    expect(usesStampHero('artillery')).toBe(true);
    expect(usesStampHero('armored')).toBe(false);
    expect(usesStampHero('recon')).toBe(false);
  });

  it('keeps the stamp unlit and the armor wash lit', () => {
    const stamp = getStampHeroMaterial();
    const hero = getHeroMaterial();
    expect(stamp).toBeInstanceOf(MeshBasicMaterial);
    expect(hero).toBeInstanceOf(MeshStandardMaterial);
    expect(stamp).not.toBe(hero);
    expect(makeMechHero('UA').material).toBe(stamp);
    expect(makeArtilleryHero('UA').material).toBe(stamp);
    expect(makePanzerHero('UA').material).toBe(hero);
    expect(hero.emissive.getHexString()).toBe('1c1810');
  });

  it('punches field-green sat above the rain veil gate', () => {
    // Grade veil = dark AND grey. sat smoothstep(0.016, 0.085, sat).
    for (const c of [STAMP_HULL, STAMP_TOP, STAMP_STEEL]) {
      expect(c.g).toBeGreaterThan(c.r * 2);
      expect(c.g).toBeGreaterThan(c.b);
      expect(sat(c)).toBeGreaterThan(0.085);
    }
    expect(luma(STAMP_HULL)).toBeLessThan(luma(STAMP_TOP) * 0.55);
    expect(luma(STAMP_TOP) - luma(STAMP_HULL)).toBeGreaterThan(0.08);
  });
});
