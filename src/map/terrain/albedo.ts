// The painted ground: a single large canvas texture generated at load.
// This is the "sober realism" layer — chernozem strip-field patchwork,
// soft land-cover fields from the geodata fractions, road/rail decals.
// Static for a whole campaign; dynamic state lives in the tint texture.

import * as THREE from 'three';
import { CORRIDORS } from '../../game/scenarios/blackEarth2025';
import { tileWorld } from '../../game/hex';
import { fracAtWorld, heightM } from './heightfield';
import { WORLD_H, WORLD_W } from '../data/terrainData';
import { RGB, fieldColor, mix, noise2, rgb } from './strips';

// Extended bounds: the painted area covers the mesh margin beyond the grid.
export const ALBEDO_MARGIN = 10; // world units beyond the map rectangle

const TEX_W = 2048;

export type { RGB };

const GRASS = rgb('#3e3c24');
// Forests stay lighter than water, and light enough that rain + AO cannot
// drop a woodland hex into a grey hole. Not retuned — north charcoal
// was the previous failure, and this slice is soil authenticity.
const FOREST_FLOOR = rgb('#7a864c');
const FOREST_DEEP = rgb('#667444');
const MARSH = rgb('#6c7250');
const URBAN = rgb('#9a9488');
const URBAN_DARK = rgb('#7a756c');
const SEA_FLOOR = rgb('#2a3a4a');
const BEACH = rgb('#b09864');
/** Warm umber loft the far north must match under rain — soil, not mustard. */
export const KHAKI_FIELD = rgb('#c49050');
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
  // Midground crush toward chernozem/loam — rain lighting still lifts, so
  // the paint has to start dark or campaign zoom stays an ochre plate.
  // Far north keeps loft; the scar is not washed toward khaki.
  const crush = 0.52 + 0.40 * smooth(0.62, 0.97, lat);
  let out: RGB = { r: c.r * crush, g: c.g * crush * 0.86, b: c.b * crush * 0.76 };
  const lift = northSoilLift(wz, heightMetres);
  out = mix(out, KHAKI_FIELD, lift);
  const luma = 0.2126 * out.r + 0.7152 * out.g + 0.0722 * out.b;
  // Floor is far-north only. A constant 48-luma midground floor was the
  // ochre plate — it lifted crushed chernozem toward khaki loft.
  const northKeep = smooth(0.70, 0.97, lat);
  const floor = 118 * northKeep;
  if (northKeep > 0.001 && luma < floor) {
    // Lift toward warm soil, not a grey scale-up of cool forest.
    const k = (floor - luma) / Math.max(1, floor);
    out = mix(out, KHAKI_FIELD, Math.min(0.55, k * 0.85));
    const luma2 = 0.2126 * out.r + 0.7152 * out.g + 0.0722 * out.b;
    if (luma2 < floor) {
      const s = floor / Math.max(1, luma2);
      out = { r: out.r * s, g: out.g * s, b: out.b * s };
    }
  }
  return out;
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
      const m = heightM(wx, wz);

      let c: RGB;
      if (m < 2) {
        c = SEA_FLOOR;
      } else if (m < 6) {
        c = mix(BEACH, GRASS, (m - 2) / 4);
      } else {
        // Base: cultivated steppe with grass blending at low crop fraction.
        const crop = fracAtWorld(wx, wz, 2);
        const fields = fieldColor(wx, wz);
        // Crop carries the strip; grass only fills the leftover steppe.
        c = mix(GRASS, fields, Math.min(1, 0.55 + crop * 0.7));
        // Surveyed soil under the crop. Valleys hold chernozem; higher
        // ground goes loess. Strong enough to kill the mustard plate;
        // strip parcels still lead via fieldColor.
        const soil = mix(CHERNOZEM, LOESS, smooth(70, 210, m));
        c = mix(c, soil, 0.26 + (1 - Math.min(1, crop * 1.15)) * 0.20);
        // Forest fields (soft shapes from the hex fractions + noise breakup).
        // Threshold sits above the forest-steppe shelter-belt range: partial
        // tree cover must NOT read as a dark smear over half the map — the
        // tree instances carry that signal instead.
        const tree = fracAtWorld(wx, wz, 0);
        const fnoise = noise2(wx * 0.9, wz * 0.9, 31);
        const fmask = smooth(0.48, 0.82, tree + (fnoise - 0.5) * 0.22) * 0.48;
        if (fmask > 0) {
          const depth = mix(FOREST_FLOOR, FOREST_DEEP, noise2(wx * 2.2, wz * 2.2, 47));
          c = mix(c, depth, fmask);
        }
        // Wetland.
        const wet = fracAtWorld(wx, wz, 4);
        const wmask = smooth(0.18, 0.5, wet + (noise2(wx, wz, 53) - 0.5) * 0.2);
        if (wmask > 0) c = mix(c, MARSH, wmask * 0.55);
        // Urban concrete with speckle.
        const urb = fracAtWorld(wx, wz, 1);
        const umask = smooth(0.12, 0.42, urb + (noise2(wx * 1.6, wz * 1.6, 61) - 0.5) * 0.12);
        if (umask > 0) {
          const speck = noise2(wx * 6, wz * 6, 67);
          c = mix(c, speck > 0.55 ? URBAN_DARK : URBAN, umask);
        }
        // Macro variation so the plain never reads flat — kept tight so
        // dark lobes cannot become a north hole.
        const macro = (noise2(wx * 0.22, wz * 0.22, 71) - 0.5) * 0.1;
        c = { r: c.r * (1 + macro), g: c.g * (1 + macro), b: c.b * (1 + macro) };
        // Subtle valley moisture — lift, do not bury.
        if (m < 90) c = mix(c, MARSH, 0.04 * (1 - m / 90));
        c = applySoilContinuity(c, wz, m);
      }

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
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}
