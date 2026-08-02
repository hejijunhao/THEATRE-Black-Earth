// Heuristic AI. Transparent priorities, in line with the design brief:
// protect cities and supply, keep the front coherent, reinforce damaged
// formations, attack weakness, concentrate near objectives, retreat when
// close to destruction, use operations before attacks, keep some reserve.
//
// The AI is executed stepwise (one queue item per call) so the UI can present
// its turn action by action.

import { OPERATION_DEFS, UNIT_DEFS } from '../data/defs';
import { hexDistance, neighborIds } from '../hex';
import { computePreview, resolveBombardment, resolveCombat } from '../rules/combat';
import {
  attackableTargets,
  isEnemyZOC,
  reachableTiles,
  applyMove,
  unitOnTile,
  riverBetween,
} from '../rules/movement';
import { applyOperation, canUseOperation } from '../rules/ops';
import { deployReserve, noteCityCapture, noteUnitDestroyed, pushNote, validDeployTiles } from '../rules/turn';
import { recomputeFog } from '../rules/fog';
import { AIActionLog, FactionId, GameState, TileId, Unit, opposing } from '../types';

const OPS_STEP = '__ops__';
const DEPLOY_STEP = '__deploy__';

export function planAIQueue(state: GameState): string[] {
  const ai = opposing(state.playerFaction);
  const units = Object.values(state.units).filter((u) => u.faction === ai);
  // Order: artillery first (bombard/prep before assaults), then units closest
  // to the enemy so attacks happen before rear movement fills gaps.
  const enemyTiles = Object.values(state.units)
    .filter((u) => u.faction !== ai)
    .map((u) => u.tile);
  const distToEnemy = (u: Unit) =>
    enemyTiles.length === 0 ? 99 : Math.min(...enemyTiles.map((t) => hexDistance(u.tile, t)));
  units.sort((a, b) => {
    const artA = UNIT_DEFS[a.type].support > 0 ? 0 : 1;
    const artB = UNIT_DEFS[b.type].support > 0 ? 0 : 1;
    if (artA !== artB) return artA - artB;
    return distToEnemy(a) - distToEnemy(b);
  });
  return [OPS_STEP, ...units.map((u) => u.id), DEPLOY_STEP];
}

// ---------------------------------------------------------------- helpers

function nearestObjective(state: GameState, faction: FactionId, from: TileId): TileId | null {
  // Enemy-controlled cities weighted by value over distance.
  let best: { tile: TileId; score: number } | null = null;
  for (const city of Object.values(state.cities)) {
    const tile = state.tiles[city.tile];
    if (tile.controller === faction || tile.controller === null) continue;
    if (city.vp <= 0) continue;
    const d = hexDistance(from, city.tile);
    const score = (city.vp + 4) / (d + 1);
    if (!best || score > best.score) best = { tile: city.tile, score };
  }
  return best?.tile ?? null;
}

function threatenedFriendlyCity(state: GameState, faction: FactionId): TileId | null {
  // A valuable friendly city with enemies nearby and no garrison.
  const enemy = opposing(faction);
  let best: { tile: TileId; score: number } | null = null;
  for (const city of Object.values(state.cities)) {
    const tile = state.tiles[city.tile];
    if (tile.controller !== faction || city.vp < 4) continue;
    if (unitOnTile(state, city.tile)) continue;
    let enemyNear = 0;
    for (const u of Object.values(state.units)) {
      if (u.faction === enemy && hexDistance(u.tile, city.tile) <= 3) enemyNear += 1;
    }
    if (enemyNear === 0) continue;
    const score = city.vp * enemyNear;
    if (!best || score > best.score) best = { tile: city.tile, score };
  }
  return best?.tile ?? null;
}

function moveToward(state: GameState, unit: Unit, goal: TileId): TileId | null {
  const reach = reachableTiles(state, unit);
  let best: { id: TileId; score: number } | null = null;
  const currentDist = hexDistance(unit.tile, goal);
  for (const [id, info] of reach) {
    const d = hexDistance(id, goal);
    if (d >= currentDist) continue;
    let score = currentDist - d;
    // Prefer supplied ground and avoid walking into ZOC when just marching.
    const level = state.supplyLevels[unit.faction][id] ?? 0;
    score += Math.min(level, 8) * 0.05;
    if (info.entersZOC && d > 1) score -= 1.5;
    const tile = state.tiles[id];
    if (tile.controller !== unit.faction) score += 0.3; // capturing ground is good
    if (!best || score > best.score) best = { id, score };
  }
  return best?.id ?? null;
}

function retreatTile(state: GameState, unit: Unit): TileId | null {
  const reach = reachableTiles(state, unit);
  let best: { id: TileId; score: number } | null = null;
  for (const [id, info] of reach) {
    if (info.entersZOC) continue;
    const level = state.supplyLevels[unit.faction][id] ?? 0;
    let enemyDist = 99;
    for (const u of Object.values(state.units)) {
      if (u.faction !== unit.faction) enemyDist = Math.min(enemyDist, hexDistance(id, u.tile));
    }
    const score = Math.min(level, 10) + Math.min(enemyDist, 4) * 2;
    if (!best || score > best.score) best = { id, score };
  }
  return best?.id ?? null;
}

function handleCaptures(state: GameState, captured: TileId[], faction: FactionId): void {
  for (const t of captured) {
    const cityId = state.tiles[t].cityId;
    if (cityId) noteCityCapture(state, cityId, faction);
  }
}

// ------------------------------------------------------------------- steps

function runOpsStep(state: GameState, ai: FactionId): AIActionLog {
  const enemy = opposing(ai);
  const f = state.factions[ai];
  const logs: string[] = [];
  let focus: TileId | undefined;

  // Emergency resupply for isolated formations.
  for (const unit of Object.values(state.units)) {
    if (unit.faction !== ai || unit.supply !== 'isolated') continue;
    const check = canUseOperation(state, ai, 'emergency_resupply');
    if (!check.ok) break;
    applyOperation(state, ai, 'emergency_resupply', unit.tile);
    logs.push(`Emergency resupply flown to ${unit.name}.`);
    focus = unit.tile;
    break;
  }

  // Artillery preparation against the most entrenched adjacent enemy.
  let target: Unit | null = null;
  let bestScore = 0;
  for (const unit of Object.values(state.units)) {
    if (unit.faction !== enemy) continue;
    const adjacentAI = neighborIds(unit.tile).some((n) => {
      const u = unitOnTile(state, n);
      return u?.faction === ai;
    });
    if (!adjacentAI) continue;
    const score = unit.entrenchment * 2 + (state.tiles[unit.tile].cityId ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      target = unit;
    }
  }
  if (target && bestScore >= 4) {
    const check = canUseOperation(state, ai, 'artillery_prep');
    if (check.ok && f.command >= OPERATION_DEFS.artillery_prep.cost[ai] + 2) {
      applyOperation(state, ai, 'artillery_prep', target.tile);
      logs.push(`Preparatory fires strike positions near ${describeTile(state, target.tile)}.`);
      focus = target.tile;
    }
  }

  return {
    kind: 'op',
    text: logs.length > 0 ? logs.join(' ') : 'Enemy staff issue orders for the day.',
    focusTile: focus,
  };
}

function runDeployStep(state: GameState, ai: FactionId): AIActionLog {
  const f = state.factions[ai];
  if (f.reserves.length === 0) return { kind: 'info', text: 'Enemy reserves remain uncommitted.' };
  // Commit a reserve only when the front needs it: any friendly city threatened
  // or total strength clearly below the enemy's.
  const threatened = threatenedFriendlyCity(state, ai);
  const aiStrength = Object.values(state.units)
    .filter((u) => u.faction === ai)
    .reduce((s, u) => s + u.strength, 0);
  const foeStrength = Object.values(state.units)
    .filter((u) => u.faction !== ai)
    .reduce((s, u) => s + u.strength, 0);
  if (!threatened && aiStrength > foeStrength * 0.8) {
    return { kind: 'info', text: 'Enemy reserves remain uncommitted.' };
  }
  const tiles = validDeployTiles(state, ai);
  if (tiles.length === 0) return { kind: 'info', text: 'Enemy reserves remain uncommitted.' };
  const goal = threatened ?? nearestObjective(state, ai, tiles[0]) ?? tiles[0];
  tiles.sort((a, b) => hexDistance(a, goal) - hexDistance(b, goal));
  const unit = deployReserve(state, ai, f.reserves[0].id, tiles[0]);
  if (!unit) return { kind: 'info', text: 'Enemy reserves remain uncommitted.' };
  pushNote(state, 'info', `Enemy formation ${unit.name} has been identified deploying to the front.`);
  return { kind: 'deploy', text: `${unit.name} deploys near ${describeTile(state, tiles[0])}.`, focusTile: tiles[0] };
}

function describeTile(state: GameState, tile: TileId): string {
  const cityId = state.tiles[tile]?.cityId;
  if (cityId) return state.cities[cityId].name;
  // Nearest city name for flavour.
  let best: { name: string; d: number } | null = null;
  for (const city of Object.values(state.cities)) {
    const d = hexDistance(tile, city.tile);
    if (!best || d < best.d) best = { name: city.name, d };
  }
  return best ? `${best.name} sector` : tile;
}

function runUnitStep(state: GameState, unitId: string): AIActionLog | null {
  const unit = state.units[unitId];
  if (!unit) return null; // destroyed earlier this turn
  const ai = unit.faction;
  const def = UNIT_DEFS[unit.type];

  // 1. Badly damaged formations pull back and reinforce.
  const onCity = !!state.tiles[unit.tile].cityId;
  if (unit.strength < 35 && !(onCity && isEnemyZOC(state, unit.tile, ai))) {
    if (isEnemyZOC(state, unit.tile, ai)) {
      const away = retreatTile(state, unit);
      if (away) {
        applyMove(state, unit.id, away);
        unit.reinforcing = true;
        return { kind: 'move', text: `${unit.name} rotates to the rear to reconstitute.`, focusTile: away };
      }
    } else {
      unit.reinforcing = true;
      return { kind: 'info', text: `${unit.name} reconstitutes.`, focusTile: unit.tile };
    }
  }

  // 2. Artillery: bombard the weakest adjacent enemy.
  if (def.support > 0) {
    const targets = attackableTargets(state, unit);
    if (targets.length > 0 && unit.readiness > 25) {
      targets.sort((a, b) => b.entrenchment - a.entrenchment);
      const target = targets[0];
      const result = resolveBombardment(state, unit.id, target.id);
      if (result.defenderDestroyed) noteUnitDestroyed(state, target);
      recomputeFog(state);
      return {
        kind: 'attack',
        text: `${unit.name} bombards ${describeTile(state, result.tile)}.`,
        focusTile: result.tile,
        combat: result,
      };
    }
    // Stay behind the line: if adjacent to enemy, pull back.
    if (isEnemyZOC(state, unit.tile, ai)) {
      const away = retreatTile(state, unit);
      if (away) {
        applyMove(state, unit.id, away);
        return { kind: 'move', text: `${unit.name} displaces to a new firing position.`, focusTile: away };
      }
    }
    return null;
  }

  // 3. Evaluate attacks.
  if (!unit.hasAttacked && unit.movement > 0 && unit.readiness > 30) {
    const targets = attackableTargets(state, unit);
    let best: { target: Unit; score: number; ratio: number } | null = null;
    for (const target of targets) {
      const preview = computePreview(state, unit, target);
      let score = preview.ratio;
      const tile = state.tiles[target.tile];
      const city = tile.cityId ? state.cities[tile.cityId] : undefined;
      if (city) score += Math.min(city.vp / 12, 1);
      if (target.strength < 45) score += 0.35;
      if (target.supply === 'isolated' || target.supply === 'low') score += 0.3;
      if (riverBetween(state, unit.tile, target.tile) === 'river') score -= 0.35;
      if (!best || score > best.score) best = { target, score, ratio: preview.ratio };
    }
    if (best && best.ratio >= 0.9 && best.score >= 1.15) {
      const targetName = best.target.name;
      const result = resolveCombat(state, unit.id, best.target.id);
      if (result.defenderDestroyed) noteUnitDestroyed(state, best.target);
      if (result.tileCaptured) {
        const cityId = state.tiles[result.tile].cityId;
        if (cityId) noteCityCapture(state, cityId, ai);
      }
      recomputeFog(state);
      const outcome = result.defenderDestroyed
        ? 'the defenders are destroyed'
        : result.defenderRetreated
          ? 'the defenders fall back'
          : 'the line holds';
      pushNote(state, 'combat', `${unit.name} attacks ${targetName} near ${describeTile(state, result.tile)} — ${outcome}.`);
      return {
        kind: 'attack',
        text: `${unit.name} assaults ${describeTile(state, result.tile)} — ${outcome}.`,
        focusTile: result.tile,
        combat: result,
      };
    }
  }

  // 4. Defend a threatened city.
  const threatened = threatenedFriendlyCity(state, ai);
  if (threatened && hexDistance(unit.tile, threatened) <= 4 && !isEnemyZOC(state, unit.tile, ai)) {
    const step = moveToward(state, unit, threatened);
    if (step) {
      const captured = applyMove(state, unit.id, step);
      handleCaptures(state, captured, ai);
      recomputeFog(state);
      return { kind: 'move', text: `${unit.name} redeploys to cover ${describeTile(state, threatened)}.`, focusTile: step };
    }
  }

  // 5. March toward the most valuable objective.
  if (!isEnemyZOC(state, unit.tile, ai)) {
    const goal = nearestObjective(state, ai, unit.tile);
    if (goal) {
      const step = moveToward(state, unit, goal);
      if (step) {
        const captured = applyMove(state, unit.id, step);
        handleCaptures(state, captured, ai);
        recomputeFog(state);
        const capturedCity = captured.some((t) => state.tiles[t].cityId);
        return {
          kind: 'move',
          text: capturedCity
            ? `${unit.name} advances and seizes ground near ${describeTile(state, step)}.`
            : `${unit.name} advances toward ${describeTile(state, goal)}.`,
          focusTile: step,
        };
      }
    }
  }

  // 6. Hold and dig in (no visible action needed).
  return null;
}

// Execute the next AI queue entry. Returns the log entry, or null when the
// step produced nothing visible. Advances state.aiIndex.
export function stepAI(state: GameState): AIActionLog | null {
  const ai = opposing(state.playerFaction);
  while (state.aiIndex < state.aiQueue.length) {
    const item = state.aiQueue[state.aiIndex];
    state.aiIndex += 1;
    if (item === OPS_STEP) return runOpsStep(state, ai);
    if (item === DEPLOY_STEP) return runDeployStep(state, ai);
    const log = runUnitStep(state, item);
    if (log) return log;
  }
  return null;
}

export function aiTurnDone(state: GameState): boolean {
  return state.aiIndex >= state.aiQueue.length;
}
