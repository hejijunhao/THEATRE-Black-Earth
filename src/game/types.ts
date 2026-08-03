// Core simulation types. Everything here must stay JSON-serializable so the
// whole game state can be written to localStorage and restored verbatim.

export type FactionId = 'UA' | 'RU';
export type TerrainType = 'plains' | 'forest' | 'urban' | 'marsh' | 'water';
export type WeatherType = 'clear' | 'overcast' | 'rain' | 'mud' | 'snow';
export type UnitType = 'infantry' | 'mechanized' | 'armored' | 'artillery' | 'recon';
export type SupplyState = 'full' | 'supplied' | 'strained' | 'low' | 'isolated';
export type CitySize = 'capital' | 'major' | 'town';

export type TileId = string; // "x,y" offset coordinates (odd-r, pointy-top)

export interface Tile {
  id: TileId;
  x: number;
  y: number;
  terrain: TerrainType;
  controller: FactionId | null; // null => neutral / non-playable water
  originalController: FactionId | null;
  cityId?: string;
  road: boolean;
  rail: boolean;
  fortified: boolean; // player/AI built fortification state
  elevation: number;  // purely visual, 0..1
  // Cosmetic battle-wear counter (v2-vision §4.4): set on combat, decays per
  // turn; the renderer draws craters/burns/smoke from it. No rules read it.
  recentCombat?: number;
}

export interface City {
  id: string;
  name: string;
  tile: TileId;
  size: CitySize;
  vp: number;             // victory point value, 0 for plain towns
  supplyHub: boolean;     // extends supply network
  supplySource?: boolean; // originates supply (national entry points)
  decisiveFor?: FactionId; // capturing it counts toward decisive victory
  // Cosmetic landmark tag (v2-vision §4.3): an abstracted silhouette the
  // renderer places at this city. No rules read it.
  landmark?: string;
}

export interface Unit {
  id: string;
  faction: FactionId;
  type: UnitType;
  name: string;
  tile: TileId;
  strength: number;       // 0..100
  readiness: number;      // 0..100
  morale: number;         // 0..100
  supply: SupplyState;
  isolatedTurns: number;  // consecutive turns isolated
  movement: number;       // MP remaining this turn
  entrenchment: number;   // 0..4
  experience: number;     // 0..3
  reinforcing: boolean;
  disorganized: number;   // turns of disorganization remaining
  hasAttacked: boolean;
}

export interface UnitTypeDef {
  type: UnitType;
  label: string;
  attack: number;
  defense: number;
  breakthrough: number;   // bonus vs entrenchment when attacking
  support: number;        // combat support projected to adjacent friendly attacks
  movement: number;       // max MP
  vision: number;         // fog-of-war radius
  reinforceCost: { manpower: number; equipment: number }; // per 10 strength
  terrainAttack: Partial<Record<TerrainType, number>>;    // multipliers
  terrainDefense: Partial<Record<TerrainType, number>>;
}

export interface FactionState {
  id: FactionId;
  name: string;
  manpower: number;
  equipment: number;
  command: number;
  commandMax: number;
  commandRegen: number;
  manpowerIncome: number;
  equipmentIncome: number;
  warSupport: number; // 0..100
  score: number;
  opCooldowns: Partial<Record<OperationId, number>>;
  reserves: ReserveUnit[];
}

export interface ReserveUnit {
  id: string;
  type: UnitType;
  name: string;
  strength: number;
}

export type OperationId =
  | 'recon_sweep'
  | 'artillery_prep'
  | 'close_support'
  | 'emergency_resupply'
  | 'rapid_reinforcement'
  | 'fortify_position';

export interface OperationDef {
  id: OperationId;
  name: string;
  description: string;
  target: 'enemy-tile' | 'friendly-unit' | 'any-tile';
  cost: Record<FactionId, number>; // command points
  cooldown: number;                // turns
}

// Transient effects created by operations, cleared at end of the owning turn
// (or after N turns for lingering ones).
export interface ActiveEffect {
  kind: 'recon' | 'close_support' | 'resupply' | 'arty_prep_mark';
  faction: FactionId;
  tile?: TileId;
  unitId?: string;
  turnsLeft: number;
}

// Player-side intelligence picture of enemy formations.
// level: 0 unknown, 1 suspected, 2 type identified, 3 strength estimated, 4 fully observed
export interface IntelRecord {
  unitId: string;
  level: 0 | 1 | 2 | 3 | 4;
  tile: TileId;        // last seen position
  seenTurn: number;
  type?: UnitType;
  strength?: number;
}

export interface CombatFactor {
  label: string;
  value: number; // multiplier deviation, e.g. +0.25 / -0.3, for display
  side: 'attacker' | 'defender';
}

export type CombatVerdict = 'decisive' | 'favourable' | 'even' | 'risky' | 'severe';

export interface CombatPreview {
  attackerId: string;
  defenderId: string;
  attackPower: number;
  defensePower: number;
  ratio: number;
  verdict: CombatVerdict;
  factors: CombatFactor[];
  riverCrossing: boolean;
}

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  attackerLoss: number;
  defenderLoss: number;
  attackerReadinessLoss: number;
  defenderReadinessLoss: number;
  attackerMoraleLoss: number;
  defenderMoraleLoss: number;
  defenderRetreated: boolean;
  defenderDestroyed: boolean;
  tileCaptured: boolean;
  tile: TileId;
  factors: CombatFactor[];
}

export interface GameEventOption {
  label: string;
  description: string;
  effects: EventEffects;
}

export interface EventEffects {
  manpower?: number;
  equipment?: number;
  command?: number;
  warSupport?: number;
  enemyWarSupport?: number;
  readinessAll?: number;
  reserve?: { type: UnitType; name: string };
}

export interface GameEventDef {
  id: string;
  title: string;
  text: string;
  faction: FactionId | 'both'; // whose turn it fires on (player only in v1)
  minTurn: number;
  maxTurn: number;
  weight: number;
  options: GameEventOption[]; // single option => informational
}

export interface NotificationEntry {
  id: number;
  turn: number;
  kind: 'combat' | 'capture' | 'supply' | 'event' | 'reinforce' | 'warning' | 'info';
  text: string;
}

export type CampaignOutcome =
  | 'decisive-victory'
  | 'operational-victory'
  | 'stalemate'
  | 'operational-defeat'
  | 'decisive-defeat';

export interface CampaignResult {
  outcome: CampaignOutcome;
  headline: string;
  detail: string;
  playerScore: number;
  enemyScore: number;
  turn: number;
}

export interface AIActionLog {
  kind: 'move' | 'attack' | 'op' | 'deploy' | 'info';
  text: string;
  focusTile?: TileId;
  combat?: CombatResult;
}

export interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  dateLabel: string;   // explicit scenario date, e.g. "March 2025 — designed scenario"
  startDate: { year: number; month: number; day: number };
  maxTurns: number;
  // City ids a faction must hold simultaneously for a decisive territorial victory.
  decisive: Record<FactionId, string[]>;
}

export interface GameState {
  version: number;
  scenario: ScenarioMeta;
  seed: number;
  rngState: number;
  turn: number;
  phase: 'player' | 'ai' | 'ended';
  playerFaction: FactionId;
  weather: WeatherType;
  tiles: Record<TileId, Tile>;
  cities: Record<string, City>;
  riverEdges: string[];   // "x1,y1|x2,y2" canonical (sorted) keys
  bridgeEdges: string[];  // subset of riverEdges with a crossing
  units: Record<string, Unit>;
  factions: Record<FactionId, FactionState>;
  intel: Record<string, IntelRecord>;
  visibleTiles: TileId[]; // player-visible tiles this turn
  // Supply reach per faction: tileId -> remaining supply budget (higher = better).
  supplyLevels: Record<FactionId, Record<TileId, number>>;
  // AI turn playback queue (unit ids still to act) — persisted for completeness.
  aiQueue: string[];
  aiIndex: number;
  effects: ActiveEffect[];
  firedEvents: string[];
  pendingEvent: GameEventDef | null;
  notifications: NotificationEntry[];
  notificationSeq: number;
  result: CampaignResult | null;
  tutorialStep: number; // -1 = off / completed
  unitSeq: number;
}

// v2: 48×36 geodata-derived grid (was 26×17 hand-authored); v3 adds the two
// sanctioned cosmetic fields (tile.recentCombat, city.landmark). Old saves
// are incompatible and are ignored by the loader rather than half-loaded.
export const SAVE_VERSION = 3;

export function tileId(x: number, y: number): TileId {
  return `${x},${y}`;
}

export function parseTileId(id: TileId): { x: number; y: number } {
  const [x, y] = id.split(',').map(Number);
  return { x, y };
}

export function edgeKey(a: TileId, b: TileId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function opposing(f: FactionId): FactionId {
  return f === 'UA' ? 'RU' : 'UA';
}
