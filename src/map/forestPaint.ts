// North forest stems. Dense, dark cones plus their shadows were the second
// half of the rain veil — AO has more geometry to crush, and the instances
// themselves read as a charcoal band along the far edge.

export const FOREST_SOUTH = '#505440';
export const FOREST_NORTH = '#8a886b';
export const FOREST_SNOW = '#8a9078';
export const FOREST_EMIT_SOUTH = '#5a6040';
export const FOREST_EMIT_NORTH = '#8a8048';

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** 0 at mid/south, 1 on the far-north rows. */
export function northForestWeight(wz: number, worldH: number): number {
  const lat = 1 - Math.min(1, Math.max(0, wz / worldH));
  return smooth(0.36, 0.84, lat);
}

export function forestStemCount(
  isForest: boolean,
  frac: number,
  wz: number,
  hash: number,
  worldH: number,
): number {
  const north = northForestWeight(wz, worldH);
  const base = isForest ? 2 + Math.round(frac * 6) + (hash % 2) : 1 + (hash % 2);
  const n = Math.round(base * (1 - 0.7 * north));
  if (isForest) return Math.max(1, n);
  return n;
}

export function forestStemScale(base: number, wz: number, worldH: number): number {
  return base * (1 - 0.28 * northForestWeight(wz, worldH));
}
