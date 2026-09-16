// Combat: effective power = base stat x strength x readiness x morale x
// supply x terrain/support modifiers. Preview and resolution share the same
// power computation so the preview is honest. Fortune is an explicit 2d6
// per side: the attack roll scales damage given, the defence roll scales
// damage taken. A 7 is average (fortune 1.0); 2 is 0.70; 12 is 1.30.

import { TERRAIN_DEFS, UNIT_DEFS, WEATHER_DEFS } from '../data/defs';
import { neighborIds } from '../hex';
import { rollDice } from '../rng';
import { isEnemyZOC, riverBetween, unitOnTile } from './movement';
import { unitSupplyFactor } from './supply';
import {
  CombatFactor,
  CombatPreview,
  CombatResult,
  CombatRoll,
  CombatVerdict,
  GameState,
  Unit,
} from '../types';

interface PowerBreakdown {
  power: number;
  factors: CombatFactor[];
}

function condition(unit: Unit): number {
  return (0.5 + 0.5 * (unit.readiness / 100)) * (0.6 + 0.4 * (unit.morale / 100));
}

export function attackPower(state: GameState, attacker: Unit, defender: Unit): PowerBreakdown {
  const def = UNIT_DEFS[attacker.type];
  const factors: CombatFactor[] = [];
  const defTile = state.tiles[defender.tile];

  let power = def.attack * (attacker.strength / 100);

  const cond = condition(attacker);
  if (cond < 0.92) factors.push({ label: 'Attacker condition', value: cond - 1, side: 'attacker' });
  power *= cond;

  const supply = unitSupplyFactor(attacker).attack;
  if (supply < 1) factors.push({ label: `Attacker supply (${attacker.supply})`, value: supply - 1, side: 'attacker' });
  power *= supply;

  const terrainMod = def.terrainAttack[defTile.terrain] ?? 1;
  if (terrainMod !== 1) {
    factors.push({ label: `${UNIT_DEFS[attacker.type].label} vs ${TERRAIN_DEFS[defTile.terrain].label}`, value: terrainMod - 1, side: 'attacker' });
  }
  power *= terrainMod;

  const weather = WEATHER_DEFS[state.weather].attackMod;
  if (weather !== 1) factors.push({ label: `Weather (${WEATHER_DEFS[state.weather].label})`, value: weather - 1, side: 'attacker' });
  power *= weather;

  const river = riverBetween(state, attacker.tile, defender.tile);
  if (river === 'river') {
    factors.push({ label: 'River assault', value: -0.3, side: 'attacker' });
    power *= 0.7;
  } else if (river === 'bridge') {
    factors.push({ label: 'Contested crossing', value: -0.12, side: 'attacker' });
    power *= 0.88;
  }

  // Artillery support from adjacent friendly formations.
  let support = 0;
  for (const nId of neighborIds(attacker.tile)) {
    const u = unitOnTile(state, nId);
    if (u && u.faction === attacker.faction && u.id !== attacker.id) {
      const sup = UNIT_DEFS[u.type].support;
      if (sup > 0 && u.readiness > 25 && u.supply !== 'isolated') {
        support += sup * (u.strength / 100);
      }
    }
  }
  if (support > 0) {
    const mod = 1 + support / 22;
    factors.push({ label: 'Artillery support', value: mod - 1, side: 'attacker' });
    power *= mod;
  }

  // Adjacent friendly formations pressing the same defender.
  let flanking = 0;
  for (const nId of neighborIds(defender.tile)) {
    const u = unitOnTile(state, nId);
    if (u && u.faction === attacker.faction && u.id !== attacker.id && UNIT_DEFS[u.type].support === 0) {
      flanking += 1;
    }
  }
  if (flanking > 0) {
    const mod = 1 + Math.min(flanking * 0.08, 0.2);
    factors.push({ label: 'Concentric pressure', value: mod - 1, side: 'attacker' });
    power *= mod;
  }

  // Close support operation on this unit.
  const cs = state.effects.some((e) => e.kind === 'close_support' && e.unitId === attacker.id && e.turnsLeft > 0);
  if (cs) {
    let mod = 1.25 * WEATHER_DEFS[state.weather].airOpsMod;
    if (defTile.terrain === 'urban') mod = Math.min(mod, 1.12);
    factors.push({ label: 'Close support', value: mod - 1, side: 'attacker' });
    power *= mod;
  }

  const exp = 1 + attacker.experience * 0.05;
  if (attacker.experience > 0) factors.push({ label: 'Veterancy', value: exp - 1, side: 'attacker' });
  power *= exp;

  if (attacker.disorganized > 0) {
    factors.push({ label: 'Disorganised', value: -0.25, side: 'attacker' });
    power *= 0.75;
  }

  return { power, factors };
}

export function defensePower(state: GameState, defender: Unit, attacker: Unit): PowerBreakdown {
  const def = UNIT_DEFS[defender.type];
  const factors: CombatFactor[] = [];
  const tile = state.tiles[defender.tile];

  let power = def.defense * (defender.strength / 100);

  const cond = condition(defender);
  if (cond < 0.92) factors.push({ label: 'Defender condition', value: cond - 1, side: 'defender' });
  power *= cond;

  const supply = unitSupplyFactor(defender).attack;
  if (supply < 1) factors.push({ label: `Defender supply (${defender.supply})`, value: supply - 1, side: 'defender' });
  power *= supply;

  const terrainBase = TERRAIN_DEFS[tile.terrain].defense;
  const unitTerrain = def.terrainDefense[tile.terrain] ?? 1;
  const terrainMod = terrainBase * unitTerrain;
  if (terrainMod !== 1) {
    factors.push({ label: `Terrain (${TERRAIN_DEFS[tile.terrain].label})`, value: terrainMod - 1, side: 'defender' });
  }
  power *= terrainMod;

  // Towns give a modest defensive edge even without urban terrain.
  if (tile.cityId && tile.terrain !== 'urban') {
    factors.push({ label: 'Settlement', value: 0.1, side: 'defender' });
    power *= 1.1;
  }

  // Entrenchment, partially negated by attacker breakthrough.
  const breakthrough = UNIT_DEFS[attacker.type].breakthrough;
  const effEntrench = Math.max(0, defender.entrenchment - breakthrough / 3);
  if (defender.entrenchment > 0) {
    const mod = 1 + effEntrench * 0.12;
    factors.push({ label: `Entrenchment (${defender.entrenchment})`, value: mod - 1, side: 'defender' });
    power *= mod;
    if (breakthrough >= 5) {
      factors.push({ label: 'Attacker breakthrough', value: -(defender.entrenchment - effEntrench) * 0.12, side: 'defender' });
    }
  }

  if (tile.fortified) {
    factors.push({ label: 'Fortified position', value: 0.2, side: 'defender' });
    power *= 1.2;
  }

  const exp = 1 + defender.experience * 0.05;
  if (defender.experience > 0) factors.push({ label: 'Veterancy', value: exp - 1, side: 'defender' });
  power *= exp;

  if (defender.disorganized > 0) {
    factors.push({ label: 'Disorganised', value: -0.25, side: 'defender' });
    power *= 0.75;
  }

  return { power, factors };
}

export function verdictFromRatio(ratio: number): CombatVerdict {
  if (ratio >= 2.0) return 'decisive';
  if (ratio >= 1.35) return 'favourable';
  if (ratio >= 0.85) return 'even';
  if (ratio >= 0.55) return 'risky';
  return 'severe';
}

/** 2d6 total 2..12 → fortune 0.70..1.30, with 7 → 1.00. */
export function fortuneFrom2d6(total: number): number {
  return 0.7 + (total - 2) * 0.06;
}

export function formatOdds(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return '—';
  if (ratio >= 1) return `${ratio.toFixed(1)} : 1`;
  return `1 : ${(1 / ratio).toFixed(1)}`;
}

export interface ExchangeLosses {
  attackerLoss: number;
  defenderLoss: number;
  attackerReadinessLoss: number;
  defenderReadinessLoss: number;
  attackerMoraleLoss: number;
  defenderMoraleLoss: number;
}

// Attack roll scales damage given; defence roll scales damage taken.
// Odds (ratio) set the base exchange; dice decide the swing.
export function exchangeLosses(
  ratio: number,
  attackerFortune: number,
  defenderFortune: number,
  defenderEntrenchment: number,
): ExchangeLosses {
  const defenderLoss = Math.min(32, Math.max(4, (7 + 11 * (ratio - 0.75)) * attackerFortune));
  let attackerLoss = Math.min(30, Math.max(3, (7 + 11 * (1 / Math.max(ratio, 0.15) - 0.85)) * defenderFortune));
  attackerLoss *= 1 + defenderEntrenchment * 0.06;

  return {
    attackerLoss,
    defenderLoss,
    attackerReadinessLoss: Math.min(35, 16 + attackerLoss * 0.5),
    defenderReadinessLoss: Math.min(30, 12 + defenderLoss * 0.6),
    defenderMoraleLoss: Math.min(25, 6 + defenderLoss * 0.5),
    attackerMoraleLoss: ratio < 0.8 ? Math.min(20, 8 + attackerLoss * 0.4) : 4,
  };
}

function take2d6(state: GameState): CombatRoll {
  const roll = rollDice(state.rngState, 2, 6);
  state.rngState = roll.next;
  return {
    dice: roll.values,
    total: roll.total,
    fortune: fortuneFrom2d6(roll.total),
  };
}

export function describeEngagement(result: CombatResult): string {
  const outcome = result.defenderDestroyed
    ? 'defender destroyed'
    : result.defenderRetreated
      ? result.tileCaptured
        ? 'defenders fell back, ground taken'
        : 'defenders fell back'
      : 'the line held';
  if (result.kind === 'bombardment') {
    return `${result.attackerName} bombards ${result.defenderName} · 2d6 ${result.attackerRoll.total} · −${Math.round(result.defenderLoss)} str · ${outcome}`;
  }
  const defDie = result.defenderRoll ? result.defenderRoll.total : '—';
  return `${result.attackerName} vs ${result.defenderName} · 2d6 ${result.attackerRoll.total}–${defDie} · −${Math.round(result.defenderLoss)} / −${Math.round(result.attackerLoss)} str · ${outcome}`;
}

export function computePreview(state: GameState, attacker: Unit, defender: Unit): CombatPreview {
  const ap = attackPower(state, attacker, defender);
  const dp = defensePower(state, defender, attacker);
  const ratio = ap.power / Math.max(dp.power, 0.01);
  const expected = exchangeLosses(ratio, 1, 1, defender.entrenchment);
  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    attackPower: ap.power,
    defensePower: dp.power,
    ratio,
    oddsLabel: formatOdds(ratio),
    verdict: verdictFromRatio(ratio),
    factors: [...ap.factors, ...dp.factors],
    riverCrossing: riverBetween(state, attacker.tile, defender.tile) !== 'none',
    expectedAttackerLoss: expected.attackerLoss,
    expectedDefenderLoss: expected.defenderLoss,
  };
}

// Choose the defender's retreat tile per the retreat priority rules.
export function chooseRetreatTile(state: GameState, defender: Unit, attackerTile: string): string | null {
  const candidates = neighborIds(defender.tile).filter((nId) => {
    const tile = state.tiles[nId];
    if (!tile || tile.terrain === 'water') return false;
    if (tile.controller !== defender.faction) return false;
    if (unitOnTile(state, nId)) return false;
    if (nId === attackerTile) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  const scored = candidates.map((id) => {
    let score = 0;
    const level = state.supplyLevels[defender.faction][id] ?? 0;
    score += level; // prefer supplied ground
    if (!isEnemyZOC(state, id, defender.faction)) score += 6;
    return { id, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}

// Resolve an attack. Mutates draft state (units, tiles, rngState). The caller
// handles notifications, score and fog updates.
export function resolveCombat(state: GameState, attackerId: string, defenderId: string): CombatResult {
  const attacker = state.units[attackerId];
  const defender = state.units[defenderId];
  const defenderTile = defender.tile;
  const attackerName = attacker.name;
  const defenderName = defender.name;
  const attackerStrengthBefore = attacker.strength;
  const defenderStrengthBefore = defender.strength;

  const ap = attackPower(state, attacker, defender);
  const dp = defensePower(state, defender, attacker);
  const baseRatio = ap.power / Math.max(dp.power, 0.01);
  const previewVerdict = verdictFromRatio(baseRatio);

  const attackerRoll = take2d6(state);
  const defenderRoll = take2d6(state);
  const finalRatio = baseRatio * (attackerRoll.fortune / defenderRoll.fortune);

  const exchange = exchangeLosses(
    baseRatio,
    attackerRoll.fortune,
    defenderRoll.fortune,
    defender.entrenchment,
  );
  const {
    attackerLoss,
    defenderLoss,
    attackerReadinessLoss,
    defenderReadinessLoss,
    attackerMoraleLoss,
    defenderMoraleLoss,
  } = exchange;

  attacker.strength = Math.max(0, attacker.strength - attackerLoss);
  defender.strength = Math.max(0, defender.strength - defenderLoss);
  attacker.readiness = Math.max(0, attacker.readiness - attackerReadinessLoss);
  defender.readiness = Math.max(0, defender.readiness - defenderReadinessLoss);
  attacker.morale = Math.max(0, attacker.morale - attackerMoraleLoss);
  defender.morale = Math.max(0, defender.morale - defenderMoraleLoss);

  // Defender entrenchment erodes under assault.
  defender.entrenchment = Math.max(0, defender.entrenchment - 1);

  attacker.hasAttacked = true;
  attacker.movement = Math.max(0, attacker.movement - 1);
  attacker.reinforcing = false;
  defender.reinforcing = false;

  // Cosmetic battle wear (v2-vision §4.4): the renderer draws craters and
  // smoke from this counter. No rule reads it.
  const contestedTile = state.tiles[defender.tile];
  if (contestedTile) contestedTile.recentCombat = 3;

  let defenderRetreated = false;
  let defenderDestroyed = false;
  let tileCaptured = false;

  const mustRetreat =
    defender.strength <= 0 ||
    (finalRatio >= 1.6 && defender.strength < 55) ||
    defender.strength < 30 ||
    defender.morale < 25;

  if (mustRetreat && defender.strength > 0) {
    const retreatTo = chooseRetreatTile(state, defender, attacker.tile);
    if (retreatTo) {
      defender.tile = retreatTo;
      defender.entrenchment = 0;
      defender.disorganized = 1;
      defenderRetreated = true;
    } else {
      // No escape: severe losses, possible destruction.
      defender.strength = Math.max(0, defender.strength - 15);
      defender.morale = Math.max(0, defender.morale - 15);
      if (defender.strength <= 20) {
        defenderDestroyed = true;
      }
    }
  }
  if (defender.strength <= 0) defenderDestroyed = true;

  if (defenderDestroyed) {
    delete state.units[defenderId];
  }

  // Attacker advances into a vacated tile, capturing it.
  if ((defenderRetreated || defenderDestroyed) && finalRatio >= 1) {
    const tile = state.tiles[defenderTile];
    tile.controller = attacker.faction;
    tile.fortified = false;
    attacker.tile = defenderTile;
    attacker.entrenchment = 0;
    tileCaptured = true;
  }

  // Experience for a successful engagement.
  if ((defenderRetreated || defenderDestroyed) && attacker.experience < 3) {
    attacker.experience += 1;
  }

  return {
    kind: 'assault',
    attackerId,
    defenderId,
    attackerName,
    defenderName,
    attackPower: ap.power,
    defensePower: dp.power,
    baseRatio,
    finalRatio,
    previewVerdict,
    resolvedVerdict: verdictFromRatio(finalRatio),
    attackerRoll,
    defenderRoll,
    attackerLoss,
    defenderLoss,
    attackerReadinessLoss,
    defenderReadinessLoss,
    attackerMoraleLoss,
    defenderMoraleLoss,
    attackerStrengthBefore,
    defenderStrengthBefore,
    attackerStrengthAfter: attacker.strength,
    defenderStrengthAfter: defenderDestroyed ? 0 : defender.strength,
    defenderRetreated,
    defenderDestroyed,
    tileCaptured,
    tile: defenderTile,
    factors: [...ap.factors, ...dp.factors],
  };
}

// Artillery bombardment: degrades without capturing.
export function resolveBombardment(state: GameState, attackerId: string, defenderId: string): CombatResult {
  const attacker = state.units[attackerId];
  const defender = state.units[defenderId];
  const attackerName = attacker.name;
  const defenderName = defender.name;
  const attackerStrengthBefore = attacker.strength;
  const defenderStrengthBefore = defender.strength;
  const defenderTile = defender.tile;

  const attackerRoll = take2d6(state);
  const power = UNIT_DEFS[attacker.type].support * (attacker.strength / 100) * condition(attacker);
  const strengthLoss = Math.min(10, (2 + power * 0.55) * attackerRoll.fortune);
  const readinessLoss = Math.min(25, (8 + power * 1.4) * attackerRoll.fortune);

  defender.strength = Math.max(0, defender.strength - strengthLoss);
  defender.readiness = Math.max(0, defender.readiness - readinessLoss);
  defender.morale = Math.max(0, defender.morale - 5);
  defender.entrenchment = Math.max(0, defender.entrenchment - 1);

  attacker.hasAttacked = true;
  attacker.movement = 0;

  const destroyed = defender.strength <= 0;
  if (destroyed) delete state.units[defenderId];

  const ratio = power / Math.max(8, 0.01);

  return {
    kind: 'bombardment',
    attackerId,
    defenderId,
    attackerName,
    defenderName,
    attackPower: power,
    defensePower: 0,
    baseRatio: ratio,
    finalRatio: ratio * attackerRoll.fortune,
    previewVerdict: 'even',
    resolvedVerdict: destroyed ? 'decisive' : 'even',
    attackerRoll,
    defenderRoll: null,
    attackerLoss: 0,
    defenderLoss: strengthLoss,
    attackerReadinessLoss: 0,
    defenderReadinessLoss: readinessLoss,
    attackerMoraleLoss: 0,
    defenderMoraleLoss: 5,
    attackerStrengthBefore,
    defenderStrengthBefore,
    attackerStrengthAfter: attacker.strength,
    defenderStrengthAfter: destroyed ? 0 : defender.strength,
    defenderRetreated: false,
    defenderDestroyed: destroyed,
    tileCaptured: false,
    tile: defenderTile,
    factors: [{ label: 'Bombardment', value: 0, side: 'attacker' }],
  };
}
