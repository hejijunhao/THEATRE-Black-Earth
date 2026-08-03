// Turn processing. A full turn: player phase -> AI phase -> global resolution
// (supply, attrition, reinforcement, recovery, weather, events) -> next turn.

import { TERRAIN_DEFS, UNIT_DEFS, WEATHER_DEFS } from '../data/defs';
import { neighborIds } from '../hex';
import {
  FactionId,
  GameState,
  NotificationEntry,
  Unit,
  opposing,
} from '../types';
import { decayIntel, recomputeFog } from './fog';
import { computeTurnMovement, isEnemyZOC, unitOnTile } from './movement';
import { applyIsolationAttrition, resolveSupply, unitSupplyFactor } from './supply';
import { maybeSelectEvent } from './events';
import { checkVictory, accrueScore } from './victory';
import { rollWeather } from './weather';

export function pushNote(
  state: GameState,
  kind: NotificationEntry['kind'],
  text: string,
): void {
  state.notificationSeq += 1;
  state.notifications.push({ id: state.notificationSeq, turn: state.turn, kind, text });
  if (state.notifications.length > 60) state.notifications.splice(0, state.notifications.length - 60);
}

// War-support consequences shared by player and AI actions.
export function noteCityCapture(state: GameState, cityId: string, byFaction: FactionId): void {
  const city = state.cities[cityId];
  const winner = state.factions[byFaction];
  const loser = state.factions[opposing(byFaction)];
  // v2 re-tune: the 48×36 grid doubled the city count and combat tempo, so
  // per-event war-support swings are softer than v1's (see v2-vision §12).
  const swing = Math.min(6, Math.max(1, Math.round(city.vp / 4)));
  winner.warSupport = Math.min(100, winner.warSupport + swing);
  loser.warSupport = Math.max(0, loser.warSupport - swing);
  winner.score += city.vp;
  pushNote(state, 'capture', `${city.name} has been captured by ${byFaction === 'UA' ? 'Ukrainian' : 'Russian'} forces.`);
}

export function noteUnitDestroyed(state: GameState, unit: Unit): void {
  const owner = state.factions[unit.faction];
  const enemy = state.factions[opposing(unit.faction)];
  // v2 re-tune: −2 (was −4) — twice the formations, same political clock.
  owner.warSupport = Math.max(0, owner.warSupport - 2);
  enemy.score += 8;
  pushNote(state, 'combat', `${unit.name} has been destroyed as a fighting formation.`);
}

function processReinforcement(state: GameState, faction: FactionId): void {
  const f = state.factions[faction];
  for (const unit of Object.values(state.units)) {
    if (unit.faction !== faction || !unit.reinforcing) continue;
    if (unit.strength >= 98) {
      unit.reinforcing = false;
      continue;
    }
    const supply = unitSupplyFactor(unit);
    if (supply.recovery <= 0) continue; // isolated: no replacements

    let rate = 12 * supply.recovery;
    if (isEnemyZOC(state, unit.tile, faction)) rate *= 0.5; // frontline rotation matters
    rate = Math.min(rate, 100 - unit.strength);
    if (rate <= 0) continue;

    const cost = UNIT_DEFS[unit.type].reinforceCost;
    const mpNeed = (cost.manpower * rate) / 10;
    const eqNeed = (cost.equipment * rate) / 10;
    const scale = Math.min(1, f.manpower / Math.max(mpNeed, 0.01), f.equipment / Math.max(eqNeed, 0.01));
    if (scale <= 0.05) continue;

    const applied = rate * scale;
    f.manpower = Math.max(0, f.manpower - mpNeed * scale);
    f.equipment = Math.max(0, f.equipment - eqNeed * scale);
    unit.strength = Math.min(100, unit.strength + applied);
    unit.morale = Math.min(100, unit.morale + 3);
    if (unit.strength >= 98) unit.reinforcing = false;
  }
}

function recoverUnits(state: GameState): void {
  const weatherRec = WEATHER_DEFS[state.weather].readinessRecovery;
  for (const unit of Object.values(state.units)) {
    const supply = unitSupplyFactor(unit);
    // Readiness
    const readinessGain = (unit.hasAttacked ? 5 : 10) * supply.recovery * weatherRec;
    unit.readiness = Math.min(100, unit.readiness + readinessGain);
    // Morale drifts up when supplied, down when isolated.
    if (unit.supply === 'isolated') {
      unit.morale = Math.max(0, unit.morale - 4);
    } else {
      unit.morale = Math.min(100, unit.morale + 4 * supply.recovery);
    }
    // Entrenchment grows for stationary units (movers were reset to 0 on move).
    const tile = state.tiles[unit.tile];
    const cap = Math.min(4, TERRAIN_DEFS[tile.terrain].entrenchCap + (tile.fortified ? 1 : 0));
    if (!unit.reinforcing && unit.disorganized === 0 && unit.entrenchment < cap) {
      unit.entrenchment += 1;
    }
    if (unit.disorganized > 0) unit.disorganized -= 1;
  }
}

function refreshMovement(state: GameState): void {
  for (const unit of Object.values(state.units)) {
    unit.movement = computeTurnMovement(state, unit, UNIT_DEFS[unit.type].movement);
    unit.hasAttacked = false;
  }
}

function factionUpkeep(state: GameState, faction: FactionId): void {
  const f = state.factions[faction];
  f.command = Math.min(f.commandMax, f.command + f.commandRegen);
  f.manpower += f.manpowerIncome;
  f.equipment += f.equipmentIncome;
  for (const key of Object.keys(f.opCooldowns) as Array<keyof typeof f.opCooldowns>) {
    const v = f.opCooldowns[key] ?? 0;
    if (v > 0) f.opCooldowns[key] = v - 1;
  }
}

// Run after the AI phase completes: world resolution and the start of the
// next player turn. Returns true if the campaign ended.
export function resolveGlobalTurn(state: GameState): boolean {
  // Attrition and supply resolved on the state as both sides left it.
  resolveSupply(state);
  for (const fid of ['UA', 'RU'] as FactionId[]) {
    const cutOff = applyIsolationAttrition(state, fid);
    for (const msg of cutOff) {
      if (fid === state.playerFaction) pushNote(state, 'supply', msg);
    }
  }
  // Units that starved to zero strength are removed.
  for (const unit of Object.values(state.units)) {
    if (unit.strength <= 0) {
      noteUnitDestroyed(state, unit);
      delete state.units[unit.id];
    }
  }

  processReinforcement(state, 'UA');
  processReinforcement(state, 'RU');
  recoverUnits(state);
  accrueScore(state);

  // Expire transient effects.
  for (const e of state.effects) e.turnsLeft -= 1;
  state.effects = state.effects.filter((e) => e.turnsLeft > 0);

  // Cosmetic battle wear fades over several turns (v2-vision §4.4).
  for (const tile of Object.values(state.tiles)) {
    if (tile.recentCombat && tile.recentCombat > 0) tile.recentCombat -= 1;
  }

  // Next turn begins.
  state.turn += 1;
  state.weather = rollWeather(state);
  factionUpkeep(state, 'UA');
  factionUpkeep(state, 'RU');
  refreshMovement(state);
  resolveSupply(state);
  decayIntel(state);
  recomputeFog(state);

  // Warnings for the player at turn start.
  for (const unit of Object.values(state.units)) {
    if (unit.faction !== state.playerFaction) continue;
    if (unit.supply === 'isolated') {
      pushNote(state, 'warning', `${unit.name} is isolated. Sustained isolation will destroy it.`);
    } else if (unit.supply === 'low') {
      pushNote(state, 'supply', `${unit.name} is running low on supplies.`);
    }
  }

  const result = checkVictory(state);
  if (result) {
    state.result = result;
    state.phase = 'ended';
    return true;
  }

  // Possibly present an event to the player.
  const event = maybeSelectEvent(state);
  if (event) {
    state.pendingEvent = event;
    state.firedEvents.push(event.id);
  }

  state.phase = 'player';
  return false;
}

// Warnings surfaced when the player presses End Turn.
export function endTurnWarnings(state: GameState): string[] {
  const warnings: string[] = [];
  let idle = 0;
  for (const unit of Object.values(state.units)) {
    if (unit.faction !== state.playerFaction) continue;
    if (unit.movement >= UNIT_DEFS[unit.type].movement && !unit.hasAttacked && !unit.reinforcing) idle += 1;
    if (unit.supply === 'isolated') warnings.push(`${unit.name} is isolated.`);
  }
  if (idle > 0) warnings.push(`${idle} formation${idle > 1 ? 's have' : ' has'} not been given orders.`);
  if (state.pendingEvent) warnings.push('A strategic decision is awaiting your answer.');
  return warnings;
}

export function deployReserve(
  state: GameState,
  faction: FactionId,
  reserveId: string,
  tile: string,
): Unit | null {
  const f = state.factions[faction];
  const idx = f.reserves.findIndex((r) => r.id === reserveId);
  if (idx < 0) return null;
  const t = state.tiles[tile];
  if (!t || t.controller !== faction) return null;
  const city = t.cityId ? state.cities[t.cityId] : undefined;
  if (!city || !city.supplyHub) return null;
  if (unitOnTile(state, tile)) return null;
  if ((state.supplyLevels[faction][tile] ?? 0) <= 0) return null;
  const mpCost = 15;
  const eqCost = 10;
  if (f.manpower < mpCost || f.equipment < eqCost) return null;

  f.manpower -= mpCost;
  f.equipment -= eqCost;
  const reserve = f.reserves.splice(idx, 1)[0];
  state.unitSeq += 1;
  const unit: Unit = {
    id: `${faction.toLowerCase()}-dep-${state.unitSeq}`,
    faction,
    type: reserve.type,
    name: reserve.name,
    tile,
    strength: reserve.strength,
    readiness: 80,
    morale: 85,
    supply: 'supplied',
    isolatedTurns: 0,
    movement: 0, // deploys this turn, acts next turn
    entrenchment: 0,
    experience: 0,
    reinforcing: false,
    disorganized: 0,
    hasAttacked: true,
  };
  state.units[unit.id] = unit;
  return unit;
}

// Convenience for AI and UI: list of tiles where a reserve may deploy.
export function validDeployTiles(state: GameState, faction: FactionId): string[] {
  const out: string[] = [];
  for (const city of Object.values(state.cities)) {
    if (!city.supplyHub) continue;
    const t = state.tiles[city.tile];
    if (t.controller !== faction) continue;
    if (unitOnTile(state, city.tile)) continue;
    if ((state.supplyLevels[faction][city.tile] ?? 0) <= 0) continue;
    // Not directly on the frontline.
    if (neighborIds(city.tile).some((n) => {
      const u = unitOnTile(state, n);
      return u && u.faction !== faction;
    })) continue;
    out.push(city.tile);
  }
  return out;
}
