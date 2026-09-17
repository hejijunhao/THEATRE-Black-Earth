import { describe, expect, it } from 'vitest';
import { HEX_W, neighborIds } from '../../game/hex';
import { tileId } from '../../game/types';
import {
  classifyReach,
  fillFitsHex,
  FRONT_CONTACT_HATCH,
  FRONT_QUIET_HATCH,
  FRONT_SCAR_H,
  FRONT_SCAR_W,
  perimeterEdges,
  REACH_FILL_OPACITY,
  REACH_FILL_RADIUS,
  reachFillOpacity,
  scarIsHairline,
  seamHatchTs,
} from '../boardTelegraph';

describe('board telegraph', () => {
  it('never plates a ZOC hex and fades far reach below near', () => {
    expect(classifyReach(true, true)).toBe('zoc');
    expect(classifyReach(false, true)).toBe('enemy');
    expect(classifyReach(false, false)).toBe('open');
    expect(REACH_FILL_OPACITY.zoc).toBe(0);
    expect(reachFillOpacity('zoc', 1, 4)).toBe(0);
    expect(reachFillOpacity('open', 1, 4)).toBeGreaterThan(reachFillOpacity('open', 4, 4));
    expect(reachFillOpacity('open', 4, 4)).toBeLessThan(0.1);
  });

  it('keeps the interior wash inset so soil reads at the hex rim', () => {
    expect(fillFitsHex()).toBe(true);
    expect(REACH_FILL_RADIUS * 2).toBeLessThan(HEX_W * 0.72);
    expect(fillFitsHex(0.9)).toBe(false);
  });

  it('draws a blob silhouette, not a ring on every cell', () => {
    const a = tileId(10, 10);
    const solo = perimeterEdges([a]);
    expect(solo).toHaveLength(6);

    const b = neighborIds(a)[0];
    const pair = perimeterEdges([a, b]);
    expect(pair).toHaveLength(10);
    expect(pair.length).toBeLessThan(solo.length * 2);
  });

  it('hatches contact hotter than a quiet control seam', () => {
    expect(seamHatchTs(false)).toEqual([...FRONT_QUIET_HATCH]);
    expect(seamHatchTs(true)).toEqual([...FRONT_CONTACT_HATCH]);
    expect(FRONT_CONTACT_HATCH.length).toBeGreaterThan(FRONT_QUIET_HATCH.length);
    expect(scarIsHairline()).toBe(true);
    expect(FRONT_SCAR_W).toBeLessThan(0.09);
    expect(FRONT_SCAR_H).toBeLessThan(0.055);
    expect(scarIsHairline(0.12, 0.1)).toBe(false);
  });
});
