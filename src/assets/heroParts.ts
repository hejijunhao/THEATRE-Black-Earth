// Deterministic metre-scale part kit for operational vehicle models.
// Merged vertex paint defines materials; diffuse lighting reveals geometry.

import * as THREE from 'three';

// World-units-per-metre when a hero model is scaled down onto a base plate.
// Kept in one place because the weathering shader converts positions back to
// metres so noise frequencies can be authored in real-world terms.
export const HERO_SCALE = 0.026;

// Shared hero-tier palette: same muted faction split as vehicles.ts, one
// step richer. Every hero factory draws from this so the tier reads as one
// production line, not four art styles.
export const HERO_PAINT: Record<'UA' | 'RU', { base: string; dark: string; light: string }> = {
  // Quiet faction tint; hull and turret values separate under diffuse light.
  UA: { base: '#465147', dark: '#202620', light: '#7b8771' },
  RU: { base: '#544c3f', dark: '#28231e', light: '#91806a' },
};

export interface HeroMatSet {
  BODY: HeroMat; TOP: HeroMat; SHADE: HeroMat;
  TRACKM: HeroMat; RUBBER: HeroMat; STEEL: HeroMat; DARKSTEEL: HeroMat;
  MUZZLE: HeroMat; CANVAS: HeroMat; CANVAS2: HeroMat; OPTIC: HeroMat;
}

export function heroMats(faction: 'UA' | 'RU'): HeroMatSet {
  const f = HERO_PAINT[faction];
  return {
    BODY: { c: f.base, r: 0.72, m: 0.12 },
    TOP: { c: f.light, r: 0.74, m: 0.1 },
    SHADE: { c: f.dark, r: 0.8, m: 0.1 },
    TRACKM: { c: '#3b3a34', r: 0.58, m: 0.72, w: 0.7 },
    RUBBER: { c: '#2f312b', r: 0.92, m: 0.02 },
    STEEL: { c: '#4e4f48', r: 0.45, m: 0.85, w: 0.5 },
    DARKSTEEL: { c: '#383933', r: 0.55, m: 0.7 },
    MUZZLE: { c: '#383933', r: 0.5, m: 0.75, w: 0.6 },
    CANVAS: { c: '#4f4a3a', r: 0.95, m: 0.0 },
    CANVAS2: { c: '#474233', r: 0.95, m: 0.0 },
    OPTIC: { c: '#39423f', r: 0.22, m: 0.35 },
  };
}

export interface HeroMat {
  c: string;        // sRGB-as-linear hex, same convention as parts.ts paint()
  r: number;        // roughness 0..1
  m: number;        // metalness 0..1
  w?: number;       // wear 0..1 — handled/abraded parts get edge-wear noise
  grad?: { bot: string; y0: number; y1: number }; // vertical albedo ramp (m)
}

export interface HeroXF {
  x?: number; y?: number; z?: number;
  rx?: number; ry?: number; rz?: number; // applied rz -> rx -> ry, then move
}

function finish(g: THREE.BufferGeometry, mat: HeroMat, t?: HeroXF): THREE.BufferGeometry {
  if (t) {
    if (t.rz) g.rotateZ(t.rz);
    if (t.rx) g.rotateX(t.rx);
    if (t.ry) g.rotateY(t.ry);
    g.translate(t.x ?? 0, t.y ?? 0, t.z ?? 0);
  }
  const n = g.attributes.position.count;
  const pos = g.attributes.position;
  const col = new Float32Array(n * 3);
  const amat = new Float32Array(n * 3);
  const c = new THREE.Color(mat.c);
  const cb = mat.grad ? new THREE.Color(mat.grad.bot) : null;
  for (let i = 0; i < n; i++) {
    let cr = c.r, cg = c.g, cbl = c.b;
    if (cb && mat.grad) {
      const t01 = Math.min(1, Math.max(0, (pos.getY(i) - mat.grad.y0) / (mat.grad.y1 - mat.grad.y0)));
      cr = cb.r + (c.r - cb.r) * t01;
      cg = cb.g + (c.g - cb.g) * t01;
      cbl = cb.b + (c.b - cb.b) * t01;
    }
    col[i * 3] = cr; col[i * 3 + 1] = cg; col[i * 3 + 2] = cbl;
    amat[i * 3] = mat.r; amat[i * 3 + 1] = mat.m; amat[i * 3 + 2] = mat.w ?? 0;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(amat, 3));
  return g;
}

export function hbox(w: number, h: number, d: number, mat: HeroMat, t?: HeroXF): THREE.BufferGeometry {
  // Small edge chamfers catch light; broad armour faces stay planar.
  const bevel = Math.min(0.045, w * 0.12, h * 0.12, d * 0.12);
  if (Math.min(w, h, d) < 0.10) return finish(new THREE.BoxGeometry(w, h, d), mat, t);
  return hplate([
    { y: -h / 2, w: w - bevel * 2, d: d - bevel * 2, cut: bevel },
    { y: -h / 2 + bevel, w, d, cut: bevel },
    { y: h / 2 - bevel, w, d, cut: bevel },
    { y: h / 2, w: w - bevel * 2, d: d - bevel * 2, cut: bevel },
  ], mat, t);
}

export function hcyl(
  rT: number, rB: number, len: number, seg: number, mat: HeroMat,
  axis: 'x' | 'y' | 'z' = 'y', t?: HeroXF,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rT, rB, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return finish(g, mat, t);
}

export function hsphere(r: number, mat: HeroMat, t?: HeroXF, ws = 10, hs = 7): THREE.BufferGeometry {
  return finish(new THREE.SphereGeometry(r, ws, hs), mat, t);
}

export function htorus(R: number, tube: number, mat: HeroMat, t?: HeroXF, seg = 12, tseg = 6): THREE.BufferGeometry {
  return finish(new THREE.TorusGeometry(R, tube, tseg, seg), mat, t);
}

// Indexed flat-shaded frustum box, same shape contract as parts.ts ctrap.
export function htrap(
  w: number, d: number, wT: number, dT: number, h: number, mat: HeroMat,
  t?: HeroXF, shiftX = 0, shiftZ = 0,
): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2, hwT = wT / 2, hdT = dT / 2;
  const b0 = [hw, 0, -hd], b1 = [hw, 0, hd], b2 = [-hw, 0, hd], b3 = [-hw, 0, -hd];
  const t0 = [shiftX + hwT, h, shiftZ - hdT], t1 = [shiftX + hwT, h, shiftZ + hdT];
  const t2 = [shiftX - hwT, h, shiftZ + hdT], t3 = [shiftX - hwT, h, shiftZ - hdT];
  const quads = [
    [t3, t2, t1, t0], [b0, b1, b2, b3],
    [b1, b0, t0, t1], [b3, b2, t2, t3],
    [b2, b1, t1, t2], [b0, b3, t3, t0],
  ];
  const pos: number[] = [];
  const idx: number[] = [];
  for (const q of quads) {
    const base = pos.length / 3;
    for (const v of q) pos.push(v[0], v[1], v[2]);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return finish(g, mat, t);
}

/** Convex eight-sided armour sections: real cheek slopes and clipped corners. */
export function hplate(
  rings: Array<{ y: number; w: number; d: number; cut: number; x?: number }>,
  mat: HeroMat, t?: HeroXF,
): THREE.BufferGeometry {
  const loops = rings.map(r => {
    const w = r.w / 2, d = r.d / 2, c = Math.min(r.cut, w * 0.8, d * 0.8);
    return [[-w+c,-d],[-w,-d+c],[-w,d-c],[-w+c,d],
      [w-c,d],[w,d-c],[w,-d+c],[w-c,-d]]
      .map(([x,z]) => [x + (r.x ?? 0), r.y, z]);
  });
  const p: number[] = [], idx: number[] = [];
  const face = (vs: number[][]) => {
    const start = p.length / 3;
    vs.forEach(v => p.push(...v));
    for (let i = 1; i < vs.length - 1; i++) idx.push(start, start+i, start+i+1);
  };
  face([...loops[0]].reverse());
  for (let r = 0; r < loops.length-1; r++) for (let i = 0; i < 8; i++) {
    const j = (i+1)%8;
    face([loops[r][i],loops[r][j],loops[r+1][j],loops[r+1][i]]);
  }
  face(loops[loops.length-1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return finish(g, mat, t);
}

// Merge that carries the aMat attribute (geomUtils' merger would drop it).
// Every three.js primitive we use is indexed; htrap is indexed by design.
export function mergeHero(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndex = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIndex += g.index!.count;
  }
  const merged = new THREE.BufferGeometry();
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const col = new Float32Array(totalVerts * 3);
  const amat = new Float32Array(totalVerts * 3);
  const idx = new Uint32Array(totalIndex);
  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, vOff * 3);
    norm.set(g.attributes.normal.array as Float32Array, vOff * 3);
    col.set(g.attributes.color.array as Float32Array, vOff * 3);
    amat.set(g.attributes.aMat.array as Float32Array, vOff * 3);
    for (let i = 0; i < g.index!.count; i++) {
      idx[iOff + i] = (g.index!.array[i] as number) + vOff;
    }
    iOff += g.index!.count;
    vOff += g.attributes.position.count;
  }
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  merged.setAttribute('aMat', new THREE.BufferAttribute(amat, 3));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  return merged;
}

// Shared PBR material. aMat carries roughness / metalness / wear per part;
// legacy props have a deliberately matte default attribute.
let sharedHeroMaterial: THREE.MeshStandardMaterial | null = null;
export function getHeroMaterial(): THREE.MeshStandardMaterial {
  if (!sharedHeroMaterial) sharedHeroMaterial = makeHeroMaterial();
  return sharedHeroMaterial;
}

export function makeHeroMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.12, envMapIntensity: 0.65 });
  Object.assign(material, { defaultAttributeValues: { color: [1, 1, 1], uv: [0, 0], aMat: [0.88, 0.02, 0] } });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aMat; varying vec3 vPartMat; varying vec3 vPaintPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintPos = position; vPartMat = aMat;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vPaintPos;
        varying vec3 vPartMat;
        float paintHash(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
        float paintNoise(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(paintHash(i),paintHash(i+vec3(1,0,0)),f.x),
                         mix(paintHash(i+vec3(0,1,0)),paintHash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(paintHash(i+vec3(0,0,1)),paintHash(i+vec3(1,0,1)),f.x),
                         mix(paintHash(i+vec3(0,1,1)),paintHash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 metre = vPaintPos / ${HERO_SCALE.toFixed(4)};
        float paintPatch = paintNoise(metre * vec3(1.8, 2.8, 2.2));
        float paintMask = smoothstep(0.40, 0.62, paintPatch) * (1.0 - smoothstep(0.25,0.6,vPartMat.y));
        diffuseColor.rgb *= 1.0 - paintMask * 0.28;
        float grain = paintNoise(metre * 65.0) - 0.5;
        float resolved = 1.0 - smoothstep(0.03,0.12,length(fwidth(metre)));
        diffuseColor.rgb *= 1.0 + grain * 0.10 * resolved;
        float dust = (1.0 - smoothstep(0.15,1.35,metre.y)) * (0.16 + paintPatch * 0.16);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.19,0.155,0.105), dust);
      `)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(vPartMat.x + grain * 0.10 * resolved + dust * 0.15, 0.24, 1.0);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = vPartMat.y * (1.0 - dust);`);
  };
  material.customProgramCacheKey = () => 'vehicle-pbr-v2';
  return material;
}
