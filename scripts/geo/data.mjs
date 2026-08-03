// Raw-data access: DEM mosaic (terrarium PNG tiles), ESA WorldCover class
// grids (COG overviews, cached as .bin), Natural Earth vectors, and
// point-in-polygon masks. Everything is cached under scripts/geo/cache/ so
// regeneration is offline after the first run.

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { CACHE_DIR, SOURCES, LON_MIN, LON_MAX, LAT_MIN, LAT_MAX } from './config.mjs';

// ------------------------------------------------------------------ DEM
// Web-mercator terrarium tiles at z7. elevation = R*256 + G + B/256 - 32768.

const demTiles = new Map(); // "x,y" -> {data, width}

function demTilePath(x, y) {
  return path.join(CACHE_DIR, 'dem', `7-${x}-${y}.png`);
}

function loadDemTile(x, y) {
  const key = `${x},${y}`;
  if (demTiles.has(key)) return demTiles.get(key);
  const p = demTilePath(x, y);
  let tile = null;
  if (fs.existsSync(p)) {
    const png = PNG.sync.read(fs.readFileSync(p));
    tile = { data: png.data, width: png.width };
  }
  demTiles.set(key, tile);
  return tile;
}

function mercatorPx(lon, lat, z) {
  const n = 2 ** z;
  const px = ((lon + 180) / 360) * n * 256;
  const rad = (lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256;
  return { px, py };
}

function demRead(pxg, pyg) {
  const tx = Math.floor(pxg / 256);
  const ty = Math.floor(pyg / 256);
  const tile = loadDemTile(tx, ty);
  if (!tile) return 0; // missing tile => open sea
  const lx = Math.min(255, Math.max(0, Math.floor(pxg - tx * 256)));
  const ly = Math.min(255, Math.max(0, Math.floor(pyg - ty * 256)));
  const i = (ly * tile.width + lx) * 4;
  return tile.data[i] * 256 + tile.data[i + 1] + tile.data[i + 2] / 256 - 32768;
}

// Bilinear elevation in metres.
export function elevationAt(lon, lat) {
  const z = SOURCES.dem.zoom;
  const { px, py } = mercatorPx(lon, lat, z);
  const x0 = Math.floor(px - 0.5);
  const y0 = Math.floor(py - 0.5);
  const fx = px - 0.5 - x0;
  const fy = py - 0.5 - y0;
  const v00 = demRead(x0, y0);
  const v10 = demRead(x0 + 1, y0);
  const v01 = demRead(x0, y0 + 1);
  const v11 = demRead(x0 + 1, y0 + 1);
  return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
}

// ------------------------------------------------------------ WorldCover
// 3°×3° COG tiles named by SW corner. We read one overview level per tile
// (~590 m/px) and cache the class grid as a raw .bin.

const wcGrids = new Map(); // "N48E036" -> {data: Uint8Array, w, h} | null

function wcTileName(lonSW, latSW) {
  const ns = latSW >= 0 ? 'N' : 'S';
  const ew = lonSW >= 0 ? 'E' : 'W';
  return `${ns}${String(Math.abs(latSW)).padStart(2, '0')}${ew}${String(Math.abs(lonSW)).padStart(3, '0')}`;
}

async function fetchWcGrid(name) {
  const binPath = path.join(CACHE_DIR, 'wc', `${name}.bin`);
  const metaPath = path.join(CACHE_DIR, 'wc', `${name}.json`);
  if (fs.existsSync(binPath) && fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.missing) return null;
    return { data: new Uint8Array(fs.readFileSync(binPath)), w: meta.w, h: meta.h };
  }
  fs.mkdirSync(path.join(CACHE_DIR, 'wc'), { recursive: true });
  const url = SOURCES.landcover.url.replace('{tile}', name);
  const GeoTIFF = await import('geotiff');
  let tiff;
  try {
    tiff = await GeoTIFF.fromUrl(url);
  } catch {
    fs.writeFileSync(metaPath, JSON.stringify({ missing: true }));
    return null; // pure-sea tiles are absent from the bucket
  }
  const count = await tiff.getImageCount();
  let img = null;
  for (let i = 0; i < count; i++) {
    const cand = await tiff.getImage(i);
    if (cand.getWidth() <= SOURCES.landcover.overviewWidth + 8) { img = cand; break; }
  }
  if (!img) img = await tiff.getImage(count - 1);
  const w = img.getWidth();
  const h = img.getHeight();
  const rasters = await img.readRasters();
  const data = Uint8Array.from(rasters[0]);
  fs.writeFileSync(binPath, Buffer.from(data));
  fs.writeFileSync(metaPath, JSON.stringify({ w, h }));
  return { data, w, h };
}

export async function prefetchWorldCover() {
  const jobs = [];
  for (let latSW = Math.floor(LAT_MIN / 3) * 3; latSW < LAT_MAX; latSW += 3) {
    for (let lonSW = Math.floor(LON_MIN / 3) * 3; lonSW < LON_MAX; lonSW += 3) {
      const name = wcTileName(lonSW, latSW);
      jobs.push(
        fetchWcGrid(name).then((g) => {
          wcGrids.set(name, g);
        }),
      );
    }
  }
  await Promise.all(jobs);
}

// WorldCover class at a point; 80 (water) where the tile is absent (open sea).
export function wcClassAt(lon, lat) {
  const lonSW = Math.floor(lon / 3) * 3;
  const latSW = Math.floor(lat / 3) * 3;
  const name = wcTileName(lonSW, latSW);
  const grid = wcGrids.get(name);
  if (!grid) return 80;
  const fx = (lon - lonSW) / 3;
  const fy = (latSW + 3 - lat) / 3; // row 0 = north edge
  const px = Math.min(grid.w - 1, Math.max(0, Math.floor(fx * grid.w)));
  const py = Math.min(grid.h - 1, Math.max(0, Math.floor(fy * grid.h)));
  const v = grid.data[py * grid.w + px];
  return v === 0 ? 80 : v; // nodata => sea
}

// --------------------------------------------------------- Natural Earth

function loadGeojson(file) {
  return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
}

let neCache = null;
export function loadNaturalEarth() {
  if (neCache) return neCache;
  neCache = {
    rivers: loadGeojson('ne_10m_rivers_lake_centerlines.geojson'),
    roads: loadGeojson('ne_10m_roads.geojson'),
    railroads: loadGeojson('ne_10m_railroads.geojson'),
    places: loadGeojson('ne_10m_populated_places_simple.geojson'),
    admin: loadGeojson('ne_10m_admin_0_countries.geojson'),
  };
  return neCache;
}

// ------------------------------------------------------------------ masks

function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function multiPolygonContains(geom, lon, lat) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    if (!ringContains(poly[0], lon, lat)) continue;
    let inHole = false;
    for (let r = 1; r < poly.length; r++) {
      if (ringContains(poly[r], lon, lat)) { inHole = true; break; }
    }
    if (!inHole) return true;
  }
  return false;
}

let masks = null;
function buildMasks() {
  if (masks) return masks;
  const { admin } = loadNaturalEarth();
  const ua = admin.features.find((f) => f.properties.ADMIN === 'Ukraine');
  const ru = admin.features.find((f) => f.properties.ADMIN === 'Russia');
  if (!ua || !ru) throw new Error('admin-0: Ukraine/Russia polygons not found');
  masks = { ua: ua.geometry, ru: ru.geometry };
  return masks;
}

// Natural Earth draws de-facto borders: Crimea sits in the Russia polygon.
// The theatre is Ukraine's internationally recognised territory, so the
// on-map mask is Ukraine ∪ (Russia ∩ Crimea clip box).
const CRIMEA_CLIP = { lonMax: 37.0, latMax: 46.4 };

export function inTheatreLand(lon, lat) {
  const m = buildMasks();
  if (multiPolygonContains(m.ua, lon, lat)) return true;
  if (lon < CRIMEA_CLIP.lonMax && lat < CRIMEA_CLIP.latMax) {
    return multiPolygonContains(m.ru, lon, lat);
  }
  return false;
}

// Geometry helpers shared by extractors.
export function flattenLines(geometry) {
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

export function bboxOverlaps(coords) {
  return coords.some(([x, y]) => x > LON_MIN && x < LON_MAX && y > LAT_MIN && y < LAT_MAX);
}
