// Victory evaluation: decisive objectives, war-support collapse, or a
// campaign-score comparison at the turn limit. Score measures change from the
// starting position, so the asymmetric map does not bias it.

import { CampaignResult, FactionId, GameState, opposing } from '../types';

export function heldVP(state: GameState, faction: FactionId): number {
  let vp = 0;
  for (const city of Object.values(state.cities)) {
    if (state.tiles[city.tile].controller === faction) vp += city.vp;
  }
  return vp;
}

export function startVP(state: GameState, faction: FactionId): number {
  let vp = 0;
  for (const city of Object.values(state.cities)) {
    if (state.tiles[city.tile].originalController === faction) vp += city.vp;
  }
  return vp;
}

// Accrue per-turn score: territorial change relative to start.
export function accrueScore(state: GameState): void {
  for (const fid of ['UA', 'RU'] as FactionId[]) {
    const delta = heldVP(state, fid) - startVP(state, fid);
    state.factions[fid].score += Math.round(delta / 4);
  }
}

function holdsDecisive(state: GameState, faction: FactionId): boolean {
  const targets = state.scenario.decisive[faction];
  return targets.every((cityId) => {
    const city = state.cities[cityId];
    return city && state.tiles[city.tile].controller === faction;
  });
}

export function checkVictory(state: GameState): CampaignResult | null {
  const player = state.playerFaction;
  const enemy = opposing(player);
  const pf = state.factions[player];
  const ef = state.factions[enemy];

  const playerUnits = Object.values(state.units).filter((u) => u.faction === player).length;
  const enemyUnits = Object.values(state.units).filter((u) => u.faction === enemy).length;

  const finish = (outcome: CampaignResult['outcome'], headline: string, detail: string): CampaignResult => ({
    outcome,
    headline,
    detail,
    playerScore: pf.score,
    enemyScore: ef.score,
    turn: state.turn,
  });

  // Decisive conditions can end the campaign early.
  if (holdsDecisive(state, player)) {
    return finish(
      'decisive-victory',
      'Decisive Victory',
      'All decisive strategic objectives are under your control. The theatre balance has fundamentally shifted.',
    );
  }
  if (holdsDecisive(state, enemy)) {
    return finish(
      'decisive-defeat',
      'Decisive Defeat',
      'The enemy holds their decisive strategic objectives. The position is no longer recoverable at acceptable cost.',
    );
  }
  if (ef.warSupport <= 8) {
    return finish(
      'decisive-victory',
      'Enemy War Support Collapsed',
      'Sustained losses and setbacks have exhausted the enemy’s political capacity to continue offensive operations.',
    );
  }
  if (pf.warSupport <= 8) {
    return finish(
      'decisive-defeat',
      'War Support Collapsed',
      'National support for the war effort has collapsed. The campaign cannot be sustained.',
    );
  }
  if (enemyUnits === 0) {
    return finish('decisive-victory', 'Enemy Forces Broken', 'Organised enemy resistance in the theatre has ceased.');
  }
  if (playerUnits === 0) {
    return finish('decisive-defeat', 'Army Broken', 'Your army has ceased to exist as an organised force.');
  }

  // Turn-limit adjudication.
  if (state.turn >= state.scenario.maxTurns) {
    const diff = pf.score - ef.score;
    if (diff >= 30) {
      return finish(
        'operational-victory',
        'Operational Victory',
        'At the end of the campaign period you hold a clear territorial and operational advantage.',
      );
    }
    if (diff <= -30) {
      return finish(
        'operational-defeat',
        'Operational Defeat',
        'At the end of the campaign period the enemy holds a clear territorial and operational advantage.',
      );
    }
    return finish(
      'stalemate',
      'Stalemate',
      'Neither side achieved a decisive advantage. The front has hardened close to where it began.',
    );
  }
  return null;
}
