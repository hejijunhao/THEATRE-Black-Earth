// View-side read of a formation's week: remaining movement, whether it can
// still act, and whether it is in contact. Used by counters, standards and
// the command bench. No rules live here — only attackableTargets / defs.

import { UNIT_DEFS } from '../game/data/defs';
import { neighborIds } from '../game/hex';
import { attackableTargets, unitOnTile } from '../game/rules/movement';
import { GameState, TileId, Unit, parseTileId } from '../game/types';

export interface BoardChrome {
  /** Player formations only: remaining / type-max movement. */
  showMp: boolean;
  mp: number;
  mpMax: number;
  /** Player, this week, no movement left — dim the plate. */
  spent: boolean;
  /** Player, can still walk. */
  idle: boolean;
  /** Player, hex-adjacent to at least one enemy (even if spent). */
  inContact: boolean;
  contactCount: number;
  /** Player, has a legal assault/fires this week. */
  canAttack: boolean;
  /** Player, already committed an assault or fires this week. */
  hasAttacked: boolean;
  /** Enemy the selected friendly can legally assault. */
  threatened: boolean;
}

function adjacentEnemyCount(game: GameState, unit: Unit): number {
  let n = 0;
  for (const id of neighborIds(unit.tile)) {
    const other = unitOnTile(game, id);
    if (other && other.faction !== unit.faction) n += 1;
  }
  return n;
}

export interface UnitOrders {
  mp: number;
  mpMax: number;
  canMove: boolean;
  contacts: Unit[];
  canEntrench: boolean;
  canReinforce: boolean;
  reinforcing: boolean;
  spent: boolean;
  hasAttacked: boolean;
  isFires: boolean;
}

export function boardChrome(
  game: GameState,
  unit: Unit,
  threatened: boolean,
): BoardChrome {
  const isPlayer = unit.faction === game.playerFaction;
  const playerTurn = game.phase === 'player';
  const def = UNIT_DEFS[unit.type];
  const legal = isPlayer && playerTurn ? attackableTargets(game, unit) : [];
  const adjacent = isPlayer ? adjacentEnemyCount(game, unit) : 0;
  const spent = isPlayer && playerTurn && unit.movement <= 0;
  return {
    showMp: isPlayer,
    mp: unit.movement,
    mpMax: def.movement,
    spent,
    idle: isPlayer && playerTurn && unit.movement > 0,
    inContact: adjacent > 0,
    contactCount: adjacent,
    canAttack: legal.length > 0,
    hasAttacked: isPlayer && unit.hasAttacked,
    threatened,
  };
}

export function threatenedIds(game: GameState, selectedId: string | null): Set<string> {
  const ids = new Set<string>();
  if (!selectedId || game.phase !== 'player') return ids;
  const selected = game.units[selectedId];
  if (!selected || selected.faction !== game.playerFaction) return ids;
  for (const t of attackableTargets(game, selected)) ids.add(t.id);
  return ids;
}

export type FormationLane = 'contact' | 'march' | 'spent';

export function formationLane(game: GameState, unit: Unit): FormationLane {
  const o = unitOrders(game, unit);
  if (o.contacts.length > 0) return 'contact';
  if (o.canMove) return 'march';
  return 'spent';
}

const LANE_RANK: Record<FormationLane, number> = { contact: 0, march: 1, spent: 2 };

export type FrontSector = 'kharkiv' | 'donets' | 'zaporizhzhia' | 'kherson' | 'rear';

export const SECTOR_ORDER: FrontSector[] = ['kharkiv', 'donets', 'zaporizhzhia', 'kherson', 'rear'];

export const SECTOR_LABEL: Record<FrontSector, string> = {
  kharkiv: 'Kharkiv',
  donets: 'Donets',
  zaporizhzhia: 'Zaporizhzhia',
  kherson: 'Kherson',
  rear: 'Rear',
};

/** Geographic theatre, not a static OOB. Updates as plates march. */
export function frontSector(tile: TileId): FrontSector {
  const { x, y } = parseTileId(tile);
  if (x < 28 && y < 21) return 'rear';
  if (y <= 11) return 'kharkiv';
  if (y <= 17) return 'donets';
  if (y <= 21 && x >= 30) return 'zaporizhzhia';
  if (y >= 21) return 'kherson';
  return 'rear';
}

/** Next friendly plate that can still act this week. Same order as the ops rail. */
export function cycleUnspent(game: GameState, currentId: string | null): string | null {
  const rows = Object.values(game.units)
    .filter((u) => u.faction === game.playerFaction)
    .map((u) => ({ u, lane: formationLane(game, u) }))
    .filter((r) => r.lane !== 'spent')
    .sort((a, b) => {
      const d = LANE_RANK[a.lane] - LANE_RANK[b.lane];
      if (d !== 0) return d;
      return a.u.name.localeCompare(b.u.name);
    });
  if (rows.length === 0) return null;
  const i = currentId ? rows.findIndex((r) => r.u.id === currentId) : -1;
  return rows[(i + 1) % rows.length].u.id;
}

export function unitOrders(game: GameState, unit: Unit): UnitOrders {
  const def = UNIT_DEFS[unit.type];
  const contacts = attackableTargets(game, unit);
  return {
    mp: unit.movement,
    mpMax: def.movement,
    canMove: unit.movement > 0,
    contacts,
    canEntrench: unit.movement > 0,
    canReinforce: unit.strength < 98,
    reinforcing: unit.reinforcing,
    spent: unit.movement <= 0,
    hasAttacked: unit.hasAttacked,
    isFires: def.support > 0,
  };
}

export type AgencyKind = 'selected' | 'assault' | 'contact' | 'spent' | 'threatened' | 'idle';

/** The one mark a squint should read. Selected outranks assault; assault outranks spent. */
export function agencyKind(chrome: BoardChrome, selected: boolean): AgencyKind {
  if (selected) return 'selected';
  if (chrome.threatened) return 'threatened';
  if (chrome.canAttack) return 'assault';
  if (chrome.inContact) return 'contact';
  if (chrome.spent) return 'spent';
  return 'idle';
}

export { strengthNowCopy } from './lexicon';
