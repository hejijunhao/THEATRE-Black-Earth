// The DESIGNED layer of the scenario. The pipeline derives terrain from real
// data; everything in this file is authored: the front line, control pockets,
// the city roster's strategic adjustments, the order of battle and faction
// economies. This is the v1 editorial stance carried forward — a designed
// approximation of a static Spring-2025 front, not a battlefield reproduction.

// ------------------------------------------------------------- front line
// Polyline (lon, lat) from the RU border NE of Kharkiv to the Dnipro mouth.
// Land hexes west/north of the line are UA, east/south are RU. Mirrors the
// v1 dispositions: UA holds Kharkiv, Kupiansk, Izium, Kramatorsk, Kherson;
// RU holds Svatove, Sievierodonetsk, Bakhmut, Donetsk, the Azov corridor,
// the east bank and Crimea.
export const FRONT_LINE = [
  [37.05, 50.45], // RU border NE of Kharkiv
  [37.35, 50.05], // east of Pechenihy
  [37.75, 49.62], // east of Kupiansk (UA)
  [38.02, 49.25], // west of Svatove (RU)
  [38.05, 48.95], // east of Lyman (UA)
  [37.9, 48.62],  // west of Bakhmut (RU)
  [37.8, 48.42],  // Toretsk
  [37.55, 48.15], // west of Donetsk agglomeration
  [37.3, 47.85],  // Marinka / Kurakhove
  [37.2, 47.75],  // Vuhledar
  [36.7, 47.65],  // Velyka Novosilka
  [36.2, 47.55],  // Hulyaipole
  [35.85, 47.5],  // Orikhiv
  [35.35, 47.44], // Kamianske / Vasylivka
  [34.6, 47.28],  // Kakhovka reservoir line
  [33.9, 47.0],
  [33.3, 46.75],
  [32.75, 46.58], // east of Kherson (UA holds the city)
  [32.3, 46.42],  // lower Dnipro
  [31.9, 46.28],  // estuary, into the sea
];

// Designed RU pockets in addition to the front-line side test.
export const RU_POCKETS = [
  // Belgorod axis pocket NE of Kharkiv (v1's 'Belgorod Axis' entry sector).
  { lon: 37.45, lat: 50.25, radiusKm: 32 },
];

// Inland-water exemption polygons: sea flood-fill may not claim hexes here
// even at high water fraction (Dnipro reservoirs stay river-edge terrain,
// not impassable sea — the rules model the river as crossable edges).
export const INLAND_WATER_BOXES = [
  { lonMin: 32.35, lonMax: 35.7, latMin: 46.2, latMax: 48.7 },  // lower Dnipro + Kakhovka
  { lonMin: 32.0, lonMax: 34.2, latMin: 48.5, latMax: 50.6 },   // Kaniv/Kremenchuk reservoirs
];

// Forced-land overrides (terrain, applied after sea fill): the Crimean land
// corridors are narrower than a hex and must survive quantisation.
export const FORCED_LAND = [
  { lon: 33.7, lat: 46.15, terrain: 'marsh', label: 'Perekop isthmus' },
  { lon: 34.55, lat: 45.97, terrain: 'marsh', label: 'Chonhar crossing' },
];

// ------------------------------------------------------------------ cities
// Name normalisation: Natural Earth spelling -> project spelling.
export const NAME_FIXES = {
  Odessa: 'Odesa',
  Zaporizhzhya: 'Zaporizhzhia',
  Mykolayiv: 'Mykolaiv',
  'Kryvyy Rih': 'Kryvyi Rih',
  Vinnytsya: 'Vinnytsia',
  Kirovohrad: 'Kropyvnytskyi',
  Khmelnytskyy: 'Khmelnytskyi',
  'Kamyanets-Podilskyy': 'Kamianets-Podilskyi',
  Chernihiv: 'Chernihiv',
};

// Strategic towns below the population threshold that the scenario needs.
// vp/hub designed; coordinates are the towns' actual locations.
export const STRATEGIC_TOWNS = [
  { id: 'izium', name: 'Izium', lon: 37.28, lat: 49.21, vp: 3, hub: false },
  { id: 'kupiansk', name: 'Kupiansk', lon: 37.62, lat: 49.71, vp: 3, hub: false },
  { id: 'bakhmut', name: 'Bakhmut', lon: 38.0, lat: 48.59, vp: 3, hub: false },
  { id: 'pavlohrad', name: 'Pavlohrad', lon: 35.87, lat: 48.53, vp: 2, hub: true },
  { id: 'novakakhovka', name: 'Nova Kakhovka', lon: 33.37, lat: 46.75, vp: 3, hub: true },
  { id: 'dzhankoi', name: 'Dzhankoi', lon: 34.4, lat: 45.71, vp: 3, hub: true },
  { id: 'kerch', name: 'Kerch', lon: 36.47, lat: 45.36, vp: 3, hub: true, source: true },
  { id: 'sloviansk', name: 'Sloviansk', lon: 37.6, lat: 48.85, vp: 3, hub: true },
];

// Axis pseudo-cities: abstract entry points for RU supply (v1 pattern).
export const AXIS_CITIES = [
  { id: 'belgorodaxis', name: 'Belgorod Axis', lon: 37.45, lat: 50.25, vp: 0, hub: true, source: true },
  { id: 'rostovaxis', name: 'Rostov Axis', lon: 38.6, lat: 47.25, vp: 0, hub: true, source: true },
];

// Per-city designed overrides on top of the population bands.
export const CITY_OVERRIDES = {
  // landmark: abstracted silhouette tags (cosmetic; v2-vision §4.3).
  kyiv: { size: 'capital', vp: 25, hub: true, source: true, landmark: 'capital' },
  lviv: { vp: 10, hub: true, source: true },
  odesa: { vp: 15, hub: true, source: true, landmark: 'port' },
  kharkiv: { vp: 15, hub: true, decisiveFor: 'RU', landmark: 'derzhprom' },
  zaporizhzhia: { vp: 10, hub: true, decisiveFor: 'RU', landmark: 'dam' },
  melitopol: { vp: 8, hub: true, decisiveFor: 'UA' },
  mariupol: { vp: 10, hub: true, decisiveFor: 'UA', landmark: 'port' },
  luhansk: { vp: 10, hub: true, source: true },
  donetsk: { vp: 15, hub: true },
  // Front-adjacent Donbas cities compressed so their capture swings don't
  // dominate the war-support ledger (band would give horlivka 10).
  horlivka: { vp: 6, hub: true },
  lysychansk: { vp: 4, hub: true },
  makiyivka: { vp: 4, hub: false },
  simferopol: { vp: 8, hub: true, source: true },
  sevastopol: { vp: 8, hub: false },
  kherson: { vp: 6, hub: false },
  kryvyirih: { vp: 5, hub: true },
  dnipro: { vp: 15, hub: true },
};

// Population bands -> size/vp defaults (overridable above). Compressed so
// the deep-rear oblast capitals don't inflate the at-risk VP pool (v1 kept
// starting VP totals near UA ~140 / RU ~80).
export function cityBand(popMax) {
  if (popMax >= 700000) return { size: 'major', vp: 15 };
  if (popMax >= 400000) return { size: 'major', vp: 10 };
  if (popMax >= 250000) return { size: 'major', vp: 6 };
  return { size: 'town', vp: 4 };
}

// ------------------------------------------------------------------- OOB
// Roughly double the v1 density for the doubled front length. Anchors are
// lon/lat; the pipeline snaps to the nearest owned land hex and resolves
// collisions by spiral search. `adjacentTo` places a unit on a friendly hex
// adjacent to another unit (used to keep the test-coupled u3/r1 pair).
// Representative designations, archetypal formations — not a live order of
// battle.

export const OOB = [
  // ---------------------------------------------------------- Ukraine
  // Kharkiv / Kupiansk axis
  { id: 'u1', faction: 'UA', type: 'armored', name: '1st Tank Brigade', lon: 36.6, lat: 49.75 },
  { id: 'u2', faction: 'UA', type: 'mechanized', name: '92nd Mechanised Brigade', lon: 37.15, lat: 50.0 },
  { id: 'r1', faction: 'RU', type: 'mechanized', name: '20th Motor-Rifle Division', lon: 37.9, lat: 49.75 },
  { id: 'u3', faction: 'UA', type: 'infantry', name: '57th Motorised Brigade', adjacentTo: 'r1', entrenchment: 2 },
  { id: 'u4', faction: 'UA', type: 'infantry', name: '60th Infantry Brigade', lon: 37.55, lat: 49.55, entrenchment: 2 },
  { id: 'u5', faction: 'UA', type: 'infantry', name: '14th Mechanised Brigade', lon: 37.3, lat: 50.15, entrenchment: 2 },
  { id: 'u6', faction: 'UA', type: 'recon', name: '3rd Reconnaissance Battalion', lon: 36.9, lat: 49.9 },
  // Oskil / Lyman
  { id: 'u7', faction: 'UA', type: 'infantry', name: '63rd Infantry Brigade', lon: 37.75, lat: 49.05, entrenchment: 2 },
  { id: 'u8', faction: 'UA', type: 'infantry', name: '66th Mechanised Brigade', lon: 37.55, lat: 49.25, entrenchment: 1 },
  { id: 'u9', faction: 'UA', type: 'artillery', name: '26th Artillery Brigade', lon: 37.35, lat: 48.95 },
  // Sloviansk / Kramatorsk / Bakhmut arc
  { id: 'u10', faction: 'UA', type: 'infantry', name: '24th Infantry Brigade', lon: 37.7, lat: 48.6, entrenchment: 3 },
  { id: 'u11', faction: 'UA', type: 'infantry', name: '53rd Infantry Brigade', lon: 37.65, lat: 48.35, entrenchment: 2 },
  { id: 'u12', faction: 'UA', type: 'mechanized', name: '93rd Mechanised Brigade', lon: 37.5, lat: 48.72 },
  { id: 'u13', faction: 'UA', type: 'artillery', name: '55th Artillery Brigade', lon: 37.4, lat: 48.5 },
  { id: 'u14', faction: 'UA', type: 'infantry', name: '5th Assault Brigade', lon: 37.75, lat: 48.48, entrenchment: 2 },
  // Donetsk face / Vuhledar
  { id: 'u15', faction: 'UA', type: 'infantry', name: '72nd Infantry Brigade', lon: 37.1, lat: 47.8, entrenchment: 3 },
  { id: 'u16', faction: 'UA', type: 'infantry', name: '79th Air Assault Brigade', lon: 37.35, lat: 48.0, entrenchment: 2 },
  { id: 'u17', faction: 'UA', type: 'recon', name: '131st Reconnaissance Battalion', lon: 37.2, lat: 48.25 },
  // Zaporizhzhia front
  { id: 'u18', faction: 'UA', type: 'infantry', name: '65th Infantry Brigade', lon: 35.85, lat: 47.65, entrenchment: 3 },
  { id: 'u19', faction: 'UA', type: 'mechanized', name: '47th Mechanised Brigade', lon: 35.5, lat: 47.6 },
  { id: 'u20', faction: 'UA', type: 'infantry', name: '110th Territorial Brigade', lon: 36.35, lat: 47.7, entrenchment: 2 },
  { id: 'u21', faction: 'UA', type: 'infantry', name: '118th Mechanised Brigade', lon: 36.7, lat: 47.78, entrenchment: 2 },
  { id: 'u22', faction: 'UA', type: 'artillery', name: '44th Artillery Brigade', lon: 35.9, lat: 47.75 },
  { id: 'u23', faction: 'UA', type: 'infantry', name: '128th Mountain Assault Brigade', lon: 35.15, lat: 47.6, entrenchment: 2 },
  // Dnipro line / Kherson
  { id: 'u24', faction: 'UA', type: 'infantry', name: '35th Marine Brigade', lon: 32.6, lat: 46.68, entrenchment: 2 },
  { id: 'u25', faction: 'UA', type: 'mechanized', name: '28th Mechanised Brigade', lon: 32.9, lat: 46.85 },
  { id: 'u26', faction: 'UA', type: 'infantry', name: '59th Motorised Brigade', lon: 33.5, lat: 47.05, entrenchment: 2 },
  { id: 'u27', faction: 'UA', type: 'infantry', name: '124th Territorial Brigade', lon: 34.3, lat: 47.35, entrenchment: 2 },
  { id: 'u28', faction: 'UA', type: 'artillery', name: '45th Artillery Brigade', lon: 33.0, lat: 47.0 },
  // Operational depth
  { id: 'u29', faction: 'UA', type: 'mechanized', name: '4th Tank Brigade', lon: 35.0, lat: 48.45 },
  { id: 'u30', faction: 'UA', type: 'armored', name: '17th Tank Brigade', lon: 36.3, lat: 48.6 },
  { id: 'u31', faction: 'UA', type: 'mechanized', name: '33rd Mechanised Brigade', lon: 35.2, lat: 48.0 },
  { id: 'u32', faction: 'UA', type: 'infantry', name: '101st Territorial Brigade', lon: 36.25, lat: 50.0, entrenchment: 1 },
  { id: 'u33', faction: 'UA', type: 'recon', name: '15th Reconnaissance Battalion', lon: 35.6, lat: 47.85 },
  { id: 'u34', faction: 'UA', type: 'infantry', name: '116th Mechanised Brigade', lon: 34.6, lat: 47.6, entrenchment: 1 },

  // ----------------------------------------------------------- Russia
  // Kupiansk / Svatove axis (r1 above anchors this front)
  { id: 'r2', faction: 'RU', type: 'armored', name: '4th Tank Division', lon: 38.3, lat: 49.55 },
  { id: 'r3', faction: 'RU', type: 'infantry', name: '2nd Corps Rifle Division', lon: 38.15, lat: 49.35, entrenchment: 2 },
  { id: 'r4', faction: 'RU', type: 'mechanized', name: '144th Motor-Rifle Division', lon: 38.25, lat: 49.05 },
  { id: 'r5', faction: 'RU', type: 'infantry', name: '25th Motor-Rifle Brigade', lon: 38.2, lat: 48.85, entrenchment: 2 },
  { id: 'r6', faction: 'RU', type: 'recon', name: '45th Reconnaissance Brigade', lon: 38.45, lat: 49.3 },
  // Bakhmut / Donetsk arc
  { id: 'r7', faction: 'RU', type: 'infantry', name: '132nd Rifle Brigade', lon: 38.1, lat: 48.55, entrenchment: 2 },
  { id: 'r8', faction: 'RU', type: 'infantry', name: '98th Rifle Division', lon: 37.95, lat: 48.35, entrenchment: 2 },
  { id: 'r9', faction: 'RU', type: 'artillery', name: '8th Artillery Brigade', lon: 38.25, lat: 48.45 },
  { id: 'r10', faction: 'RU', type: 'infantry', name: '5th Motor-Rifle Brigade', lon: 37.75, lat: 48.05, entrenchment: 2 },
  { id: 'r11', faction: 'RU', type: 'infantry', name: '1st Slavic Brigade', lon: 37.7, lat: 47.9, entrenchment: 2 },
  { id: 'r12', faction: 'RU', type: 'artillery', name: '238th Artillery Brigade', lon: 38.0, lat: 48.1 },
  // Vuhledar / Velyka Novosilka
  { id: 'r13', faction: 'RU', type: 'infantry', name: '155th Naval Infantry Brigade', lon: 37.3, lat: 47.6, entrenchment: 2 },
  { id: 'r14', faction: 'RU', type: 'mechanized', name: '36th Motor-Rifle Brigade', lon: 36.9, lat: 47.5 },
  // Zaporizhzhia front
  { id: 'r15', faction: 'RU', type: 'infantry', name: '58th Rifle Division', lon: 35.9, lat: 47.35, entrenchment: 3 },
  { id: 'r16', faction: 'RU', type: 'armored', name: '90th Tank Division', lon: 36.4, lat: 47.35 },
  { id: 'r17', faction: 'RU', type: 'artillery', name: '439th Rocket Artillery Brigade', lon: 35.7, lat: 47.25 },
  { id: 'r18', faction: 'RU', type: 'infantry', name: '42nd Motor-Rifle Division', lon: 35.35, lat: 47.3, entrenchment: 3 },
  { id: 'r19', faction: 'RU', type: 'infantry', name: '71st Rifle Regiment', lon: 36.15, lat: 47.4, entrenchment: 2 },
  { id: 'r20', faction: 'RU', type: 'mechanized', name: '76th Air Assault Division', lon: 35.6, lat: 47.2 },
  // Dnipro east bank / Kherson
  { id: 'r21', faction: 'RU', type: 'infantry', name: '810th Naval Infantry Brigade', lon: 33.1, lat: 46.65, entrenchment: 2 },
  { id: 'r22', faction: 'RU', type: 'mechanized', name: '127th Motor-Rifle Division', lon: 33.6, lat: 46.8 },
  { id: 'r23', faction: 'RU', type: 'infantry', name: '7th Air Assault Division', lon: 34.1, lat: 46.9, entrenchment: 2 },
  { id: 'r24', faction: 'RU', type: 'artillery', name: '291st Artillery Brigade', lon: 33.9, lat: 46.7 },
  // Azov corridor depth + Crimea
  { id: 'r25', faction: 'RU', type: 'mechanized', name: '19th Motor-Rifle Division', lon: 36.8, lat: 47.15 },
  { id: 'r26', faction: 'RU', type: 'infantry', name: '70th Motor-Rifle Regiment', lon: 35.35, lat: 46.85, entrenchment: 1 },
  { id: 'r27', faction: 'RU', type: 'infantry', name: '22nd Army Corps Garrison', lon: 34.1, lat: 45.4 },
  // Belgorod pocket + eastern depth
  { id: 'r28', faction: 'RU', type: 'infantry', name: '128th Rifle Brigade', lon: 37.5, lat: 50.2, entrenchment: 1 },
  { id: 'r29', faction: 'RU', type: 'mechanized', name: '3rd Army Corps Group', lon: 38.9, lat: 48.2 },
  { id: 'r30', faction: 'RU', type: 'infantry', name: '336th Naval Infantry Brigade', lon: 37.6, lat: 47.1, entrenchment: 1 },
  { id: 'r31', faction: 'RU', type: 'recon', name: '100th Reconnaissance Brigade', lon: 38.55, lat: 48.0 },
  // Rear-area security: the supply sources must not be open to a single
  // breakthrough (balance finding — UA snapped up Luhansk + Rostov Axis by
  // t12 in early AI-vs-AI runs and the whole RU army starved).
  { id: 'r32', faction: 'RU', type: 'infantry', name: '2nd Luhansk Rifle Division', lon: 39.25, lat: 48.5, entrenchment: 2 },
  { id: 'r33', faction: 'RU', type: 'infantry', name: '9th Motor-Rifle Brigade', lon: 38.55, lat: 47.25, entrenchment: 1 },
  { id: 'r34', faction: 'RU', type: 'mechanized', name: '68th Army Corps Group', lon: 37.0, lat: 47.3 },
];

// -------------------------------------------------------- faction economy
// Scaled from v1 for ~double the formation count; re-tuned against
// BALANCE=1 AI-vs-AI campaigns.
export const FACTION_SETUP = {
  UA: {
    manpower: 200,
    equipment: 180,
    command: 6,
    commandMax: 12,
    commandRegen: 5,
    manpowerIncome: 18,
    equipmentIncome: 20,
    warSupport: 70,
    reserves: [
      { type: 'mechanized', name: '82nd Air Assault Brigade', strength: 90 },
      { type: 'infantry', name: '3rd Assault Brigade', strength: 90 },
    ],
  },
  RU: {
    manpower: 290,
    equipment: 240,
    command: 6,
    commandMax: 12,
    commandRegen: 4,
    manpowerIncome: 27,
    equipmentIncome: 23,
    warSupport: 65,
    reserves: [
      { type: 'infantry', name: '104th Rifle Division', strength: 90 },
      { type: 'armored', name: '47th Tank Division', strength: 85 },
    ],
  },
};

export const SCENARIO_META = {
  id: 'black-earth-2025',
  name: 'Black Earth',
  description:
    'A designed operational scenario set on a static front, spring 2025. Terrain, hydrography and infrastructure derive from open geospatial data; the front line, formations and starting conditions are deliberately simplified and do not reproduce live battlefield conditions.',
  dateLabel: 'Spring 2025 · designed scenario',
  startDate: { year: 2025, month: 3, day: 1 },
  maxTurns: 36,
  decisive: {
    UA: ['melitopol', 'mariupol'],
    RU: ['kharkiv', 'zaporizhzhia'],
  },
};
