// Hero-grade part kit for inspector/showcase factories (asset-ledger status
// `review`). Same doctrine as parts.ts — models are CODE, deterministic,
// one merged draw call — but authored at metre scale with per-vertex
// material properties (roughness / metalness / wear) in an `aMat` attribute,
// and finished by a procedural triplanar weathering shader instead of flat
// vertex colour alone. No textures, no binaries, no Math.random().

import * as THREE from 'three';

// World-units-per-metre when a hero model is scaled down onto a base plate.
// Kept in one place because the weathering shader converts positions back to
// metres so noise frequencies can be authored in real-world terms.
export const HERO_SCALE = 0.026;

// Shared hero-tier palette: same muted faction split as vehicles.ts, one
// step richer. Every hero factory draws from this so the tier reads as one
// production line, not four art styles.
export const HERO_PAINT: Record<'UA' | 'RU', { base: string; dark: string; light: string }> = {
  // Value split against khaki soil: dark hull, lighter top plates.
  // Tops must stay under field luma — cream tops vanished on khaki at boot.
  UA: { base: '#262c20', dark: '#10120c', light: '#7a8260' },
  RU: { base: '#2a261c', dark: '#12100c', light: '#7c7054' },
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
  return finish(new THREE.BoxGeometry(w, h, d), mat, t);
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

// One MeshStandardMaterial finished with procedural, position-based
// weathering: paint mottle, fine grain, dust that pools low and settles on
// up-facing plates, rust speckle on bare steel, noise-broken edge wear on
// handled parts. Everything is derived from object-space position, so it is
// deterministic and survives the merge (no UVs anywhere). Tone stays
// restrained — a field vehicle, not a wreck (asset-ledger §1.4).
let sharedHeroMaterial: THREE.MeshStandardMaterial | null = null;

// Armor / recon keep this shared weathered wash. MECH / ARTY leave it —
// rain's veil-break lifts the grey-olive mix to pale plastic.
export function getHeroMaterial(): THREE.MeshStandardMaterial {
  if (!sharedHeroMaterial) sharedHeroMaterial = makeHeroMaterial();
  return sharedHeroMaterial;
}

export function makeHeroMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1.0,
    metalness: 1.0,
    // Flat flood wash erased the hull/top split. Keep-alive is dim;
    // the shader adds light only on up-facing plates.
    emissive: new THREE.Color('#1c1810'),
    emissiveIntensity: 0.16,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aMat;
        varying vec3 vMat;
        varying vec3 vObjM;
        varying vec3 vNrmObj;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vMat = aMat;
        #ifdef USE_INSTANCING
          // A formation draws one geometry several times. Offsetting the
          // noise field by the instance's ground position — in metres, like
          // every other frequency here — stops four tanks on one base plate
          // from carrying an identical set of streaks, dust and rust.
          vObjM = (position + vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2])) / ${HERO_SCALE};
        #else
          vObjM = position / ${HERO_SCALE};
        #endif
        vNrmObj = normal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vMat;
        varying vec3 vObjM;
        varying vec3 vNrmObj;
        float heroHash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        }
        float heroNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(heroHash(i), heroHash(i + vec3(1,0,0)), f.x),
                mix(heroHash(i + vec3(0,1,0)), heroHash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(heroHash(i + vec3(0,0,1)), heroHash(i + vec3(1,0,1)), f.x),
                mix(heroHash(i + vec3(0,1,1)), heroHash(i + vec3(1,1,1)), f.x), f.y),
            f.z);
        }
        float heroFbm(vec3 p) {
          return heroNoise(p) * 0.5 + heroNoise(p * 2.03) * 0.25 + heroNoise(p * 4.09) * 0.125;
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 pM = vObjM;
        float isPaint = 1.0 - smoothstep(0.3, 0.6, vMat.y);
        float mottle = heroFbm(pM * 0.55);
        float grain = heroNoise(pM * 22.0);
        diffuseColor.rgb *= 1.0 + (mottle - 0.5) * 0.22 * isPaint;
        diffuseColor.rgb *= 1.0 + (grain - 0.5) * 0.10;
        float dustN = heroFbm(pM * vec3(1.4, 3.4, 1.4));
        float dust = smoothstep(1.9, 0.1, pM.y) * (0.35 + 0.65 * dustN) * 0.5;
        dust += max(vNrmObj.y, 0.0) * dustN * 0.07;
        dust = clamp(dust, 0.0, 0.6);
        vec3 dustC = vec3(0.230, 0.198, 0.142);
        diffuseColor.rgb = mix(diffuseColor.rgb, dustC, dust * (0.9 - 0.45 * vMat.y));
        float rust = step(0.82, heroNoise(pM * 9.0)) * smoothstep(0.5, 0.8, vMat.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.190, 0.102, 0.055), rust * 0.45);
        float wearN = smoothstep(0.55, 0.95, heroNoise(pM * 14.0)) * vMat.z;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.30, 0.28), wearN * 0.35);
        // Rain streaking down near-vertical plates.
        float vertMask = 1.0 - smoothstep(0.25, 0.5, abs(vNrmObj.y));
        float streak = heroNoise(vec3(pM.x * 7.0, pM.y * 0.9, pM.z * 7.0));
        streak = smoothstep(0.55, 0.9, streak) * vertMask;
        diffuseColor.rgb *= 1.0 - streak * 0.13;
        // Dark hull / light top — the boot-height silhouette on khaki.
        float upFace = clamp(vNrmObj.y, 0.0, 1.0);
        vec3 hullDark = vec3(0.07, 0.07, 0.05);
        vec3 topLight = vec3(0.30, 0.32, 0.20);
        diffuseColor.rgb = mix(mix(hullDark, diffuseColor.rgb, 0.55), mix(diffuseColor.rgb, topLight, 0.42), upFace);`
      )
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        // Rolled-plate "orange peel": tiny noise perturbation of the normal
        // on painted surfaces only — dead-flat shading is what reads as CG.
        vec3 bump = vec3(
          heroNoise(pM * 34.0),
          heroNoise(pM * 34.0 + vec3(11.3, 7.7, 3.1)),
          heroNoise(pM * 34.0 + vec3(4.7, 19.1, 8.9))) - 0.5;
        normal = normalize(normal + bump * 0.16 * isPaint);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = clamp(
          vMat.x + (grain - 0.5) * 0.18 + dust * 0.28 - wearN * 0.2, 0.05, 1.0);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `float metalnessFactor = clamp(
          vMat.y * (1.0 - dust * 0.7) + wearN * 0.3, 0.0, 1.0);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.22, 0.24, 0.14) * pow(max(vNrmObj.y, 0.0), 1.6) * 0.55;`,
      );
  };
  return mat;
}

// sRGB field-green for MECH/ARTY vertex paint. Grade's veil-break sees the
// framebuffer (sRGB), not linear storage — same contract as infantry
// `#0a5816`. Dark hull / light top / dark steel must all keep green sat
// above the grey gate, or rain lifts them back to khaki.
export const STAMP_PAINT: Record<'UA' | 'RU', { base: string; dark: string; light: string; steel: string }> = {
  // Hull must sit well under the turret at boot — mid-green BODY and
  // mid-green TOP averaged into one brick. Dark hull, light turret, dark gun.
  UA: { base: '#043010', dark: '#032808', light: '#1c9028', steel: '#032808' },
  RU: { base: '#04280c', dark: '#032006', light: '#1c8824', steel: '#032006' },
};

export function stampMats(faction: 'UA' | 'RU'): HeroMatSet {
  const f = STAMP_PAINT[faction];
  return {
    BODY: { c: f.base, r: 0.72, m: 0.12 },
    TOP: { c: f.light, r: 0.74, m: 0.1 },
    SHADE: { c: f.dark, r: 0.8, m: 0.1 },
    TRACKM: { c: f.steel, r: 0.58, m: 0.72, w: 0.7 },
    RUBBER: { c: f.dark, r: 0.92, m: 0.02 },
    STEEL: { c: f.steel, r: 0.45, m: 0.85, w: 0.5 },
    DARKSTEEL: { c: f.steel, r: 0.55, m: 0.7 },
    MUZZLE: { c: f.dark, r: 0.5, m: 0.75, w: 0.6 },
    CANVAS: { c: f.base, r: 0.95, m: 0.0 },
    CANVAS2: { c: f.dark, r: 0.95, m: 0.0 },
    OPTIC: { c: f.steel, r: 0.22, m: 0.35 },
  };
}

let sharedStampMaterial: THREE.MeshBasicMaterial | null = null;

export function getStampHeroMaterial(): THREE.MeshBasicMaterial {
  if (!sharedStampMaterial) sharedStampMaterial = makeStampHeroMaterial();
  return sharedStampMaterial;
}

// Unlit punch — the INF escape, not a second weathered wash. Authored
// vertex colours carry dark hull / light top / dark gun. A fragment remap
// from screen-space "up" flattened every roof into one lime slab at boot.
export function makeStampHeroMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
  });
}
