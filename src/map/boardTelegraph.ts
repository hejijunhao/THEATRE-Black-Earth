// View-side board telegraph: reach silhouette, fill fade, frontline hatch.
// No rules live here. Variation is hashed from tile ids, never Math.random.

import { hexCorners, neighborIds, sharedEdge, tileWorldById } from '../game/hex';
import { TileId } from '../game/types';

export type ReachKind = 'open' | 'enemy' | 'zoc';

/** Drape lift for the merged reach polygon — above parcel dirt, under unit hulls. */
export const REACH_FILL_LIFT = 0.06;
/** Near-cost heart of the blob (secondary interior), not a per-hex disc. */
export const REACH_NEAR_COST_FRAC = 0.5;
export const REACH_FILL = {
  open: '#7a5c28',
  enemy: '#7a4a1c',
} as const;
export const REACH_FILL_OPACITY = {
  open: 0.52,
  enemy: 0.56,
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
export const REACH_EDGE_W = 0.028;
export const REACH_EDGE_H = 0.018;
export const REACH_EDGE_LIFT = 0.058;

export const FRONT_SCAR_LEN = 1.14;
export const FRONT_SCAR_W = 0.026;
export const FRONT_SCAR_H = 0.010;
export const FRONT_SCAR_LIFT = 0.058;
export const FRONT_GLOW_W = 0.09;
export const FRONT_GLOW_H = 0.016;
export const FRONT_GLOW_LIFT = 0.04;
export const FRONT_HATCH_LEN = 0.1;
export const FRONT_HATCH_W = 0.014;
export const FRONT_HATCH_H = 0.008;
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

export function scarIsHairline(width = FRONT_SCAR_W, height = FRONT_SCAR_H): boolean {
  return width < 0.09 && height < 0.055;
}

export interface TerritoryPoint {
  x: number;
  z: number;
}

function vertKey(p: TerritoryPoint): string {
  return `${Math.round(p.x * 10000)}:${Math.round(p.z * 10000)}`;
}

/** Neighbor on the far side of hex edge `i` (corner i → i+1). */
export function neighborAcrossHexEdge(id: TileId, edge: number): TileId | null {
  const corners = hexCorners(id);
  const a = corners[edge]!;
  const b = corners[(edge + 1) % 6]!;
  const mx = (a.x + b.x) / 2;
  const mz = (a.z + b.z) / 2;
  const { wx, wz } = tileWorldById(id);
  const ox = mx - wx;
  const oz = mz - wz;
  let best: TileId | null = null;
  let bestDot = -Infinity;
  for (const n of neighborIds(id)) {
    const nw = tileWorldById(n);
    const dot = (nw.wx - wx) * ox + (nw.wz - wz) * oz;
    if (dot > bestDot) {
      bestDot = dot;
      best = n;
    }
  }
  return best;
}

export function loopSignedArea(loop: readonly TerritoryPoint[]): number {
  let acc = 0;
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i]!;
    const q = loop[(i + 1) % loop.length]!;
    acc += p.x * q.z - q.x * p.z;
  }
  return acc / 2;
}

/**
 * Closed outline rings of a tile union — Vic/Civ province silhouette.
 * Outer rings are CCW (positive area); holes are CW.
 */
export function tileUnionLoops(interior: Iterable<TileId>): TerritoryPoint[][] {
  const set = interior instanceof Set ? interior : new Set(interior);
  if (set.size === 0) return [];

  const outgoing = new Map<string, TerritoryPoint[]>();
  const canon = new Map<string, TerritoryPoint>();
  const intern = (p: TerritoryPoint): TerritoryPoint => {
    const k = vertKey(p);
    const existing = canon.get(k);
    if (existing) return existing;
    canon.set(k, p);
    return p;
  };

  for (const id of set) {
    const corners = hexCorners(id).map(intern);
    for (let i = 0; i < 6; i++) {
      const n = neighborAcrossHexEdge(id, i);
      if (n && set.has(n)) continue;
      const a = corners[i]!;
      const b = corners[(i + 1) % 6]!;
      const k = vertKey(a);
      const list = outgoing.get(k);
      if (list) list.push(b);
      else outgoing.set(k, [b]);
    }
  }

  const used = new Set<string>();
  const loops: TerritoryPoint[][] = [];
  for (const startKey of outgoing.keys()) {
    const startOpts = outgoing.get(startKey);
    if (!startOpts) continue;
    for (const _startTo of startOpts) {
      const firstMark = `${startKey}>${vertKey(_startTo)}`;
      if (used.has(firstMark)) continue;
      const loop: TerritoryPoint[] = [];
      let curKey = startKey;
      let guard = 0;
      while (guard++ < 4096) {
        const opts = outgoing.get(curKey);
        if (!opts) break;
        let picked: TerritoryPoint | null = null;
        for (const cand of opts) {
          if (!used.has(`${curKey}>${vertKey(cand)}`)) {
            picked = cand;
            break;
          }
        }
        if (!picked) break;
        used.add(`${curKey}>${vertKey(picked)}`);
        loop.push(picked);
        curKey = vertKey(picked);
        if (curKey === startKey) break;
      }
      if (loop.length >= 3) loops.push(loop);
    }
  }
  return loops;
}

export function partitionTerritoryLoops(loops: TerritoryPoint[][]): {
  outers: TerritoryPoint[][];
  holes: TerritoryPoint[][];
} {
  const outers: TerritoryPoint[][] = [];
  const holes: TerritoryPoint[][] = [];
  for (const loop of loops) {
    if (loopSignedArea(loop) >= 0) outers.push(loop);
    else holes.push(loop);
  }
  return { outers, holes };
}

/** Near-cost subset used as a secondary interior wash. Origin is cost 0. */
export function nearReachTiles(
  tiles: Iterable<{ id: TileId; cost: number }>,
  mp: number,
): TileId[] {
  const cut = mp <= 0 ? 0 : mp * REACH_NEAR_COST_FRAC;
  const out: TileId[] = [];
  for (const t of tiles) {
    if (t.cost <= cut) out.push(t.id);
  }
  return out;
}

/** One silhouette (holes allowed), not a disc per cell. */
export function territoryIsSingleSilhouette(interior: Iterable<TileId>): boolean {
  const { outers } = partitionTerritoryLoops(tileUnionLoops(interior));
  return outers.length === 1;
}
