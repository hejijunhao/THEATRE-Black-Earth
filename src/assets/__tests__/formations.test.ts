import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { MACHINE_SCALE } from '../../map/lod';
import { HEX_H, HEX_W } from '../../game/hex';
import { makeMiniatureBuild } from '../units';
import { commandTruck, figure } from '../vehicles';
import { makeArtilleryHeroGeometry } from '../heroArtillery';
import { makeMechHeroGeometry } from '../heroMech';

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
    expect(col.getX(0)).toBeLessThan(0.16);
    expect(col.getY(0)).toBeLessThan(0.18);

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
