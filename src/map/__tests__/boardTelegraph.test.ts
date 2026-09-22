import { describe, expect, it } from 'vitest';
import { neighborIds } from '../../game/hex';
import { tileId } from '../../game/types';
import {
  classifyReach,
  FRONT_CONTACT_HATCH,
  FRONT_QUIET_HATCH,
  FRONT_SCAR_H,
  FRONT_SCAR_W,
  loopSignedArea,
  nearReachTiles,
  neighborAcrossHexEdge,
  partitionTerritoryLoops,
  perimeterEdges,
  REACH_EDGE,
  REACH_FILL_OPACITY,
  reachFillOpacity,
  reachInkIsWarm,
  scarIsHairline,
  seamHatchTs,
  territoryIsSingleSilhouette,
  tileUnionLoops,
} from '../boardTelegraph';

describe('board telegraph', () => {
  it('never plates a ZOC hex and fades far reach below near', () => {
    expect(classifyReach(true, true)).toBe('zoc');
    expect(classifyReach(false, true)).toBe('enemy');
    expect(classifyReach(false, false)).toBe('open');
    expect(REACH_FILL_OPACITY.zoc).toBe(0);
    expect(reachFillOpacity('zoc', 1, 4)).toBe(0);
    expect(reachFillOpacity('open', 1, 4)).toBeGreaterThan(reachFillOpacity('open', 4, 4));
    expect(reachFillOpacity('open', 1, 4)).toBeGreaterThan(0.12);
    expect(reachFillOpacity('open', 4, 4)).toBeGreaterThan(0.10);
    expect(reachFillOpacity('open', 4, 4)).toBeLessThan(reachFillOpacity('open', 1, 4));
  });

  it('merges adjacent hexes into one silhouette, not a disc per cell', () => {
    const a = tileId(10, 10);
    const ring = neighborIds(a);
    const flower = [a, ...ring];
    expect(territoryIsSingleSilhouette(flower)).toBe(true);
    const loops = tileUnionLoops(flower);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(18);
    expect(loopSignedArea(loops[0]!)).toBeGreaterThan(0);

    const pair = tileUnionLoops([a, ring[0]!]);
    expect(pair).toHaveLength(1);
    expect(pair[0]).toHaveLength(10);

    const hole = tileUnionLoops(ring);
    const parts = partitionTerritoryLoops(hole);
    expect(parts.outers).toHaveLength(1);
    expect(parts.holes).toHaveLength(1);
    expect(parts.outers[0]).toHaveLength(18);
    expect(parts.holes[0]).toHaveLength(6);
  });

  it('keeps a near-cost heart inside the plated set', () => {
    const near = nearReachTiles(
      [
        { id: tileId(1, 1), cost: 0 },
        { id: tileId(1, 2), cost: 1 },
        { id: tileId(1, 3), cost: 2 },
        { id: tileId(1, 4), cost: 4 },
      ],
      4,
    );
    expect(near).toEqual([tileId(1, 1), tileId(1, 2), tileId(1, 3)]);
    expect(neighborAcrossHexEdge(tileId(10, 10), 0)).toBeTruthy();
  });

  it('preserves soil through a light stain and readable warm perimeter', () => {
    expect(reachFillOpacity('open', 0, 4)).toBeLessThan(0.3);
    expect(reachFillOpacity('enemy', 0, 4)).toBeLessThan(0.3);
    expect(reachInkIsWarm(REACH_EDGE.open)).toBe(true);
    expect(reachInkIsWarm(REACH_EDGE.enemy)).toBe(true);
    expect(reachInkIsWarm(REACH_EDGE.zoc)).toBe(true);
    expect(reachInkIsWarm('#f2ead4')).toBe(false);
    expect(reachInkIsWarm('#ffffff')).toBe(false);
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
