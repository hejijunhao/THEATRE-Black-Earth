import {
  FactionId,
  OperationDef,
  OperationId,
  TerrainType,
  UnitType,
  UnitTypeDef,
  WeatherType,
} from '../types';

// ---------------------------------------------------------------- unit types

export const UNIT_DEFS: Record<UnitType, UnitTypeDef> = {
  infantry: {
    type: 'infantry',
    label: 'Infantry',
    attack: 10,
    defense: 14,
    breakthrough: 2,
    support: 0,
    movement: 3,
    vision: 2,
    reinforceCost: { manpower: 12, equipment: 5 },
    terrainAttack: { urban: 1.15, forest: 1.15, plains: 0.95 },
    terrainDefense: { urban: 1.3, forest: 1.2 },
  },
  mechanized: {
    type: 'mechanized',
    label: 'Mechanised',
    attack: 14,
    defense: 12,
    breakthrough: 5,
    support: 0,
    movement: 5,
    vision: 2,
    reinforceCost: { manpower: 8, equipment: 12 },
    terrainAttack: { plains: 1.15, forest: 0.85, urban: 0.85 },
    terrainDefense: { plains: 1.05, forest: 0.9 },
  },
  armored: {
    type: 'armored',
    label: 'Armoured',
    attack: 18,
    defense: 11,
    breakthrough: 9,
    support: 0,
    movement: 4,
    vision: 1,
    reinforceCost: { manpower: 5, equipment: 18 },
    terrainAttack: { plains: 1.3, forest: 0.65, urban: 0.6, marsh: 0.6 },
    terrainDefense: { plains: 1.1, forest: 0.75, urban: 0.75 },
  },
  artillery: {
    type: 'artillery',
    label: 'Artillery',
    attack: 6,
    defense: 7,
    breakthrough: 1,
    support: 7,
    movement: 3,
    vision: 1,
    reinforceCost: { manpower: 5, equipment: 14 },
    terrainAttack: {},
    terrainDefense: { urban: 1.1 },
  },
  recon: {
    type: 'recon',
    label: 'Reconnaissance',
    attack: 8,
    defense: 8,
    breakthrough: 3,
    support: 1,
    movement: 6,
    vision: 3,
    reinforceCost: { manpower: 7, equipment: 8 },
    terrainAttack: { plains: 1.05 },
    terrainDefense: { forest: 1.15 },
  },
};

// ----------------------------------------------------------------- terrain

export interface TerrainDef {
  label: string;
  moveCost: number;       // MP to enter
  defense: number;        // defensive multiplier
  entrenchCap: number;    // max entrenchment
  supplyCost: number;     // cost for supply propagation
}

export const TERRAIN_DEFS: Record<TerrainType, TerrainDef> = {
  plains: { label: 'Plains', moveCost: 1, defense: 1.0, entrenchCap: 3, supplyCost: 1 },
  forest: { label: 'Forest', moveCost: 2, defense: 1.2, entrenchCap: 4, supplyCost: 1.5 },
  urban: { label: 'Urban', moveCost: 1, defense: 1.4, entrenchCap: 4, supplyCost: 1 },
  marsh: { label: 'Marsh', moveCost: 3, defense: 1.1, entrenchCap: 2, supplyCost: 2.5 },
  water: { label: 'Water', moveCost: Infinity, defense: 1, entrenchCap: 0, supplyCost: Infinity },
};

// ----------------------------------------------------------------- weather

export interface WeatherDef {
  label: string;
  moveCostBonus: number;  // added to non-road tile entry cost
  attackMod: number;      // multiplier on attack power
  reconPenalty: number;   // subtracted from vision radius
  readinessRecovery: number; // multiplier on readiness recovery
  airOpsMod: number;      // multiplier on close-support effectiveness
}

export const WEATHER_DEFS: Record<WeatherType, WeatherDef> = {
  clear:    { label: 'Clear',       moveCostBonus: 0,   attackMod: 1.0,  reconPenalty: 0, readinessRecovery: 1.0, airOpsMod: 1.0 },
  overcast: { label: 'Heavy cloud', moveCostBonus: 0,   attackMod: 1.0,  reconPenalty: 0, readinessRecovery: 1.0, airOpsMod: 0.8 },
  rain:     { label: 'Rain',        moveCostBonus: 0.5, attackMod: 0.95, reconPenalty: 1, readinessRecovery: 0.9, airOpsMod: 0.7 },
  mud:      { label: 'Mud',         moveCostBonus: 1,   attackMod: 0.85, reconPenalty: 0, readinessRecovery: 0.85, airOpsMod: 0.85 },
  snow:     { label: 'Snow',        moveCostBonus: 0.5, attackMod: 0.9,  reconPenalty: 1, readinessRecovery: 0.8, airOpsMod: 0.9 },
};

// -------------------------------------------------------------- operations

export const OPERATION_DEFS: Record<OperationId, OperationDef> = {
  recon_sweep: {
    id: 'recon_sweep',
    name: 'Reconnaissance Sweep',
    description:
      'Task drones and observation assets against a sector. Reveals enemy formations within two hexes of the target for this turn and sharpens combat estimates.',
    target: 'any-tile',
    cost: { UA: 2, RU: 3 },
    cooldown: 1,
  },
  artillery_prep: {
    id: 'artillery_prep',
    name: 'Artillery Preparation',
    description:
      'Concentrated fires against a defended hex. Reduces entrenchment by 2 and degrades defender readiness and morale. Does not capture ground by itself.',
    target: 'enemy-tile',
    cost: { UA: 3, RU: 2 },
    cooldown: 1,
  },
  close_support: {
    id: 'close_support',
    name: 'Close Support',
    description:
      'Commit scarce air and precision-strike assets to one formation. Its next attack this turn gains +25% power. Less effective against dense urban positions and in bad weather.',
    target: 'friendly-unit',
    cost: { UA: 3, RU: 3 },
    cooldown: 2,
  },
  emergency_resupply: {
    id: 'emergency_resupply',
    name: 'Emergency Resupply',
    description:
      'Push supplies through to a cut-off or strained formation by improvised routes. The unit counts as Supplied for two turns. Does not repair the route itself.',
    target: 'friendly-unit',
    cost: { UA: 2, RU: 2 },
    cooldown: 2,
  },
  rapid_reinforcement: {
    id: 'rapid_reinforcement',
    name: 'Rapid Reinforcement',
    description:
      'Give one reinforcing formation priority on replacements and equipment. Doubles its reinforcement rate this turn at extra equipment cost.',
    target: 'friendly-unit',
    cost: { UA: 2, RU: 2 },
    cooldown: 1,
  },
  fortify_position: {
    id: 'fortify_position',
    name: 'Fortify Position',
    description:
      'Emergency engineering effort. The selected formation immediately gains 2 entrenchment and its hex is marked as fortified while held.',
    target: 'friendly-unit',
    cost: { UA: 2, RU: 3 },
    cooldown: 2,
  },
};

export const SUPPLY_FACTORS: Record<string, { attack: number; movementMod: number; recovery: number }> = {
  full:     { attack: 1.0,  movementMod: 1.0, recovery: 1.0 },
  supplied: { attack: 0.95, movementMod: 1.0, recovery: 0.9 },
  strained: { attack: 0.85, movementMod: 0.85, recovery: 0.7 },
  low:      { attack: 0.7,  movementMod: 0.6, recovery: 0.4 },
  isolated: { attack: 0.5,  movementMod: 0.5, recovery: 0.0 },
};

export const FACTION_META: Record<FactionId, { name: string; color: string; accent: string }> = {
  UA: { name: 'Ukraine', color: '#3d5a80', accent: '#7fa8d0' },
  RU: { name: 'Russia', color: '#6e2f2f', accent: '#b06a5a' },
};
