import { describe, expect, it } from 'vitest';
import { riverRibbon } from '../riverRibbon';

describe('river course rendering', () => {
  it('faces upward in either travel direction', () => {
    for (const path of [[[0, 0], [2, 0]], [[2, 0], [0, 0]], [[0, 0], [0, 2]]] as const) {
      const g = riverRibbon(path, 0.12, () => 0);
      const normals = g.getAttribute('normal');
      for (let i = 0; i < normals.count; i++) expect(normals.getY(i)).toBeGreaterThan(0.99);
      g.dispose();
    }
  });
  it('follows intervening relief and lifts both banks above the ground', () => {
    const ground = (x: number, z: number) => Math.sin(x * 2) * 0.1 + z * 0.2;
    const g = riverRibbon([[0, 0], [3, 0]], 0.2, ground);
    const p = g.getAttribute('position');
    expect(p.count).toBeGreaterThan(30);
    for (let i = 0; i < p.count; i++) {
      expect(p.getY(i)).toBeGreaterThan(ground(p.getX(i), p.getZ(i)) + 0.03);
    }
    g.dispose();
  });
});
