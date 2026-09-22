import { describe, expect, it } from 'vitest';
import { neighborIds } from '../../game/hex';
import { tileId } from '../../game/types';
import { buildTerritoryGeometry, territoryShapes } from '../territoryFill';

describe('territory fill geometry', () => {
  it('builds one ShapeGeometry from the tile union, not a disc per hex', () => {
    const a = tileId(8, 8);
    const flower = [a, ...neighborIds(a)];
    const shapes = territoryShapes(flower);
    expect(shapes).toHaveLength(1);
    expect(shapes[0]!.holes).toHaveLength(0);

    const geo = buildTerritoryGeometry(flower, { lift: 0.06, drape: () => 0.06 });
    expect(geo).not.toBeNull();
    const verts = geo!.attributes.position.count;
    // One outline (18) plus earcut internals — never 7 discs × (center+6).
    expect(verts).toBeGreaterThanOrEqual(18);
    expect(verts).toBeLessThan(7 * 7);
    const nrm = geo!.attributes.normal;
    let ny = 0;
    for (let i = 0; i < nrm.count; i++) ny += nrm.getY(i);
    expect(ny / nrm.count).toBeGreaterThan(0.8);
    geo!.dispose();
  });

  it('keeps a hole when the union is a ring', () => {
    const a = tileId(8, 8);
    const ring = neighborIds(a);
    const shapes = territoryShapes(ring);
    expect(shapes).toHaveLength(1);
    expect(shapes[0]!.holes).toHaveLength(1);
  });

  it('keeps depth-tested reach above relief between outline vertices', () => {
    const a = tileId(8, 8);
    const height = (x: number, z: number) => Math.cos(x * 4) * 0.1 + Math.sin(z * 4) * 0.1;
    const geo = buildTerritoryGeometry([a, ...neighborIds(a)], {
      maxEdge: 0.22, drape: (x, z) => height(x, z) + 0.06,
    })!;
    const p = geo.getAttribute('position'), idx = geo.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const ids = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)];
      const x = ids.reduce((n, j) => n + p.getX(j), 0) / 3;
      const y = ids.reduce((n, j) => n + p.getY(j), 0) / 3;
      const z = ids.reduce((n, j) => n + p.getZ(j), 0) / 3;
      expect(y - height(x, z)).toBeGreaterThan(0.04);
      expect(y - height(x, z)).toBeLessThan(0.08);
    }
    geo.dispose();
  });
});
