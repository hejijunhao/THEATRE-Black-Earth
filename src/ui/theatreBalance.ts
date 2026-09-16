// Living victory clock — why you are winning or losing this week.
// Pure read of GameState. Cities / war support / army; no new rules.

import { heldVP, startVP } from '../game/rules/victory';
import { GameState, opposing } from '../game/types';
import { armyNow, citiesNow, Tone, warSupportNow } from './lexicon';

export type ClockHeadline = 'Pressing' | 'Holding' | 'Slipping' | 'Breaking';

export interface ClockNeedle {
  value: number;
  max: number;
  label: string;
  sub: string;
  tone: Tone;
}

export interface TheatreBalance {
  headline: ClockHeadline;
  line: string;
  cities: ClockNeedle & { held: number; start: number; delta: number; decisiveHeld: number; decisiveTotal: number };
  support: ClockNeedle & { own: number; foe: number };
  army: ClockNeedle & { ownStrength: number; foeStrength: number; ownCount: number; foeCount: number; fighting: number; spent: number };
}

function needleTone(tone: Tone): Tone {
  return tone;
}

export function theatreBalance(game: GameState): TheatreBalance {
  const player = game.playerFaction;
  const enemy = opposing(player);
  const mine = Object.values(game.units).filter((u) => u.faction === player);
  const theirs = Object.values(game.units).filter((u) => u.faction === enemy);

  const held = heldVP(game, player);
  const start = startVP(game, player);
  const decisiveIds = game.scenario.decisive[player];
  const decisiveHeld = decisiveIds.filter((id) => {
    const city = game.cities[id];
    return city && game.tiles[city.tile].controller === player;
  }).length;
  const decisiveTotal = decisiveIds.length;
  const cityCopy = citiesNow(held, start, decisiveHeld, decisiveTotal);

  const ownWS = game.factions[player].warSupport;
  const foeWS = game.factions[enemy].warSupport;
  const wsCopy = warSupportNow(ownWS, foeWS);

  const ownStrength = mine.reduce((n, u) => n + u.strength, 0);
  const foeStrength = theirs.reduce((n, u) => n + u.strength, 0);
  const fighting = game.phase === 'player' ? mine.filter((u) => u.movement > 0).length : mine.length;
  const spent = game.phase === 'player' ? mine.filter((u) => u.movement <= 0).length : 0;
  const armyCopy = armyNow(ownStrength, foeStrength, mine.length, theirs.length);

  let headline: ClockHeadline = 'Holding';
  if (ownWS < 25 || mine.length === 0 || ownStrength < foeStrength * 0.45) {
    headline = 'Breaking';
  } else if (held < start || ownWS < foeWS - 6 || ownStrength < foeStrength * 0.75) {
    headline = 'Slipping';
  } else if (
    held - start >= 8
    || (decisiveHeld === decisiveTotal && decisiveTotal > 0)
    || foeWS < 30
  ) {
    headline = 'Pressing';
  }

  const line =
    headline === 'Breaking'
      ? 'The campaign is close to political or military collapse.'
      : headline === 'Slipping'
        ? 'Ground, cohesion or the army is giving — not yet broken.'
        : headline === 'Pressing'
          ? 'The map, the clock or their cohesion is yours this week.'
          : 'Neither side has forced the theatre. Hold or choose a fight.';

  return {
    headline,
    line,
    cities: {
      value: held,
      max: Math.max(start, held, 1),
      label: String(held),
      sub: `${held - start >= 0 ? '+' : ''}${held - start} · ${decisiveHeld}/${decisiveTotal} dec.`,
      tone: needleTone(cityCopy.tone),
      held,
      start,
      delta: held - start,
      decisiveHeld,
      decisiveTotal,
    },
    support: {
      value: ownWS,
      max: 100,
      label: `${Math.round(ownWS)}%`,
      sub: `foe ${Math.round(foeWS)}%`,
      tone: needleTone(wsCopy.tone),
      own: ownWS,
      foe: foeWS,
    },
    army: {
      value: ownStrength,
      max: Math.max(ownStrength + foeStrength, 1),
      label: String(mine.length),
      sub: `${fighting} march · ${spent} spent`,
      tone: needleTone(armyCopy.tone),
      ownStrength,
      foeStrength,
      ownCount: mine.length,
      foeCount: theirs.length,
      fighting,
      spent,
    },
  };
}
