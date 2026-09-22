// The painted ground: a single large canvas texture generated at load.
// This is the "sober realism" layer — chernozem strip-field patchwork,
// soft land-cover fields from the geodata fractions, road/rail decals.
// Static for a whole campaign; dynamic state lives in the tint texture.

import * as THREE from 'three';
import { CORRIDORS } from '../../game/scenarios/blackEarth2025';
import { tileWorld } from '../../game/hex';
import { fracAtWorld, heightM } from './heightfield';
import { WORLD_H, WORLD_W } from '../data/terrainData';
import { RGB, fieldColor, mix, noise2, rgb, stripFrame } from './strips';

// Extended bounds: the painted area covers the mesh margin beyond the grid.
export const ALBEDO_MARGIN = 10; // world units beyond the map rectangle

const TEX_W = 4096;

export type { RGB };

const GRASS = rgb('#3e3c24');
// Forests stay lighter than water, and light enough that rain + AO cannot
// drop a woodland hex into a grey hole. Not retuned — north charcoal
// was the previous failure, and this slice is soil authenticity.
const FOREST_FLOOR = rgb('#55513c');
const FOREST_DEEP = rgb('#454735');
const MARSH = rgb('#6c7250');
const URBAN = rgb('#9a9488');
const URBAN_DARK = rgb('#7a756c');
const SEA_FLOOR = rgb('#2a3a4a');
const BEACH = rgb('#b09864');
/** Warm umber loft the far north must match under rain — soil, not mustard. */
export const KHAKI_FIELD = rgb('#aa8e6b');
export const SOIL_FIELD = KHAKI_FIELD;
export const CHERNOZEM = rgb('#3e2a16');
export const LOESS = rgb('#746448');

/**
 * North / high-ground lift toward midground soil. wz=0 is north (camera
 * looks that way from the scar). Without this the geodata forest rows at
 * the top of the grid read as a charcoal hole once rain, AO and vignette
 * pile on. Pure — the painter and the gate test share it. The target is
 * loess/soil, not a beige wash over the rest frame.
 */
export function northSoilLift(wz: number, heightMetres: number): number {
  const lat = 1 - Math.min(1, Math.max(0, wz / WORLD_H));
  // Midground (the scar) must keep parcel edges. Lift is a weak latitude
  // grade plus a far-north term — continuity, not a khaki slab.
  const north = 0.012 * lat + 0.46 * smooth(0.64, 0.97, lat);
  const height = 0.08 * smooth(140, 300, heightMetres);
  return Math.min(0.52, north + height);
}

export function applySoilContinuity(c: RGB, wz: number, heightMetres: number): RGB {
  const lat = 1 - Math.min(1, Math.max(0, wz / WORLD_H));
  // Keep parcel values rather than crushing then re-normalizing the shader.
  // Latitude adds warm loess locally; it never repaints every dark pixel.
  const exposure = 0.88 + 0.12 * smooth(0.62, 0.97, lat);
  const base = { r: c.r * exposure, g: c.g * exposure, b: c.b * exposure };
  const out = mix(base, SOIL_FIELD, northSoilLift(wz, heightMetres) * 0.55);
  return out;
}

/** One painted texel. Shared by the canvas baker and the soil gate tests. */
export function albedoAt(wx: number, wz: number): RGB {
  const m = heightM(wx, wz);
  if (m < 2) return SEA_FLOOR;
  if (m < 6) return mix(BEACH, GRASS, (m - 2) / 4);
  const crop = fracAtWorld(wx, wz, 2);
  const fields = fieldColor(wx, wz);
  let c = mix(GRASS, fields, Math.min(1, 0.55 + crop * 0.7));
  const soil = mix(CHERNOZEM, LOESS, smooth(70, 210, m));
  c = mix(c, soil, 0.26 + (1 - Math.min(1, crop * 1.15)) * 0.20);
  const tree = fracAtWorld(wx, wz, 0);
  const fnoise = noise2(wx * 0.9, wz * 0.9, 31);
  const fmask = smooth(0.48, 0.82, tree + (fnoise - 0.5) * 0.22) * 0.48;
  if (fmask > 0) {
    const depth = mix(FOREST_FLOOR, FOREST_DEEP, noise2(wx * 2.2, wz * 2.2, 47));
    c = mix(c, depth, fmask);
  }
  const wet = fracAtWorld(wx, wz, 4);
  const wmask = smooth(0.18, 0.5, wet + (noise2(wx, wz, 53) - 0.5) * 0.2);
  if (wmask > 0) c = mix(c, MARSH, wmask * 0.55);
  const urb = fracAtWorld(wx, wz, 1);
  const umask = smooth(0.12, 0.42, urb + (noise2(wx * 1.6, wz * 1.6, 61) - 0.5) * 0.12);
  if (umask > 0) {
    const speck = noise2(wx * 6, wz * 6, 67);
    c = mix(c, speck > 0.55 ? URBAN_DARK : URBAN, umask);
  }
  const macro = (noise2(wx * 0.22, wz * 0.22, 71) - 0.5) * 0.1;
  c = { r: c.r * (1 + macro), g: c.g * (1 + macro), b: c.b * (1 + macro) };
  if (m < 90) c = mix(c, MARSH, 0.04 * (1 - m / 90));
  return applySoilContinuity(c, wz, m);
}

export function paintAlbedo(): { canvas: HTMLCanvasElement; texW: number; texH: number } {
  const spanX = WORLD_W + ALBEDO_MARGIN * 2;
  const spanZ = WORLD_H + ALBEDO_MARGIN * 2;
  const texH = Math.round((TEX_W * spanZ) / spanX);
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = texH;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(TEX_W, texH);
  const d = img.data;

  for (let py = 0; py < texH; py++) {
    for (let px = 0; px < TEX_W; px++) {
      const wx = (px / TEX_W) * spanX - ALBEDO_MARGIN;
      const wz = (py / texH) * spanZ - ALBEDO_MARGIN;
      const c = albedoAt(wx, wz);

      const o = (py * TEX_W + px) * 4;
      d[o] = c.r;
      d[o + 1] = c.g;
      d[o + 2] = c.b;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // ---- road / rail decals along the corridor centrelines
  const toPx = (wx: number, wz: number): [number, number] => [
    ((wx + ALBEDO_MARGIN) / spanX) * TEX_W,
    ((wz + ALBEDO_MARGIN) / spanZ) * texH,
  ];
  const drawPath = (path: Array<[number, number]>, style: string, width: number, alpha: number) => {
    if (path.length < 2) return;
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    const pts = path.map(([x, y]) => {
      const { wx, wz } = tileWorld(x, y);
      return toPx(wx, wz);
    });
    // Smooth through midpoints so corridors read as roads, not hex chains.
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  for (const c of CORRIDORS) {
    if (!c.rail) drawPath(c.path, '#6a5c40', 2.2, 0.62);
  }
  for (const c of CORRIDORS) {
    if (c.rail) drawPath(c.path, '#3a3228', 1.5, 0.86);
  }

  return { canvas, texW: TEX_W, texH };
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function makeAlbedoTexture(): THREE.CanvasTexture {
  const { canvas } = paintAlbedo();
  const tex = new THREE.CanvasTexture(canvas);
  // Custom sampler — GPU sRGB decode is unreliable on SwiftShader and
  // was leaving scar texels as bright linear khaki. The terrain shader
  // decodes once via sRGBTransferEOTF.
  tex.colorSpace = THREE.NoColorSpace;
  // World z grows down the painted canvas. Custom world UVs need no GL flip.
  tex.flipY = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Survey direction + cultivated cover. Data, never colour-managed. */
export function makeSoilSurveyTexture(): THREE.DataTexture {
  const w = 512, h = 384;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = (x + 0.5) / w * (WORLD_W + ALBEDO_MARGIN * 2) - ALBEDO_MARGIN;
    const wz = (y + 0.5) / h * (WORLD_H + ALBEDO_MARGIN * 2) - ALBEDO_MARGIN;
    const f = stripFrame(wx, wz);
    const o = (y * w + x) * 4;
    data[o] = Math.round((Math.cos(f.theta) * 0.5 + 0.5) * 255);
    data[o + 1] = Math.round((Math.sin(f.theta) * 0.5 + 0.5) * 255);
    data[o + 2] = Math.round(Math.max(0, fracAtWorld(wx, wz, 2) - fracAtWorld(wx, wz, 1)) * 255);
    data[o + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, w, h);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
