// Deterministic seeded RNG (mulberry32). The RNG state lives inside GameState
// so saves replay identically and combat outcomes are reproducible.

export function mulberry32(state: number): { value: number; next: number } {
  let a = state >>> 0;
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, next: a };
}

// Draw a value in [0,1) advancing the state; callers store `next` back.
export function draw(state: number): { value: number; next: number } {
  return mulberry32(state);
}

// Convenience: draw uniform in [lo, hi)
export function drawRange(state: number, lo: number, hi: number): { value: number; next: number } {
  const d = mulberry32(state);
  return { value: lo + d.value * (hi - lo), next: d.next };
}

export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
