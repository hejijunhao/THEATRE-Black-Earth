// View-side board telegraph: reach silhouette, fill fade, frontline hatch.
// No rules live here. Variation is hashed from tile ids, never Math.random.

import { neighborIds, sharedEdge, HEX_W } from '../game/hex';
import { TileId } from '../game/types';

export type ReachKind = 'open' | 'enemy' | 'zoc';

/** Inset well below the hex apothem so soil reads at the rim — not a plate. */
export const REACH_FILL_RADIUS = 0.56;
export const REACH_FILL = {
  open: '#d2cdb8',
  enemy: '#c2a47c',
} as const;
export const REACH_FILL_OPACITY = {
  open: 0.09,
  enemy: 0.11,
  zoc: 0,
} as const;

export const REACH_EDGE = {
  open: '#ebe4ce',
  enemy: '#c9a06a',
  zoc: '#d4b05a',
} as const;
export const REACH_EDGE_OPACITY = {
  open: 0.5,
  enemy: 0.58,
  zoc: 0.78,
} as const;
export const REACH_EDGE_LEN = 1.08;
export const REACH_EDGE_W = 0.034;
export const REACH_EDGE_H = 0.01;
export const REACH_EDGE_LIFT = 0.05;

export const FRONT_SCAR_LEN = 1.12;
export const FRONT_SCAR_W = 0.044;
export const FRONT_SCAR_H = 0.026;
export const FRONT_SCAR_LIFT = 0.042;
export const FRONT_GLOW_W = 0.11;
export const FRONT_GLOW_H = 0.01;
export const FRONT_GLOW_LIFT = 0.03;
export const FRONT_HATCH_LEN = 0.082;
export const FRONT_HATCH_W = 0.015;
export const FRONT_HATCH_H = 0.018;
export const FRONT_HATCH_LIFT = 0.05;
export const FRONT_QUIET_HATCH = [-0.22, 0.22] as const;
export const FRONT_CONTACT_HATCH = [-0.36, -0.12, 0.12, 0.36] as const;

export const FRONT_COLOR = {
  glowQuiet: '#4a3a28',
  glowContact: '#6a4a28',
  scarQuiet: '#221c16',
  scarContact: '#3a2818',
  hatchQuiet: '#1a1612',
  hatchContact: '#4a321c',
} as const;
export const FRONT_OPACITY = {
  glowQuiet: 0.14,
  glowContact: 0.2,
  scarQuiet: 0.9,
  scarContact: 0.94,
  hatchQuiet: 0.7,
  hatchContact: 0.82,
} as const;

export function classifyReach(entersZOC: boolean, enemyGround: boolean): ReachKind {
  if (entersZOC) return 'zoc';
  if (enemyGround) return 'enemy';
  return 'open';
}

/** Near hexes hold the wash; far hexes whisper. ZOC never plates. */
export function reachFillOpacity(kind: ReachKind, cost: number, mp: number): number {
  const base = REACH_FILL_OPACITY[kind];
  if (base <= 0) return 0;
  const t = mp <= 0 ? 1 : 1 - Math.min(1, cost / mp);
  return base * (0.52 + 0.48 * t);
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
  return radius * 2 < HEX_W * 0.72;
}

export function scarIsHairline(width = FRONT_SCAR_W, height = FRONT_SCAR_H): boolean {
  return width < 0.07 && height < 0.04;
}
