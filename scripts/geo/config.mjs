// Geodata pipeline configuration: theatre extent, grid size, sources,
// classification thresholds. See docs/plans/v2-vision.md §3.
//
// Grid decision (v2-vision §3.4): 48×36 (~26 km hexes E-W, ~23 km N-S).
// The plan's baseline evaluation was 48×32, but the v1 theatre spans
// Lviv→Luhansk (~1,280 km) and Chernihiv→Sevastopol (~870 km); 32 rows only
// cover ~700 km N-S and would cut Crimea. 36 rows keep the whole v1 theatre
// at half the v1 hex size. 1,728 cells total, ~900 land — flood fills and
// Dijkstra remain microseconds.

export const GRID_W = 48;
export const GRID_H = 36;

// Theatre bounding box (WGS84). Chosen so hex centres cover:
// west  Lviv 24.03E   east  Luhansk 39.34E (+ border margin)
// north Chernihiv 51.49N   south Sevastopol 44.62N
export const LON_MIN = 23.4;
export const LON_MAX = 40.6;
export const LAT_MIN = 44.2;
export const LAT_MAX = 52.0;

import { fileURLToPath } from 'node:url';
export const CACHE_DIR = fileURLToPath(new URL('./cache/', import.meta.url));

// ---------------------------------------------------------------- sources
export const SOURCES = {
  dem: {
    name: 'Terrain Tiles on AWS (Mapzen terrarium; SRTM/GMTED/ETOPO composite)',
    url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    license: 'Public domain data sources; tiles CC-BY (Mapzen/Linux Foundation)',
    zoom: 7,
  },
  landcover: {
    name: 'ESA WorldCover 10 m 2021 v200',
    url: 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif',
    license: 'CC-BY 4.0 © ESA WorldCover project 2021',
    // COG overview level to read (562×562 per 3° tile ≈ 590 m/px — ample for 26 km hexes)
    overviewWidth: 562,
  },
  naturalEarth: {
    name: 'Natural Earth 10m (rivers, roads, railroads, populated places, admin-0)',
    url: 'https://github.com/nvkelso/natural-earth-vector (geojson/)',
    license: 'Public domain',
  },
};

// WorldCover class codes.
export const WC = {
  TREE: 10, SHRUB: 20, GRASS: 30, CROP: 40, BUILT: 50,
  BARE: 60, SNOW: 70, WATER: 80, WETLAND: 90, MOSS: 100, MANGROVE: 95,
};

// ------------------------------------------------- classification thresholds
export const THRESHOLDS = {
  seaWaterFrac: 0.5,    // hex is a sea candidate above this water fraction
  marshWetlandFrac: 0.22,
  marshRiverineWaterFrac: 0.35, // inland (non-sea) water => floodplain marsh
  urbanBuiltFrac: 0.13,
  forestTreeFrac: 0.32,
  seaBandRadius: 2,     // sea hexes kept on-map within N hexes of land
};

// Rivers to extract from Natural Earth (name / name_en match).
// Minimum on-map edge-path length filters out fragments.
export const RIVER_NAMES = ['Dnipro', 'Donets', 'Southern Bug', 'Desna', 'Pripyat', 'Seym'];
export const RIVER_MIN_EDGES = 6;

// Corridor filters (Natural Earth attributes).
export const ROAD_MAX_SCALERANK = 4;   // highways always; other roads only at top scaleranks
export const RAIL_MAX_SCALERANK = 6;   // main rail network only (density is a balance lever)

export const CITY_POP_MIN = 88000;     // auto-include threshold for populated places

// Elevation normalisation: metres -> 0..1 visual (sqrt emphasises low relief).
export const ELEV_MAX_M = 1200;

export const RETRIEVED = '2026-08-03';
