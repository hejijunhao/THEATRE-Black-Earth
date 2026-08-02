// Scenario: "Black Earth, Spring 2025".
// A deliberately compressed, designed representation of the theatre.
// This is NOT a live-battlefield reproduction: geography is simplified,
// unit designations are representative, and the frontline is a designed
// approximation of a static contemporary front.
//
// Map: 26 x 17 offset grid (odd-r, pointy-top). '.' = off-map, 'w' = sea,
// 'p' = plains, 'f' = forest, 'm' = marsh. Urban terrain is applied
// automatically to capital/major city tiles.

import { CitySize, FactionId, ScenarioMeta, UnitType } from '../types';

export const TERRAIN_ROWS: string[] = [
  '..ffmmfffpfppppff.........', // r0  Polissia
  '.fffmfffppfpppfppfpppf....', // r1
  '.fpffppppppfppppppppppp...', // r2  Kyiv - Kharkiv belt
  'fpfppppfppppfpppfpppfppp..', // r3
  'ffppfpppfppppfppppfpfpppp.', // r4  Donets valley
  'fffppppppppppppfppppffppp.', // r5
  'fffppppppppppfppppppppppp.', // r6
  'ffppppppppppppppppppppppp.', // r7
  'fpppppppppppppppppppppppp.', // r8
  '.pppppppppppppppppfpppppp.', // r9
  '..ppppppppppppppppppppppp.', // r10 southern steppe
  '...ppppppppppppppppppppp..', // r11 Azov coast belt
  '....ppppppppppmppwwwwww...', // r12 Black Sea coast
  '....wwwwwwwwwwmmpwwww.....', // r13 Syvash approaches
  '............wpmpppww......', // r14 northern Crimea
  '............wpppppw.......', // r15 Crimea
  '............wpppww........', // r16 southern Crimea
];

export const CONTROL_ROWS: string[] = [
  '..uuuuuuuuuuuuuuu.........', // r0
  '.uuuuuuuuuuuuuuuuuuuuu....', // r1
  '.uuuuuuuuuuuuuuuuuuuuur...', // r2
  'uuuuuuuuuuuuuuuuuuuuuurr..', // r3
  'uuuuuuuuuuuuuuuuuuuuurrrr.', // r4
  'uuuuuuuuuuuuuuuuuuuuurrrr.', // r5
  'uuuuuuuuuuuuuuuuuuuuurrrr.', // r6
  'uuuuuuuuuuuuuuuuuuuuurrrr.', // r7
  'uuuuuuuuuuuuuuuuuuuuurrrr.', // r8
  '.uuuuuuuuuuuuuuuuuuurrrrr.', // r9
  '..uuuuuuuuuuuuuurrrrrrrrr.', // r10
  '...uuuuuuuuuuuurrrrrrrrr..', // r11
  '....uuuuuuuuuurrr.........', // r12
  '..............rrr.........', // r13
  '.............rrrrr........', // r14
  '.............rrrrr........', // r15
  '.............rrr..........', // r16
];

// Rivers are defined as two parallel bank paths; every adjacent (west, east)
// tile pair between the two banks becomes a river edge.
export interface RiverDef {
  name: string;
  bankA: Array<[number, number]>;
  bankB: Array<[number, number]>;
}

// IMPORTANT: each bank must be a hex-adjacent chain (a "ladder"), otherwise
// the generated cross-bank edge set has vertex holes that units could cross
// dry. The builder validates chain adjacency.
export const RIVERS: RiverDef[] = [
  {
    name: 'Dnipro',
    bankA: [
      [10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [11, 6], [12, 6], [12, 7],
      [13, 8], [14, 8], [14, 9], [15, 9], [15, 10], [14, 11], [13, 11], [13, 12],
    ],
    bankB: [
      [11, 1], [11, 2], [11, 3], [11, 4], [11, 5], [12, 5], [13, 6], [13, 7],
      [14, 7], [15, 8], [16, 8], [16, 9], [16, 10], [15, 11], [15, 12], [14, 12],
    ],
  },
  {
    name: 'Siverskyi Donets',
    bankA: [
      [18, 4], [19, 4], [19, 5], [20, 5], [21, 5], [22, 5],
    ],
    bankB: [
      [18, 3], [19, 3], [20, 4], [21, 4], [22, 4],
    ],
  },
];

// Bridge / crossing edges (adjacent tile pairs across a river).
export const BRIDGES: Array<[[number, number], [number, number]]> = [
  [[10, 2], [11, 2]],   // Kyiv
  [[12, 6], [13, 6]],   // Cherkasy
  [[14, 8], [15, 8]],   // Kremenchuk
  [[15, 9], [16, 9]],   // Dnipro city
  [[15, 10], [15, 11]], // Zaporizhzhia
  [[13, 12], [14, 12]], // Kherson
  [[19, 4], [19, 3]],   // Izium
  [[21, 5], [21, 4]],   // Sievierodonetsk
];

export interface CityDef {
  id: string;
  name: string;
  x: number;
  y: number;
  size: CitySize;
  vp: number;
  hub: boolean;
  source?: boolean;
  decisiveFor?: FactionId;
}

export const CITIES: CityDef[] = [
  // Ukrainian-held at start
  { id: 'kyiv', name: 'Kyiv', x: 10, y: 2, size: 'capital', vp: 25, hub: true, source: true },
  { id: 'kharkiv', name: 'Kharkiv', x: 19, y: 2, size: 'major', vp: 15, hub: true, decisiveFor: 'RU' },
  { id: 'sumy', name: 'Sumy', x: 16, y: 1, size: 'town', vp: 4, hub: true },
  { id: 'chernihiv', name: 'Chernihiv', x: 12, y: 0, size: 'town', vp: 4, hub: false },
  { id: 'lviv', name: 'Lviv', x: 1, y: 3, size: 'major', vp: 10, hub: true, source: true },
  { id: 'vinnytsia', name: 'Vinnytsia', x: 6, y: 6, size: 'town', vp: 4, hub: true },
  { id: 'cherkasy', name: 'Cherkasy', x: 12, y: 6, size: 'town', vp: 4, hub: true },
  { id: 'kremenchuk', name: 'Kremenchuk', x: 14, y: 8, size: 'town', vp: 4, hub: true },
  { id: 'poltava', name: 'Poltava', x: 17, y: 6, size: 'town', vp: 4, hub: true },
  { id: 'dnipro', name: 'Dnipro', x: 15, y: 9, size: 'major', vp: 15, hub: true },
  { id: 'zaporizhzhia', name: 'Zaporizhzhia', x: 15, y: 10, size: 'major', vp: 10, hub: true, decisiveFor: 'RU' },
  { id: 'kryvyirih', name: 'Kryvyi Rih', x: 13, y: 10, size: 'town', vp: 5, hub: true },
  { id: 'mykolaiv', name: 'Mykolaiv', x: 11, y: 12, size: 'town', vp: 5, hub: true },
  { id: 'odesa', name: 'Odesa', x: 8, y: 12, size: 'major', vp: 15, hub: true, source: true },
  { id: 'kherson', name: 'Kherson', x: 13, y: 12, size: 'town', vp: 6, hub: false },
  { id: 'kramatorsk', name: 'Kramatorsk', x: 20, y: 6, size: 'town', vp: 5, hub: true },
  { id: 'izium', name: 'Izium', x: 19, y: 4, size: 'town', vp: 3, hub: false },
  { id: 'kupiansk', name: 'Kupiansk', x: 21, y: 3, size: 'town', vp: 3, hub: false },
  { id: 'pavlohrad', name: 'Pavlohrad', x: 17, y: 8, size: 'town', vp: 2, hub: true },
  // Russian-held at start
  { id: 'luhansk', name: 'Luhansk', x: 24, y: 4, size: 'major', vp: 10, hub: true, source: true },
  { id: 'sievierodonetsk', name: 'Sievierodonetsk', x: 21, y: 4, size: 'town', vp: 4, hub: false },
  { id: 'bakhmut', name: 'Bakhmut', x: 21, y: 7, size: 'town', vp: 3, hub: false },
  { id: 'donetsk', name: 'Donetsk', x: 22, y: 8, size: 'major', vp: 15, hub: true },
  { id: 'mariupol', name: 'Mariupol', x: 21, y: 11, size: 'major', vp: 10, hub: true, decisiveFor: 'UA' },
  { id: 'berdiansk', name: 'Berdiansk', x: 19, y: 11, size: 'town', vp: 4, hub: true },
  { id: 'melitopol', name: 'Melitopol', x: 17, y: 11, size: 'major', vp: 8, hub: true, decisiveFor: 'UA' },
  { id: 'novakakhovka', name: 'Nova Kakhovka', x: 15, y: 12, size: 'town', vp: 3, hub: true },
  { id: 'dzhankoi', name: 'Dzhankoi', x: 15, y: 14, size: 'town', vp: 3, hub: true },
  { id: 'simferopol', name: 'Simferopol', x: 15, y: 15, size: 'major', vp: 8, hub: true, source: true },
  { id: 'sevastopol', name: 'Sevastopol', x: 13, y: 16, size: 'major', vp: 8, hub: false },
  { id: 'kerch', name: 'Kerch', x: 17, y: 15, size: 'town', vp: 3, hub: true, source: true },
  { id: 'belgorodaxis', name: 'Belgorod Axis', x: 22, y: 2, size: 'town', vp: 0, hub: true, source: true },
  { id: 'rostovaxis', name: 'Rostov Axis', x: 24, y: 10, size: 'town', vp: 0, hub: true, source: true },
];

// Road / rail corridors: contiguous adjacent tile chains.
export interface CorridorDef {
  rail: boolean;
  path: Array<[number, number]>;
}

export const CORRIDORS: CorridorDef[] = [
  // Kyiv - Lviv
  { rail: true, path: [[10, 2], [9, 2], [8, 2], [7, 2], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3], [1, 3]] },
  // Kyiv - Odesa
  { rail: true, path: [[10, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12], [8, 12]] },
  // Kyiv - Kharkiv
  { rail: true, path: [[10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2], [16, 2], [17, 2], [18, 2], [19, 2]] },
  // Kharkiv - Poltava - Dnipro
  { rail: true, path: [[19, 2], [18, 3], [18, 4], [18, 5], [18, 6], [17, 6], [17, 7], [17, 8], [16, 9], [15, 9]] },
  // Dnipro - Zaporizhzhia - Melitopol - Crimea
  { rail: true, path: [[15, 9], [15, 10], [15, 11], [16, 11], [17, 11], [16, 11], [16, 12], [16, 13], [16, 14], [15, 14], [15, 15]] },
  // Simferopol - Sevastopol
  { rail: false, path: [[15, 15], [15, 16], [14, 16], [13, 16]] },
  // Simferopol - Kerch
  { rail: true, path: [[15, 15], [16, 15], [17, 15]] },
  // Kharkiv - Kupiansk
  { rail: false, path: [[19, 2], [20, 2], [20, 3], [21, 3]] },
  // Kharkiv - Izium - Kramatorsk
  { rail: false, path: [[18, 4], [19, 4], [19, 5], [20, 6]] },
  // Pavlohrad - Kramatorsk lateral
  { rail: false, path: [[17, 8], [18, 8], [19, 8], [19, 7], [20, 7], [20, 6]] },
  // Dnipro - Kryvyi Rih - Mykolaiv - Kherson / Odesa
  { rail: false, path: [[15, 9], [14, 9], [13, 9], [13, 10], [12, 10], [12, 11], [11, 11], [11, 12], [12, 12], [13, 12]] },
  { rail: true, path: [[11, 12], [10, 12], [9, 12], [8, 12]] },
  // Kyiv - Cherkasy - Kremenchuk (west-bank road)
  { rail: false, path: [[10, 2], [10, 3], [10, 4], [10, 5], [11, 6], [12, 6], [12, 7], [13, 8], [14, 8], [14, 9], [15, 9]] },
  // Kyiv - Vinnytsia
  { rail: false, path: [[6, 3], [6, 4], [6, 5], [6, 6]] },
  // Kyiv - Chernihiv, Sumy - Kharkiv
  { rail: false, path: [[10, 2], [11, 2], [11, 1], [12, 0]] },
  { rail: false, path: [[16, 1], [17, 1], [18, 1], [19, 2]] },
  // Russian side: Luhansk - Donetsk - Mariupol - Melitopol (land corridor)
  { rail: true, path: [[24, 4], [23, 5], [23, 6], [22, 7], [22, 8]] },
  { rail: false, path: [[22, 8], [21, 9], [21, 10], [21, 11]] },
  { rail: true, path: [[21, 11], [20, 11], [19, 11], [18, 11], [17, 11]] },
  { rail: true, path: [[21, 11], [22, 10], [23, 10], [24, 10]] },
  { rail: false, path: [[22, 2], [22, 3], [22, 4], [21, 4]] },
  { rail: false, path: [[24, 4], [23, 4], [22, 4]] },
  // Nova Kakhovka - Melitopol / Kherson bank
  { rail: false, path: [[14, 12], [15, 12], [16, 12], [16, 11], [17, 11]] },
];

export interface UnitPlacement {
  id: string;
  faction: FactionId;
  type: UnitType;
  name: string;
  x: number;
  y: number;
  strength?: number;
  entrenchment?: number;
}

export const UNITS: UnitPlacement[] = [
  // ------------------------------------------------ Ukraine
  { id: 'u1', faction: 'UA', type: 'armored', name: '1st Tank Brigade', x: 18, y: 3 },
  { id: 'u2', faction: 'UA', type: 'mechanized', name: '92nd Mechanised Brigade', x: 20, y: 3 },
  { id: 'u3', faction: 'UA', type: 'infantry', name: '57th Motorised Brigade', x: 21, y: 3, entrenchment: 2 },
  { id: 'u4', faction: 'UA', type: 'infantry', name: '60th Infantry Brigade', x: 20, y: 4, entrenchment: 2 },
  { id: 'u5', faction: 'UA', type: 'infantry', name: '63rd Infantry Brigade', x: 20, y: 5, entrenchment: 2 },
  { id: 'u6', faction: 'UA', type: 'infantry', name: '24th Infantry Brigade', x: 20, y: 6, entrenchment: 3 },
  { id: 'u7', faction: 'UA', type: 'infantry', name: '53rd Infantry Brigade', x: 20, y: 7, entrenchment: 2 },
  { id: 'u8', faction: 'UA', type: 'infantry', name: '72nd Infantry Brigade', x: 20, y: 8, entrenchment: 2 },
  { id: 'u9', faction: 'UA', type: 'mechanized', name: '93rd Mechanised Brigade', x: 19, y: 8 },
  { id: 'u10', faction: 'UA', type: 'artillery', name: '26th Artillery Brigade', x: 19, y: 7 },
  { id: 'u11', faction: 'UA', type: 'recon', name: '131st Reconnaissance Battalion', x: 18, y: 6 },
  { id: 'u12', faction: 'UA', type: 'mechanized', name: '47th Mechanised Brigade', x: 14, y: 10 },
  { id: 'u13', faction: 'UA', type: 'infantry', name: '65th Infantry Brigade', x: 15, y: 10, entrenchment: 3 },
  { id: 'u14', faction: 'UA', type: 'artillery', name: '55th Artillery Brigade', x: 14, y: 9 },
  { id: 'u15', faction: 'UA', type: 'infantry', name: '35th Marine Brigade', x: 13, y: 12, entrenchment: 2 },
  { id: 'u16', faction: 'UA', type: 'mechanized', name: '28th Mechanised Brigade', x: 12, y: 11 },
  { id: 'u17', faction: 'UA', type: 'infantry', name: '110th Territorial Brigade', x: 16, y: 9, entrenchment: 2 },
  { id: 'u18', faction: 'UA', type: 'infantry', name: '128th Mountain Assault Brigade', x: 18, y: 9, entrenchment: 1 },
  // ------------------------------------------------ Russia
  { id: 'r1', faction: 'RU', type: 'mechanized', name: '20th Motor-Rifle Division', x: 22, y: 3 },
  { id: 'r2', faction: 'RU', type: 'armored', name: '4th Tank Division', x: 23, y: 4 },
  { id: 'r3', faction: 'RU', type: 'infantry', name: '2nd Corps Rifle Division', x: 21, y: 4, entrenchment: 2 },
  { id: 'r4', faction: 'RU', type: 'mechanized', name: '144th Motor-Rifle Division', x: 22, y: 5 },
  { id: 'r5', faction: 'RU', type: 'infantry', name: '132nd Rifle Brigade', x: 21, y: 6, entrenchment: 2 },
  { id: 'r6', faction: 'RU', type: 'infantry', name: '98th Rifle Division', x: 21, y: 7, entrenchment: 2 },
  { id: 'r7', faction: 'RU', type: 'artillery', name: '8th Artillery Brigade', x: 22, y: 7 },
  { id: 'r8', faction: 'RU', type: 'infantry', name: '5th Motor-Rifle Brigade', x: 21, y: 8, entrenchment: 2 },
  { id: 'r9', faction: 'RU', type: 'recon', name: '45th Reconnaissance Brigade', x: 22, y: 6 },
  { id: 'r10', faction: 'RU', type: 'mechanized', name: '36th Motor-Rifle Brigade', x: 20, y: 9 },
  { id: 'r11', faction: 'RU', type: 'armored', name: '90th Tank Division', x: 17, y: 10 },
  { id: 'r12', faction: 'RU', type: 'infantry', name: '58th Rifle Division', x: 16, y: 10, entrenchment: 3 },
  { id: 'r13', faction: 'RU', type: 'artillery', name: '439th Rocket Artillery Brigade', x: 18, y: 10 },
  { id: 'r14', faction: 'RU', type: 'mechanized', name: '127th Motor-Rifle Division', x: 15, y: 11 },
  { id: 'r15', faction: 'RU', type: 'infantry', name: '810th Naval Infantry Brigade', x: 14, y: 12, entrenchment: 2 },
  { id: 'r16', faction: 'RU', type: 'infantry', name: '71st Rifle Regiment', x: 19, y: 10, entrenchment: 1 },
];

export interface FactionSetup {
  manpower: number;
  equipment: number;
  command: number;
  commandMax: number;
  commandRegen: number;
  manpowerIncome: number;
  equipmentIncome: number;
  warSupport: number;
  reserves: Array<{ type: UnitType; name: string; strength: number }>;
}

export const FACTION_SETUP: Record<FactionId, FactionSetup> = {
  UA: {
    manpower: 110,
    equipment: 100,
    command: 6,
    commandMax: 10,
    commandRegen: 4,
    manpowerIncome: 10,
    equipmentIncome: 11,
    warSupport: 70,
    reserves: [{ type: 'mechanized', name: '82nd Air Assault Brigade', strength: 90 }],
  },
  RU: {
    manpower: 160,
    equipment: 135,
    command: 6,
    commandMax: 10,
    commandRegen: 3,
    manpowerIncome: 15,
    equipmentIncome: 13,
    warSupport: 65,
    reserves: [{ type: 'infantry', name: '104th Rifle Division', strength: 90 }],
  },
};

export const SCENARIO_META: ScenarioMeta = {
  id: 'black-earth-2025',
  name: 'Black Earth',
  description:
    'A designed operational scenario set on a static front, spring 2025. Geography, formations and starting conditions are deliberately simplified and do not reproduce live battlefield conditions.',
  dateLabel: 'Spring 2025 · designed scenario',
  startDate: { year: 2025, month: 3, day: 1 },
  maxTurns: 36,
  decisive: {
    UA: ['melitopol', 'mariupol'],
    RU: ['kharkiv', 'zaporizhzhia'],
  },
};
