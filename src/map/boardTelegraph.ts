// View-side board telegraph: reach silhouette, fill fade, frontline hatch.
// No rules live here. Variation is hashed from tile ids, never Math.random.

import { neighborIds, sharedEdge, HEX_W } from '../game/hex';
import { TileId } from '../game/types';

export type ReachKind = 'open' | 'enemy' | 'zoc';

/** Inset of the hex apothem so soil still reads at the rim — not a 0.9 plate. */
export const REACH_FILL_RADIUS = 0.78;
export const REACH_FILL = {
  open: '#7a5c28',
  enemy: '#7a4a1c',
} as const;
export const REACH_FILL_OPACITY = {
  open: 0.48,
  enemy: 0.52,
  zoc: 0,
} as const;

/** Warm umber / ochre — darker than the field, not ink-white. Seam only. */
export const REACH_EDGE = {
  open: '#8a6828',
  enemy: '#8a5418',
  zoc: '#a07820',
} as const;
export const REACH_EDGE_OPACITY = {
  open: 0.56,
  enemy: 0.6,
  zoc: 0.66,
} as const;
export const REACH_EDGE_LEN = 1.1;
export const REACH_EDGE_W = 0.052;
export const REACH_EDGE_H = 0.018;
export const REACH_EDGE_LIFT = 0.058;

export const FRONT_SCAR_LEN = 1.14;
export const FRONT_SCAR_W = 0.072;
export const FRONT_SCAR_H = 0.042;
export const FRONT_SCAR_LIFT = 0.058;
export const FRONT_GLOW_W = 0.16;
export const FRONT_GLOW_H = 0.016;
export const FRONT_GLOW_LIFT = 0.04;
export const FRONT_HATCH_LEN = 0.1;
export const FRONT_HATCH_W = 0.02;
export const FRONT_HATCH_H = 0.024;
export const FRONT_HATCH_LIFT = 0.068;
export const FRONT_QUIET_HATCH = [-0.22, 0.22] as const;
export const FRONT_CONTACT_HATCH = [-0.36, -0.12, 0.12, 0.36] as const;

export const FRONT_COLOR = {
  glowQuiet: '#5a4430',
  glowContact: '#8a5a28',
  scarQuiet: '#2c2218',
  scarContact: '#5a3a1c',
  hatchQuiet: '#1e1812',
  hatchContact: '#6a4420',
} as const;
export const FRONT_OPACITY = {
  glowQuiet: 0.28,
  glowContact: 0.4,
  scarQuiet: 0.94,
  scarContact: 0.96,
  hatchQuiet: 0.78,
  hatchContact: 0.9,
} as const;

export function classifyReach(entersZOC: boolean, enemyGround: boolean): ReachKind {
  if (entersZOC) return 'zoc';
  if (enemyGround) return 'enemy';
  return 'open';
}

/** Near hexes hold the stain; far hexes fade but stay visible. ZOC never plates. */
export function reachFillOpacity(kind: ReachKind, cost: number, mp: number): number {
  const base = REACH_FILL_OPACITY[kind];
  if (base <= 0) return 0;
  const t = mp <= 0 ? 1 : 1 - Math.min(1, cost / mp);
  return base * (0.64 + 0.36 * t);
}

/** Ochre / umber, not cool ink-white or a bright unfilled hex outline. */
export function reachInkIsWarm(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r >= 100 && g >= 70 && b <= g - 8 && r > b + 30 && r + g > b * 2.5;
}

/** Near wash outranks the seam so the soil stain leads the silhouette. */
export function reachFillLeadsRim(kind: ReachKind = 'open', cost = 1, mp = 4): boolean {
  if (kind === 'zoc') return false;
  return reachFillOpacity(kind, cost, mp) > REACH_EDGE_OPACITY[kind] * 0.55;
}

export interface TelegraphEdge {
  mx: number;
  mz: number;
  ex: number;
  ez: number;
  inside: TileId;
  outside: TileId;
}

export function edgePairKey(a: TileId, b: TileId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Outer silhouette of a tile blob — Civ/Vic border, not a per-hex ring soup. */
export function perimeterEdges(interior: Iterable<TileId>): TelegraphEdge[] {
  const set = interior instanceof Set ? interior : new Set(interior);
  const out: TelegraphEdge[] = [];
  const seen = new Set<string>();
  for (const id of set) {
    for (const nId of neighborIds(id)) {
      if (set.has(nId)) continue;
      const key = edgePairKey(id, nId);
      if (seen.has(key)) continue;
      seen.add(key);
      const edge = sharedEdge(id, nId);
      if (!edge) continue;
      out.push({ ...edge, inside: id, outside: nId });
    }
  }
  return out;
}

export function seamHatchTs(contact: boolean): readonly number[] {
  return contact ? FRONT_CONTACT_HATCH : FRONT_QUIET_HATCH;
}

export function fillFitsHex(radius = REACH_FILL_RADIUS): boolean {
  return radius * 2 < HEX_W * 0.92 && radius < 0.84;
}

export function scarIsHairline(width = FRONT_SCAR_W, height = FRONT_SCAR_H): boolean {
  return width < 0.09 && height < 0.055;
}
