// Hero-grade terrain tiles for the #assets review column (asset-ledger status
// `review`). Same doctrine as the vehicle hero tier — models are CODE,
// deterministic, one merged indexed draw call, finished by a procedural
// detail shader — but the subject is ground: a pointy-top hex diorama cut
// out of the landscape, soil strata visible on the cut walls, and vegetation
// built from individual blade geometry rather than texture.
//
// Five kinds, all core ground classes (no rocks / trees / built features):
//   meadow — lush grassland, two blade populations over dark humus
//   steppe — dry black-earth steppe, feather-grass with seed heads
//   field  — ploughed chernozem, furrow waves, straw stubble rows
//   sand   — dry dune sand, skewed wind ripples, grain glints
//   marsh  — wet meadow, hummock grass, standing water, cattail reeds
//
// Layout: metre scale, ground plane near y = 0, walls down to y = -0.9 m,
// scaled by TERRAIN_HERO_SCALE at the end. Determinism: mulberry32 seeded
// per kind + position-hash value noise; no Math.random(), no Date.now().

import * as THREE from 'three';

export const TERRAIN_HERO_KINDS = ['meadow', 'steppe', 'field', 'sand', 'marsh'] as const;
export type TerrainHeroKind = (typeof TERRAIN_HERO_KINDS)[number];

// World units per metre. A 5.2 m hex face → ~0.42 world units, sized for the
// same review turntable the vehicle heroes use.
export const TERRAIN_HERO_SCALE = 0.08;

const HEX_R = 2.6;                 // circumradius, metres (corner at (0, R) in xz)
const APOTHEM = HEX_R * Math.sqrt(3) / 2;
const WALL_DEPTH = 0.9;            // diorama cut depth, metres

// ---------------------------------------------------------------------------
// Deterministic noise & RNG
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x: number, z: number, oct: number): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += vnoise(x * f, z * f) * amp;
    norm += amp;
    f *= 2.17;
    amp *= 0.5;
  }
  return sum / norm;
}

function insideHex(x: number, z: number, r: number): boolean {
  const a = r * Math.sqrt(3) / 2;
  for (const phi of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    if (Math.abs(x * Math.cos(phi) + z * Math.sin(phi)) > a) return false;
  }
  return true;
}

// Pointy-top corners, CCW in xz maths coordinates, corner 1 at (0, +R).
const CORNERS: [number, number][] = [];
for (let k = 0; k < 6; k++) {
  const a = Math.PI / 6 + (k * Math.PI) / 3;
  CORNERS.push([Math.cos(a) * HEX_R, Math.sin(a) * HEX_R]);
}

// ---------------------------------------------------------------------------
// Geometry accumulator — one merged buffer, aMat (rough/metal/wear) and
// aTer (sway/sparkle/wet) carried per vertex alongside colour.
// ---------------------------------------------------------------------------

interface VertMat { r: number; m: number; w?: number }
interface VertTer { sway?: number; sp?: number; wet?: number }

class GeoBuilder {
  pos: number[] = [];
  col: number[] = [];
  amat: number[] = [];
  ater: number[] = [];
  idx: number[] = [];

  get vertCount(): number { return this.pos.length / 3; }

  vert(x: number, y: number, z: number, c: THREE.Color, m: VertMat, t?: VertTer): number {
    const i = this.pos.length / 3;
    this.pos.push(x, y, z);
    this.col.push(c.r, c.g, c.b);
    this.amat.push(m.r, m.m, m.w ?? 0);
    this.ater.push(t?.sway ?? 0, t?.sp ?? 0, t?.wet ?? 0);
    return i;
  }

  tri(a: number, b: number, c: number): void { this.idx.push(a, b, c); }
  quad(a: number, b: number, c: number, d: number): void {
    this.idx.push(a, b, c, a, c, d);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
    g.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(this.amat), 3));
    g.setAttribute('aTer', new THREE.BufferAttribute(new Float32Array(this.ater), 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

// ---------------------------------------------------------------------------
// Surface cap: six subdivided corner sectors sharing deduped vertices, so
// normals smooth across the whole hex and the boundary lands exactly on the
// wall-top parameterisation.
// ---------------------------------------------------------------------------

interface CapVertexLook {
  c: THREE.Color;
  r: number;
  m?: number;
  sp?: number;
  wet?: number;
}

type HeightFn = (x: number, z: number) => number;
type CapLookFn = (
  x: number, z: number, h: number,
  ao: number, moist: number, rel: number,   // rel = h - neighbourhood mean
  grad: number,                              // |∇h|
) => CapVertexLook;

function buildCap(b: GeoBuilder, sec: number, hFn: HeightFn, look: CapLookFn): void {
  const key2i = new Map<string, number>();
  const capStart = b.vertCount;

  const getVert = (x: number, z: number): number => {
    const key = `${Math.round(x * 1e4)},${Math.round(z * 1e4)}`;
    const found = key2i.get(key);
    if (found !== undefined) return found;

    const h = hFn(x, z);
    // Horizon-style AO + local relief, sampled from the height function
    // itself: no mesh neighbour queries needed, works at any resolution.
    let occ = 0;
    let mean = 0;
    let n = 0;
    for (const rad of [0.22, 0.5]) {
      for (let d = 0; d < 6; d++) {
        const a = (d / 6) * Math.PI * 2 + rad;
        const hs = hFn(x + Math.cos(a) * rad, z + Math.sin(a) * rad);
        occ += Math.max(0, (hs - h) / rad);
        mean += hs;
        n++;
      }
    }
    mean /= n;
    const ao = 1 / (1 + occ * 0.55);
    const moist = Math.max(0, Math.min(0.6, (mean - h) * 2.4));
    const e = 0.06;
    const gx = (hFn(x + e, z) - hFn(x - e, z)) / (2 * e);
    const gz = (hFn(x, z + e) - hFn(x, z - e)) / (2 * e);
    const lk = look(x, z, h, ao, moist, h - mean, Math.hypot(gx, gz));
    const i = b.vert(x, z2y(h), z, lk.c, { r: lk.r, m: lk.m ?? 0 }, { sp: lk.sp, wet: lk.wet });
    key2i.set(key, i);
    return i;
  };

  for (let k = 0; k < 6; k++) {
    const A = CORNERS[k];
    const B = CORNERS[(k + 1) % 6];
    // Barycentric grid over triangle (centre, A, B).
    const P = (i: number, j: number): [number, number] => {
      // i = 0..sec rows from centre toward edge AB, j = 0..i across.
      const t = i / sec;
      const s = i === 0 ? 0 : j / i;
      const ex = A[0] + (B[0] - A[0]) * s;
      const ez = A[1] + (B[1] - A[1]) * s;
      return [ex * t, ez * t];
    };
    for (let i = 0; i < sec; i++) {
      for (let j = 0; j <= i; j++) {
        const p0 = P(i, j);
        const p1 = P(i + 1, j);
        const p2 = P(i + 1, j + 1);
        b.tri(getVert(p0[0], p0[1]), getVert(p1[0], p1[1]), getVert(p2[0], p2[1]));
        if (j < i) {
          const p3 = P(i, j + 1);
          b.tri(getVert(p0[0], p0[1]), getVert(p2[0], p2[1]), getVert(p3[0], p3[1]));
        }
      }
    }
  }

  ensureUpWinding(b, capStart);
}

// y is just the height; kept as a function so the intent reads at call sites.
function z2y(h: number): number { return h; }

// Flip a freshly added index range if its first face points down — winding
// depends on corner order and is cheaper to verify than to re-derive.
function ensureUpWinding(b: GeoBuilder, idxFrom: number): void {
  const start = b.idx.findIndex((_, i) => i % 3 === 0 && b.idx[i] >= idxFrom);
  if (start < 0) return;
  const [ia, ib, ic] = [b.idx[start], b.idx[start + 1], b.idx[start + 2]];
  const ax = b.pos[ia * 3], az = b.pos[ia * 3 + 2];
  const bx = b.pos[ib * 3], bz = b.pos[ib * 3 + 2];
  const cx = b.pos[ic * 3], cz = b.pos[ic * 3 + 2];
  // y of cross((B-A),(C-A)) for near-flat faces: (z1*x2 - x1*z2)
  const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
  if (ny < 0) {
    for (let i = start; i < b.idx.length; i += 3) {
      const t = b.idx[i + 1];
      b.idx[i + 1] = b.idx[i + 2];
      b.idx[i + 2] = t;
    }
  }
}

// ---------------------------------------------------------------------------
// Diorama walls + bottom: soil profile on the cut faces. Rows of vertices
// walk each hex edge at the cap's own parameterisation so the seam is exact;
// deeper rows displace outward with crumb noise that calms toward the clay.
// ---------------------------------------------------------------------------

type WallLookFn = (depth: number, u: number, x: number, z: number) => CapVertexLook;

function buildWalls(b: GeoBuilder, sec: number, hFn: HeightFn, look: WallLookFn): void {
  const rows = [0, 0.09, 0.19, 0.31, 0.45, 0.6, 0.76, WALL_DEPTH];
  for (let k = 0; k < 6; k++) {
    const A = CORNERS[k];
    const B = CORNERS[(k + 1) % 6];
    const ex = B[0] - A[0];
    const ez = B[1] - A[1];
    const nlen = Math.hypot(ez, -ex);
    const nx = ez / nlen;             // outward normal (derived from edge dir)
    const nz = -ex / nlen;
    const ring: number[][] = [];
    for (let r = 0; r < rows.length; r++) {
      const row: number[] = [];
      for (let j = 0; j <= sec; j++) {
        const t = j / sec;
        const px = A[0] + ex * t;
        const pz = A[1] + ez * t;
        const u = (k + t) * (Math.hypot(ex, ez));
        if (r === 0) {
          const h = hFn(px, pz);
          const lk = look(0, u, px, pz);
          row.push(b.vert(px, h, pz, lk.c, { r: lk.r, m: lk.m ?? 0 }, { sp: lk.sp, wet: lk.wet }));
        } else {
          const d = rows[r];
          // Crumbled topsoil bulges, clay cuts cleaner; slight pedestal taper.
          const crumb = 0.09 * Math.max(0.25, 1 - d * 1.1);
          const disp =
            (fbm(px * 2.3 + d * 3.7, pz * 2.3 - d * 2.9, 3) - 0.5) * 2 * crumb
            + (d < 0.16 ? 0.025 : 0)
            - d * 0.07;
          const lk = look(d, u, px, pz);
          row.push(b.vert(
            px + nx * disp, -d, pz + nz * disp,
            lk.c, { r: lk.r, m: lk.m ?? 0 }, { sp: lk.sp, wet: lk.wet },
          ));
        }
      }
      ring.push(row);
    }
    for (let r = 0; r < rows.length - 1; r++) {
      for (let j = 0; j < sec; j++) {
        // (upper, upper+1, lower+1, lower) keeps the face outward — derived
        // from cross(edge, down) matching (nx, nz) above.
        b.quad(ring[r][j], ring[r][j + 1], ring[r + 1][j + 1], ring[r + 1][j]);
      }
    }
  }

  // Bottom cap, facing down.
  const c = new THREE.Color('#171310');
  const bottomStart = b.vertCount;
  const centre = b.vert(0, -WALL_DEPTH, 0, c, { r: 1, m: 0 });
  const rim: number[] = [];
  for (let k = 0; k < 6; k++) {
    const taper = 1 - (WALL_DEPTH * 0.07) / APOTHEM;
    rim.push(b.vert(CORNERS[k][0] * taper, -WALL_DEPTH, CORNERS[k][1] * taper, c, { r: 1, m: 0 }));
  }
  const bIdxStart = b.idx.length;
  for (let k = 0; k < 6; k++) b.tri(centre, rim[k], rim[(k + 1) % 6]);
  // Flip to face down if the first face came out facing up.
  const [ia, ib2, ic] = [b.idx[bIdxStart], b.idx[bIdxStart + 1], b.idx[bIdxStart + 2]];
  const ny = (b.pos[ib2 * 3 + 2] - b.pos[ia * 3 + 2]) * (b.pos[ic * 3] - b.pos[ia * 3])
    - (b.pos[ib2 * 3] - b.pos[ia * 3]) * (b.pos[ic * 3 + 2] - b.pos[ia * 3 + 2]);
  if (ny > 0) {
    for (let i = bIdxStart; i < b.idx.length; i += 3) {
      const t = b.idx[i + 1];
      b.idx[i + 1] = b.idx[i + 2];
      b.idx[i + 2] = t;
    }
  }
  void bottomStart;
}

// ---------------------------------------------------------------------------
// Vegetation: individual curved blade ribbons. 9 verts / 7 tris per blade,
// written straight into the accumulator — no per-blade geometry objects.
// ---------------------------------------------------------------------------

const BLADE_TS = [0, 0.3, 0.6, 0.85];

interface BladeSpec {
  x: number; z: number; ground: number;
  H: number; wBase: number;
  tipX: number; tipZ: number;         // horizontal tip drift, metres
  root: THREE.Color; tip: THREE.Color;
  rough: number;
  sway: number;                       // tip sway amplitude, metres
}

function pushBlade(b: GeoBuilder, s: BladeSpec): void {
  const drift = Math.hypot(s.tipX, s.tipZ);
  let sx: number;
  let sz: number;
  if (drift > 1e-5) {
    sx = -s.tipZ / drift;
    sz = s.tipX / drift;
  } else {
    sx = 1; sz = 0;
  }
  const tmp = new THREE.Color();
  const rowIdx: number[][] = [];
  for (const t of BLADE_TS) {
    const px = s.x + s.tipX * t * t;
    const pz = s.z + s.tipZ * t * t;
    const py = s.ground + s.H * t * (1 - 0.18 * t * t);
    const w = s.wBase * (1 - 0.75 * t);
    tmp.copy(s.root).lerp(s.tip, Math.pow(t, 0.85));
    const ter = { sway: s.sway * t * t * TERRAIN_HERO_SCALE };
    rowIdx.push([
      b.vert(px - sx * w / 2, py, pz - sz * w / 2, tmp, { r: s.rough, m: 0 }, ter),
      b.vert(px + sx * w / 2, py, pz + sz * w / 2, tmp, { r: s.rough, m: 0 }, ter),
    ]);
  }
  tmp.copy(s.tip);
  const tipI = b.vert(
    s.x + s.tipX, s.ground + s.H * 0.82, s.z + s.tipZ, tmp,
    { r: s.rough, m: 0 }, { sway: s.sway * TERRAIN_HERO_SCALE },
  );
  for (let r = 0; r < rowIdx.length - 1; r++) {
    b.quad(rowIdx[r][0], rowIdx[r][1], rowIdx[r + 1][1], rowIdx[r + 1][0]);
  }
  const last = rowIdx[rowIdx.length - 1];
  b.tri(last[0], last[1], tipI);
}

interface BladePop {
  count: number;
  hMin: number; hMax: number;
  wBase: number;
  lean: number;                       // tip drift as a fraction of height
  roots: string[]; tips: string[];
  dryFrac: number;
  clumpFreq: number;
  clumpFloor: number;                 // min acceptance — 1 = uniform lawn
  sway: number;
  rough?: number;
  headFrac?: number;                  // feather-grass seed heads
  accept?: (x: number, z: number, h: number) => number;  // extra 0..1 gate
}

const DRY_ROOT = new THREE.Color('#6b6136');
const DRY_TIP = new THREE.Color('#a99a63');

function pushBladePop(
  b: GeoBuilder, rng: () => number, hFn: HeightFn, pop: BladePop,
  windX: number, windZ: number,
): void {
  const area = 3 * Math.sqrt(3) / 2 * HEX_R * HEX_R;
  const cell = Math.sqrt(area / pop.count);
  const roots = pop.roots.map((c) => new THREE.Color(c));
  const tips = pop.tips.map((c) => new THREE.Color(c));
  const root = new THREE.Color();
  const tip = new THREE.Color();
  const bound = HEX_R;
  for (let gx = -bound; gx < bound; gx += cell) {
    for (let gz = -bound; gz < bound; gz += cell) {
      const x = gx + (rng() - 0.5) * cell * 0.96;
      const z = gz + (rng() - 0.5) * cell * 0.96;
      if (!insideHex(x, z, HEX_R - 0.015)) { rng(); rng(); continue; }
      const clump = fbm(x * pop.clumpFreq + 31, z * pop.clumpFreq - 17, 3);
      let p = Math.max(pop.clumpFloor, Math.min(1, 0.5 + (clump - 0.5) * 2.6));
      const h = hFn(x, z);
      if (pop.accept) p *= pop.accept(x, z, h);
      if (rng() > p) { rng(); continue; }

      const dry = rng() < pop.dryFrac;
      const ci = Math.floor(rng() * roots.length);
      const jl = 1 + (rng() - 0.5) * 0.24;
      if (dry) {
        root.copy(DRY_ROOT).multiplyScalar(jl);
        tip.copy(DRY_TIP).multiplyScalar(jl);
      } else {
        root.copy(roots[ci]).multiplyScalar(jl);
        tip.copy(tips[Math.min(ci, tips.length - 1)]).multiplyScalar(jl);
      }
      const H = (pop.hMin + (pop.hMax - pop.hMin) * Math.pow(rng(), 1.25)) * (0.85 + clump * 0.35);
      const yaw = rng() * Math.PI * 2;
      const leanAmt = pop.lean * (0.35 + rng() * 0.9) * H;
      const tipX = Math.cos(yaw) * leanAmt + windX * H * 0.22;
      const tipZ = Math.sin(yaw) * leanAmt + windZ * H * 0.22;
      pushBlade(b, {
        x, z, ground: h - 0.015, H, wBase: pop.wBase,
        tipX, tipZ, root, tip,
        rough: pop.rough ?? 0.68,
        sway: pop.sway * (0.6 + rng() * 0.7),
      });

      // Feather-grass head: a pale awn ladder above the blade tip.
      if (pop.headFrac && rng() < pop.headFrac) {
        const hx = x + tipX;
        const hz = z + tipZ;
        const hy = h - 0.015 + H * 0.82;
        const head = new THREE.Color('#bcae82').multiplyScalar(jl);
        for (let a = 0; a < 3; a++) {
          const t0 = a / 3;
          const ax = hx + tipX * 0.25 * t0 + (rng() - 0.5) * 0.02;
          const az = hz + tipZ * 0.25 * t0 + (rng() - 0.5) * 0.02;
          const ay = hy + 0.045 * a;
          const aw = 0.012;
          const ter = { sway: pop.sway * 1.15 * TERRAIN_HERO_SCALE };
          const i0 = b.vert(ax - sxOf(tipX, tipZ) * aw, ay, az - szOf(tipX, tipZ) * aw, head, { r: 0.8, m: 0 }, ter);
          const i1 = b.vert(ax + sxOf(tipX, tipZ) * aw, ay, az + szOf(tipX, tipZ) * aw, head, { r: 0.8, m: 0 }, ter);
          const i2 = b.vert(ax + tipX * 0.12, ay + 0.05, az + tipZ * 0.12, head, { r: 0.8, m: 0 }, ter);
          b.tri(i0, i1, i2);
        }
      }
    }
  }
}

function sxOf(tx: number, tz: number): number {
  const d = Math.hypot(tx, tz);
  return d > 1e-5 ? -tz / d : 1;
}
function szOf(tx: number, tz: number): number {
  const d = Math.hypot(tx, tz);
  return d > 1e-5 ? tx / d : 0;
}

// Thin lying box (straw) — winding is irrelevant under a DoubleSide material.
function pushBox(
  b: GeoBuilder, cx: number, cy: number, cz: number,
  sx: number, sy: number, sz: number, yaw: number,
  c: THREE.Color, m: VertMat, t?: VertTer,
): void {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const corners: number[] = [];
  for (const dy of [-0.5, 0.5]) {
    for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] as const) {
      const lx = dx * sx;
      const lz = dz * sz;
      corners.push(b.vert(
        cx + lx * cosY - lz * sinY, cy + dy * sy, cz + lx * sinY + lz * cosY, c, m, t,
      ));
    }
  }
  const [b0, b1, b2, b3, t0, t1, t2, t3] = corners;
  b.quad(t0, t1, t2, t3);
  b.quad(b3, b2, b1, b0);
  b.quad(b0, b1, t1, t0);
  b.quad(b1, b2, t2, t1);
  b.quad(b2, b3, t3, t2);
  b.quad(b3, b0, t0, t3);
}

// Six-sided prism for cattail heads — reads round at diorama distance.
function pushPrism6(
  b: GeoBuilder, cx: number, y0: number, y1: number, r: number,
  c: THREE.Color, m: VertMat, cz: number, t?: VertTer,
): void {
  const bot: number[] = [];
  const top: number[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    bot.push(b.vert(cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r, c, m, t));
    top.push(b.vert(cx + Math.cos(a) * r, y1, cz + Math.sin(a) * r, c, m, t));
  }
  for (let k = 0; k < 6; k++) {
    b.quad(bot[k], bot[(k + 1) % 6], top[(k + 1) % 6], top[k]);
  }
  b.tri(top[0], top[2], top[4]);
  b.tri(top[0], top[1], top[2]);
  b.tri(top[2], top[3], top[4]);
  b.tri(top[4], top[5], top[0]);
}

// ---------------------------------------------------------------------------
// Soil-strata wall palettes. The black-earth profile — humus over deep
// chernozem over pale loess — is the project's namesake; sand and marsh get
// their own columns.
// ---------------------------------------------------------------------------

function wallLook(kind: TerrainHeroKind): WallLookFn {
  const c = new THREE.Color();
  const t = new THREE.Color();
  return (depth, u, x, z) => {
    const j = 1 + (hash2(x * 41.3 + depth * 13.1, z * 37.7) - 0.5) * 0.3;
    let sp = 0;
    if (kind === 'sand') {
      // Cross-bedded dry sand: banded by depth with a gentle along-wall drift.
      const band = fbm(u * 0.9 + depth * 4.2, depth * 6.5, 3);
      c.set('#a08c63').lerp(t.set('#78684a'), Math.min(1, depth * 0.9 + band * 0.4));
      sp = 0.7;
    } else if (kind === 'marsh') {
      // Peat column over grey-green gley.
      c.set('#2a2418');
      if (depth > 0.55) c.lerp(t.set('#4c4c3e'), (depth - 0.55) / 0.35);
      if (depth < 0.1) c.lerp(t.set('#37391f'), 1 - depth / 0.1);
    } else {
      // Humus → chernozem → transition mottle → loess.
      if (depth < 0.14) {
        c.set('#2e2419').lerp(t.set('#3a3d20'), Math.max(0, 1 - depth / 0.08) * 0.35);
        sp = 0.35;
      } else if (depth < 0.42) {
        c.set('#221b15');
      } else if (depth < 0.6) {
        const k2 = (depth - 0.42) / 0.18;
        const mottle = fbm(x * 3.1 + 9, z * 3.1 - 4, 3);
        c.set('#221b15').lerp(t.set('#54452f'), Math.min(1, k2 + (mottle - 0.5) * 0.8));
      } else {
        c.set('#7c6845');
        sp = 0.5;
      }
      if (kind === 'field' && depth < 0.42) c.multiplyScalar(0.92); // moist plough pan
    }
    c.multiplyScalar(j);
    return { c: c.clone(), r: 0.95, sp };
  };
}

// ---------------------------------------------------------------------------
// The five tiles
// ---------------------------------------------------------------------------

interface TileRecipe {
  sec: number;
  seed: number;
  windAngle: number;                 // radians, shared by lean bias & ripples
  hFn: HeightFn;
  cap: CapLookFn;
  pops: BladePop[];
  extras?: (b: GeoBuilder, rng: () => number, hFn: HeightFn) => void;
}

const MARSH_WATER = -0.055;

function recipe(kind: TerrainHeroKind): TileRecipe {
  const c = new THREE.Color();
  const t = new THREE.Color();

  switch (kind) {
    case 'meadow': {
      const hFn: HeightFn = (x, z) =>
        (fbm(x * 0.26 + 7.3, z * 0.26 + 3.1, 4) - 0.5) * 0.26
        + (fbm(x * 1.5 + 1.7, z * 1.5 + 8.2, 3) - 0.5) * 0.06;
      return {
        sec: 40, seed: 101, windAngle: 0.6, hFn,
        cap: (x, z, _h, ao, moist) => {
          const mossy = fbm(x * 1.1 + 4, z * 1.1 - 6, 3);
          c.set('#2f271b').lerp(t.set('#3b3f22'), mossy * 0.7);
          c.multiplyScalar(ao * (1 - moist * 0.45));
          return { c: c.clone(), r: 0.93 };
        },
        pops: [
          { // dense underlayer — carries the sward's body colour
            count: 11000, hMin: 0.09, hMax: 0.17, wBase: 0.018, lean: 0.36,
            roots: ['#2a3619', '#2e3b1c'], tips: ['#5a7031', '#637a36'],
            dryFrac: 0.05, clumpFreq: 1.6, clumpFloor: 0.6, sway: 0.01,
          },
          { // taller lit blades over it
            count: 7500, hMin: 0.15, hMax: 0.3, wBase: 0.013, lean: 0.42,
            roots: ['#32411f', '#374722', '#2f3f24'],
            tips: ['#84a04a', '#93aa55', '#7a9143'],
            dryFrac: 0.08, clumpFreq: 1.3, clumpFloor: 0.4, sway: 0.024,
          },
          { // a few pale seed stalks above the sward
            count: 130, hMin: 0.36, hMax: 0.5, wBase: 0.007, lean: 0.3,
            roots: ['#6b6a42'], tips: ['#a89a63'],
            dryFrac: 1, clumpFreq: 1.0, clumpFloor: 0.25, sway: 0.05, headFrac: 0.6,
          },
        ],
      };
    }

    case 'steppe': {
      const hFn: HeightFn = (x, z) =>
        (fbm(x * 0.3 + 2.2, z * 0.3 + 9.4, 4) - 0.5) * 0.3
        + (fbm(x * 1.9 + 5.5, z * 1.9 + 0.7, 3) - 0.5) * 0.05;
      return {
        sec: 48, seed: 211, windAngle: 2.4, hFn,
        cap: (x, z, _h, ao, moist) => {
          // Bare dry soil showing through sparse cover, with cracked-pale
          // patches — matches the map's plains family from above.
          const patch = fbm(x * 0.8 + 12, z * 0.8 - 3, 3);
          const crack = fbm(x * 2.6 - 7, z * 2.6 + 11, 3);
          c.set('#4a3e2c').lerp(t.set('#6b5f43'), patch);
          if (crack > 0.62) c.lerp(t.set('#7a6b4f'), (crack - 0.62) * 1.8);
          c.multiplyScalar(ao * (1 - moist * 0.3));
          return { c: c.clone(), r: 0.95, sp: 0.25 };
        },
        pops: [
          {
            count: 5000, hMin: 0.24, hMax: 0.46, wBase: 0.01, lean: 0.55,
            roots: ['#6d6240', '#665c3c'], tips: ['#a89a68', '#9c8f5e'],
            dryFrac: 0.75, clumpFreq: 1.1, clumpFloor: 0.1, sway: 0.04,
            headFrac: 0.16,
          },
          {
            count: 3400, hMin: 0.12, hMax: 0.24, wBase: 0.013, lean: 0.35,
            roots: ['#4a4a2e', '#45482c'], tips: ['#7d7a4a', '#767442'],
            dryFrac: 0.3, clumpFreq: 1.5, clumpFloor: 0.2, sway: 0.015,
          },
        ],
      };
    }

    case 'field': {
      const ang = 0.35;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const LAM = 0.58;
      const hFn: HeightFn = (x, z) => {
        const u = x * ca + z * sa;
        const v = -x * sa + z * ca;
        const wob = (fbm(u * 0.22 + 3.3, v * 0.55 + 6.1, 3) - 0.5) * 0.9;
        const phase = u / LAM + wob;
        const fur = Math.pow(Math.abs(Math.sin(Math.PI * phase)), 0.85);
        const clod = (fbm(x * 3.4 + 8, z * 3.4 - 2, 2) - 0.5) * 0.085 * (0.4 + fur)
          + (fbm(x * 7.6 + 2, z * 7.6 + 12, 2) - 0.5) * 0.032;
        const base = (fbm(x * 0.24 + 5, z * 0.24 + 1, 3) - 0.5) * 0.12;
        return base + (fur - 0.5) * 0.15 + clod;
      };
      return {
        sec: 60, seed: 307, windAngle: ang, hFn,
        cap: (x, z, _h, ao, moist, rel) => {
          // Furrow bottoms hold moisture and go near-black; ridge crests dry
          // out and lighten — chernozem crumb structure by relief alone.
          const crumb = fbm(x * 5.2 + 2, z * 5.2 + 7, 2);
          const dryness = Math.max(0, Math.min(1, 0.5 + rel * 6));
          c.set('#1c1713').lerp(t.set('#524433'), dryness);
          c.lerp(t.set('#5d4f3f'), Math.max(0, crumb - 0.5) * dryness * 1.2);
          c.multiplyScalar(ao * (1 - moist * 0.4));
          return { c: c.clone(), r: 0.8 + dryness * 0.18, sp: 0.3, wet: (1 - dryness) * 0.1 };
        },
        pops: [],
        extras: (b, rng, hf) => {
          // Straw stubble rows along the furrow crests + scattered straw.
          const straw = new THREE.Color();
          for (let n = -8; n <= 8; n++) {
            for (let vv = -HEX_R; vv < HEX_R; vv += 0.068) {
              const u0 = (n + 0.5) * LAM;
              const wob = (fbm(u0 * 0.22 + 3.3, vv * 0.55 + 6.1, 3) - 0.5) * 0.9;
              const u = u0 - wob * LAM;
              const x = u * ca - vv * sa;
              const z = u * sa + vv * ca;
              if (!insideHex(x, z, HEX_R - 0.05)) { rng(); continue; }
              if (rng() < 0.15) continue;
              const jx = x + (rng() - 0.5) * 0.04;
              const jz = z + (rng() - 0.5) * 0.04;
              const H = 0.06 + rng() * 0.06;
              straw.set('#a5905c').multiplyScalar(0.85 + rng() * 0.45);
              const g = hf(jx, jz) - 0.012;
              const yaw = rng() * Math.PI * 2;
              for (const dy of [0, Math.PI / 2]) {
                const w = 0.016;
                const i0 = b.vert(jx - Math.cos(yaw + dy) * w, g, jz - Math.sin(yaw + dy) * w, straw, { r: 0.85, m: 0 });
                const i1 = b.vert(jx + Math.cos(yaw + dy) * w, g, jz + Math.sin(yaw + dy) * w, straw, { r: 0.85, m: 0 });
                const i2 = b.vert(jx + (rng() - 0.5) * 0.03, g + H, jz + (rng() - 0.5) * 0.03, straw, { r: 0.85, m: 0 }, { sway: 0.004 * TERRAIN_HERO_SCALE });
                b.tri(i0, i1, i2);
              }
            }
          }
          for (let i = 0; i < 220; i++) {
            const x = (rng() - 0.5) * 2 * HEX_R;
            const z = (rng() - 0.5) * 2 * HEX_R;
            if (!insideHex(x, z, HEX_R - 0.08)) continue;
            straw.set('#b3a06b').multiplyScalar(0.75 + rng() * 0.5);
            pushBox(
              b, x, hFn(x, z) + 0.006, z,
              0.12 + rng() * 0.08, 0.007, 0.009, rng() * Math.PI * 2,
              straw, { r: 0.88, m: 0 },
            );
          }
        },
      };
    }

    case 'sand': {
      const ang = 0.45;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const hFn: HeightFn = (x, z) => {
        const u = x * ca + z * sa;
        const v = -x * sa + z * ca;
        const swell = (fbm(x * 0.15 + 11.2, z * 0.15 + 5.8, 3) - 0.5) * 0.46;
        const wob = (fbm(u * 0.28 + 1.1, v * 0.85 + 7.7, 3) - 0.5) * 1.7;
        const phase = u / 0.42 + wob + swell * 2.2;
        const rip = Math.pow(Math.abs(Math.sin(Math.PI * phase + 0.45 * Math.sin(2 * Math.PI * phase))), 0.8);
        const u2 = x * Math.cos(ang + 0.5) + z * Math.sin(ang + 0.5);
        const rip2 = Math.abs(Math.sin(Math.PI * (u2 / 0.23 + wob * 0.6)));
        return swell + rip * 0.05 + rip2 * 0.012;
      };
      return {
        sec: 72, seed: 401, windAngle: ang, hFn,
        cap: (x, z, _h, ao, _moist, rel, grad) => {
          // Crests catch light, hollows and slip faces sit darker; the glint
          // channel gives the shader its grain sparkle.
          const drift = fbm(x * 0.5 + 3, z * 0.5 + 13, 3);
          c.set('#a8956c').lerp(t.set('#8d7c59'), drift * 0.6);
          c.lerp(t.set('#c0ad83'), Math.max(0, Math.min(1, 0.5 + rel * 9)) * 0.5);
          c.multiplyScalar(ao * (1 - Math.max(0, grad * 0.9 - 0.18)));
          return { c: c.clone(), r: 0.92, sp: 1 };
        },
        pops: [],
      };
    }

    case 'marsh': {
      const raw: HeightFn = (x, z) => {
        const base = (fbm(x * 0.3 + 6.6, z * 0.3 + 2.9, 4) - 0.62) * 0.36;
        const hum = Math.pow(Math.max(0, fbm(x * 0.85 + 3.2, z * 0.85 + 9.1, 3) - 0.52) * 2.6, 1.4) * 0.26;
        return base + hum;
      };
      const hFn: HeightFn = (x, z) => Math.max(raw(x, z), MARSH_WATER);
      return {
        sec: 52, seed: 503, windAngle: 1.7, hFn,
        cap: (x, z, h, ao, moist) => {
          if (h <= MARSH_WATER + 1e-4) {
            // Standing water: dark, near-mirror; duckweed flecks come from
            // the shader's wet channel.
            c.set('#2b3a30').lerp(t.set('#38493a'), fbm(x * 0.9, z * 0.9, 2));
            return { c: c.clone(), r: 0.04, m: 0.25, wet: 1 };
          }
          const band = Math.max(0, Math.min(1, (h - MARSH_WATER) / 0.07));
          const algae = fbm(x * 1.4 + 8, z * 1.4 - 5, 3);
          c.set('#232012').lerp(t.set('#3c3f22'), band * (0.5 + algae * 0.5));
          c.multiplyScalar(ao * (1 - moist * 0.4));
          // Wet mud sheen right at the shoreline.
          return { c: c.clone(), r: 0.4 + band * 0.55, wet: (1 - band) * 0.7 };
        },
        pops: [
          {
            count: 6800, hMin: 0.12, hMax: 0.3, wBase: 0.013, lean: 0.45,
            roots: ['#39422a', '#343d26'], tips: ['#5d6b38', '#556433'],
            dryFrac: 0.22, clumpFreq: 0.85, clumpFloor: 0.02, sway: 0.02,
            accept: (x, z, h) => {
              // Grass rides the hummocks; shorelines stay open so the pools
              // actually read as water between them.
              if (h <= MARSH_WATER + 0.02) return 0;
              return Math.min(1, (h - MARSH_WATER - 0.02) * 8);
            },
          },
        ],
        extras: (b, rng, hf) => {
          // Cattail reeds along the waterline: stem, two leaves, brown head.
          const stem = new THREE.Color();
          const head = new THREE.Color();
          let placed = 0;
          let guard = 0;
          while (placed < 70 && guard++ < 4000) {
            const x = (rng() - 0.5) * 2 * HEX_R;
            const z = (rng() - 0.5) * 2 * HEX_R;
            if (!insideHex(x, z, HEX_R - 0.1)) continue;
            const h = hf(x, z);
            if (h > MARSH_WATER + 0.09 || h < MARSH_WATER - 0.001) continue;
            const H = 0.75 + rng() * 0.55;
            const yaw = rng() * Math.PI * 2;
            const leanX = Math.cos(yaw) * H * 0.08;
            const leanZ = Math.sin(yaw) * H * 0.08;
            stem.set('#44502c').multiplyScalar(0.85 + rng() * 0.3);
            pushBlade(b, {
              x, z, ground: h - 0.02, H, wBase: 0.02,
              tipX: leanX, tipZ: leanZ, root: stem, tip: stem,
              rough: 0.7, sway: 0.03,
            });
            for (let l = 0; l < 2; l++) {
              const ly = rng() * Math.PI * 2;
              pushBlade(b, {
                x: x + (rng() - 0.5) * 0.03, z: z + (rng() - 0.5) * 0.03,
                ground: h - 0.02, H: H * (0.55 + rng() * 0.25), wBase: 0.014,
                tipX: Math.cos(ly) * H * 0.22, tipZ: Math.sin(ly) * H * 0.22,
                root: stem, tip: stem, rough: 0.7, sway: 0.035,
              });
            }
            head.set('#6d4c2e').multiplyScalar(0.85 + rng() * 0.3);
            pushPrism6(
              b, x + leanX * 0.92, h - 0.02 + H * 0.78, h - 0.02 + H * 0.78 + 0.16,
              0.024, head, { r: 0.9, m: 0 }, z + leanZ * 0.92,
              { sway: 0.028 * TERRAIN_HERO_SCALE },
            );
            placed++;
          }
        },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function makeTerrainHeroGeometry(kind: TerrainHeroKind): THREE.BufferGeometry {
  const r = recipe(kind);
  const rng = mulberry32(r.seed);
  const b = new GeoBuilder();

  buildCap(b, r.sec, r.hFn, r.cap);
  buildWalls(b, r.sec, r.hFn, wallLook(kind));

  const vegStart = b.vertCount;
  const windX = Math.cos(r.windAngle);
  const windZ = Math.sin(r.windAngle);
  for (const pop of r.pops) pushBladePop(b, rng, r.hFn, pop, windX, windZ);
  r.extras?.(b, rng, r.hFn);

  const g = b.build();

  // Soften vegetation normals toward up: averaged ribbon normals light like
  // a surface of leaves instead of a heap of random facets.
  const norm = g.attributes.normal as THREE.BufferAttribute;
  for (let i = vegStart; i < norm.count; i++) {
    const nx = norm.getX(i);
    const ny = norm.getY(i) + 1.35;
    const nz = norm.getZ(i);
    const len = Math.hypot(nx, ny, nz) || 1;
    norm.setXYZ(i, nx / len, ny / len, nz / len);
  }

  g.scale(TERRAIN_HERO_SCALE, TERRAIN_HERO_SCALE, TERRAIN_HERO_SCALE);
  return g;
}

// One shared material for the whole tier: standard PBR fed by vertex colour
// and the aMat / aTer channels, plus procedural ground detail — multi-scale
// albedo mottle, grain-glint sparkle, duckweed flecks, micro normal bump,
// and a time-uniform wind sway on anything with a sway weight.
let sharedMat: THREE.MeshStandardMaterial | null = null;

export function getTerrainHeroMaterial(): THREE.MeshStandardMaterial {
  if (!sharedMat) sharedMat = makeTerrainHeroMaterial();
  return sharedMat;
}

export function makeTerrainHeroMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1.0,
    metalness: 1.0,
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    mat.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aMat;
        attribute vec3 aTer;
        uniform float uTime;
        varying vec3 vMat;
        varying vec3 vTer;
        varying vec3 vPosM;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vMat = aMat;
        vTer = aTer;
        if (aTer.x > 0.0) {
          float ph = position.x * 27.0 + position.z * 41.0;
          float gust = sin(uTime * 1.4 + ph) * 0.6 + sin(uTime * 2.6 + ph * 1.7) * 0.4;
          transformed.xz += vec2(0.66, 0.4) * (gust * aTer.x);
        }
        vPosM = transformed / ${TERRAIN_HERO_SCALE};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vMat;
        varying vec3 vTer;
        varying vec3 vPosM;
        float terraHash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        }
        float terraNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(terraHash(i), terraHash(i + vec3(1,0,0)), f.x),
                mix(terraHash(i + vec3(0,1,0)), terraHash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(terraHash(i + vec3(0,0,1)), terraHash(i + vec3(1,0,1)), f.x),
                mix(terraHash(i + vec3(0,1,1)), terraHash(i + vec3(1,1,1)), f.x), f.y),
            f.z);
        }
        float terraFbm(vec3 p) {
          return terraNoise(p) * 0.5 + terraNoise(p * 2.03) * 0.25 + terraNoise(p * 4.09) * 0.125;
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 pM = vPosM;
        float mottleL = terraFbm(pM * 0.45);
        float mottleM = terraFbm(pM * 2.6);
        float grain = terraNoise(pM * 26.0);
        diffuseColor.rgb *= 1.0 + (mottleL - 0.5) * 0.18;
        diffuseColor.rgb *= 1.0 + (mottleM - 0.5) * 0.16;
        diffuseColor.rgb *= 1.0 + (grain - 0.5) * 0.14;
        // Grain glints: sand sparkle and embedded soil grit.
        float cellR = terraHash(floor(pM * 150.0));
        float glint = step(1.0 - vTer.y * 0.012, cellR) * vTer.y;
        diffuseColor.rgb += vec3(0.34, 0.32, 0.26) * glint;
        // Duckweed / algal flecks on wet surfaces.
        float fleck = step(0.955, terraNoise(pM * 55.0)) * vTer.z;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.27, 0.33, 0.15), fleck * 0.65);`,
      )
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        // Micro relief on ground surfaces; blades keep their smooth ribbon
        // normals (sway weight doubles as the vegetation mask).
        float isVeg = step(0.00001, vTer.x);
        vec3 bump = vec3(
          terraNoise(pM * 30.0),
          terraNoise(pM * 30.0 + vec3(11.3, 7.7, 3.1)),
          terraNoise(pM * 30.0 + vec3(4.7, 19.1, 8.9))) - 0.5;
        vec3 bumpF = vec3(
          terraNoise(pM * 90.0),
          terraNoise(pM * 90.0 + vec3(5.1, 3.7, 9.3)),
          terraNoise(pM * 90.0 + vec3(15.7, 2.1, 6.9))) - 0.5;
        float bAmp = mix(0.34, 0.05, isVeg) * (1.0 - vTer.z * 0.85);
        normal = normalize(normal + bump * bAmp + bumpF * bAmp * 0.6 * vTer.y);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = clamp(
          vMat.x + (grain - 0.5) * 0.2 - glint * 0.55, 0.03, 1.0);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `float metalnessFactor = clamp(vMat.y + glint * 0.2, 0.0, 1.0);`,
      );
  };
  return mat;
}

export function makeTerrainHero(kind: TerrainHeroKind): {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
} {
  return { geometry: makeTerrainHeroGeometry(kind), material: getTerrainHeroMaterial() };
}
