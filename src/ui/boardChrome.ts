// View-side read of a formation's week: remaining movement, whether it can
// still act, and whether it is in contact. Used by counters, standards and
// the command bench. No rules live here — only attackableTargets / defs.

import { UNIT_DEFS } from '../game/data/defs';
import { attackableTargets } from '../game/rules/movement';
import { GameState, Unit } from '../game/types';

export interface BoardChrome {
  /** Player formations only: remaining / type-max movement. */
  showMp: boolean;
  mp: number;
  mpMax: number;
  /** Player, this week, no movement left — dim the plate. */
  spent: boolean;
  /** Player, can still walk. */
  idle: boolean;
  /** Player, at least one legal adjacent target. */
  inContact: boolean;
  contactCount: number;
  /** Enemy the selected friendly can legally assault. */
  threatened: boolean;
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
  const contacts = isPlayer && playerTurn ? attackableTargets(game, unit) : [];
  const spent = isPlayer && playerTurn && unit.movement <= 0;
  return {
    showMp: isPlayer,
    mp: unit.movement,
    mpMax: def.movement,
    spent,
    idle: isPlayer && playerTurn && unit.movement > 0,
    inContact: contacts.length > 0,
    contactCount: contacts.length,
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

export function strengthNowCopy(strength: number): string {
  if (strength > 65) return 'still a fighting body';
  if (strength > 35) return 'worn — replacements will matter';
  return 'near collapse';
}
