import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { MACHINE_SCALE } from '../../map/lod';
import { HEX_H, HEX_W } from '../../game/hex';
import { makeMiniatureBuild } from '../units';
import { figure } from '../vehicles';

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

describe('non-armor boot silhouettes', () => {
  it('gives infantry a rank plus a command truck, not an empty plate', () => {
    const build = makeMiniatureBuild(spec('infantry', 2));
    expect(build.heroType).toBeNull();
    expect(build.props).not.toBeNull();
    build.props!.computeBoundingBox();
    const box = build.props!.boundingBox!;
    const size = box.getSize(new Vector3());
    expect(size.y).toBeGreaterThan(0.08);
    expect(size.x * size.z).toBeGreaterThan(0.04);
    expect(size.x * MACHINE_SCALE).toBeLessThan(HEX_W);
    expect(size.z * MACHINE_SCALE).toBeLessThan(HEX_H);
  });

  it('keeps mech and artillery on hero hulls so they are not plates', () => {
    const mech = makeMiniatureBuild(spec('mechanized', 3));
    const arty = makeMiniatureBuild(spec('artillery', 3));
    expect(mech.heroType).toBe('mechanized');
    expect(arty.heroType).toBe('artillery');
    expect(mech.heroSlots.length).toBe(3);
    expect(arty.heroSlots.length).toBe(3);
  });

  it('paints the figure dark enough to stamp on khaki', () => {
    const parts = figure();
    const col = parts[0].getAttribute('color');
    expect(col.getX(0)).toBeLessThan(0.22);
    expect(col.getY(0)).toBeLessThan(0.24);
  });
});
