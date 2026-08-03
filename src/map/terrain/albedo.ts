// The painted ground: a single large canvas texture generated at load.
// This is the "sober realism" layer — chernozem strip-field patchwork,
// soft land-cover fields from the geodata fractions, road/rail decals.
// Static for a whole campaign; dynamic state lives in the tint texture.

import * as THREE from 'three';
import { CORRIDORS } from '../../game/scenarios/blackEarth2025';
import { tileWorld } from '../../game/hex';
import { fracAtWorld, heightM } from './heightfield';
import { WORLD_H, WORLD_W } from '../data/terrainData';

// Extended bounds: the painted area covers the mesh margin beyond the grid.
export const ALBEDO_MARGIN = 10; // world units beyond the map rectangle

const TEX_W = 2048;

interface RGB { r: number; g: number; b: number }

function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

// Fast deterministic integer hash -> [0,1). The painter runs per-pixel over
// millions of samples, so no string hashing here.
function ihash(x: number, y: number, salt: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Deterministic value noise (2 octaves) from world coords.
function vnoise(x: number, y: number, salt: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  const sm = (t: number) => t * t * (3 - 2 * t);
  const v =
    ihash(xi, yi, salt) * (1 - sm(tx)) * (1 - sm(ty)) +
    ihash(xi + 1, yi, salt) * sm(tx) * (1 - sm(ty)) +
    ihash(xi, yi + 1, salt) * (1 - sm(tx)) * sm(ty) +
    ihash(xi + 1, yi + 1, salt) * sm(tx) * sm(ty);
  return v;
}

function noise2(x: number, y: number, salt: number): number {
  return vnoise(x, y, salt) * 0.65 + vnoise(x * 2.7, y * 2.7, salt + 1) * 0.35;
}

// Field palette: the cultivated steppe. Ochre stubble, dull green winter
// cereal, dark fallow, straw. Luminance kept tight — high variance makes
// whole strip-regions read as dark bands from map altitude.
const FIELD_COLORS = ['#96895c', '#878455', '#6e6549', '#a3966a', '#8d845a', '#7f7a50'].map(rgb);
const GRASS = rgb('#8f895f');
// Forests must stay clearly lighter than water — dark green + blue fog reads
// as lake at map scale.
const FOREST_FLOOR = rgb('#617347');
const FOREST_DEEP = rgb('#52633c');
const MARSH = rgb('#6d7a54');
const URBAN = rgb('#7b7974');
const URBAN_DARK = rgb('#66645f');
const SEA_FLOOR = rgb('#31404f');
const BEACH = rgb('#8d8465');

// Strip-field pattern: long bands with a regional orientation, broken into
// parcels along their length.
function fieldColor(wx: number, wz: number): RGB {
  // Regional orientation from coarse noise (stable across the campaign).
  const rx = Math.floor(wx / 14);
  const rz = Math.floor(wz / 14);
  const theta = ihash(rx, rz, 101) * Math.PI;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const u = wx * cos + wz * sin; // across-strip axis
  const v = -wx * sin + wz * cos; // along-strip axis
  const stripW = 0.24 + ihash(rx, rz, 103) * 0.22;
  const strip = Math.floor(u / stripW);
  const parcel = Math.floor(v / (stripW * (6 + ihash(rx * 517 + strip, rz, 107) * 6)));
  const pick = Math.floor(ihash(rx * 517 + strip, rz * 763 + parcel, 109) * FIELD_COLORS.length);
  let c = FIELD_COLORS[pick];
  // Soft edge darkening between strips (field boundaries / shelter belts).
  const edge = Math.abs(u / stripW - Math.round(u / stripW));
  if (edge < 0.06) c = mix(c, FOREST_DEEP, 0.45 * (1 - edge / 0.06));
  return c;
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
        c = mix(GRASS, fields, Math.min(1, 0.35 + crop * 0.9));
        // Forest fields (soft shapes from the hex fractions + noise breakup).
        // Threshold sits above the forest-steppe shelter-belt range: partial
        // tree cover must NOT read as a dark smear over half the map — the
        // tree instances carry that signal instead.
        const tree = fracAtWorld(wx, wz, 0);
        const fnoise = noise2(wx * 0.9, wz * 0.9, 31);
        const fmask = smooth(0.4, 0.72, tree + (fnoise - 0.5) * 0.3) * 0.8;
        if (fmask > 0) {
          const depth = mix(FOREST_FLOOR, FOREST_DEEP, noise2(wx * 2.2, wz * 2.2, 47));
          c = mix(c, depth, fmask);
        }
        // Wetland.
        const wet = fracAtWorld(wx, wz, 4);
        const wmask = smooth(0.18, 0.5, wet + (noise2(wx, wz, 53) - 0.5) * 0.2);
        if (wmask > 0) c = mix(c, MARSH, wmask * 0.85);
        // Urban concrete with speckle.
        const urb = fracAtWorld(wx, wz, 1);
        const umask = smooth(0.12, 0.42, urb + (noise2(wx * 1.6, wz * 1.6, 61) - 0.5) * 0.12);
        if (umask > 0) {
          const speck = noise2(wx * 6, wz * 6, 67);
          c = mix(c, speck > 0.55 ? URBAN_DARK : URBAN, umask);
        }
        // Macro variation so the plain never reads flat.
        const macro = (noise2(wx * 0.22, wz * 0.22, 71) - 0.5) * 0.14;
        c = { r: c.r * (1 + macro), g: c.g * (1 + macro), b: c.b * (1 + macro) };
        // Subtle valley darkening (moisture in low ground).
        if (m < 90) c = mix(c, MARSH, 0.12 * (1 - m / 90));
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
    if (!c.rail) drawPath(c.path, '#5a5344', 2.0, 0.55);
  }
  for (const c of CORRIDORS) {
    if (c.rail) drawPath(c.path, '#3b362e', 1.3, 0.8);
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
  tex.anisotropy = 4;
  return tex;
}
