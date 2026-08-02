// Weather: a seeded monthly table. Turns are weekly; the calendar drives both
// weather probabilities and the date shown in the top bar.

import { draw } from '../rng';
import { GameState, WeatherType } from '../types';

const MONTH_TABLE: Record<number, Array<[WeatherType, number]>> = {
  1: [['snow', 0.6], ['overcast', 0.3], ['clear', 0.1]],
  2: [['snow', 0.5], ['overcast', 0.3], ['mud', 0.2]],
  3: [['mud', 0.5], ['rain', 0.3], ['overcast', 0.2]],
  4: [['rain', 0.4], ['clear', 0.3], ['overcast', 0.3]],
  5: [['clear', 0.6], ['overcast', 0.25], ['rain', 0.15]],
  6: [['clear', 0.6], ['overcast', 0.25], ['rain', 0.15]],
  7: [['clear', 0.7], ['overcast', 0.2], ['rain', 0.1]],
  8: [['clear', 0.7], ['overcast', 0.2], ['rain', 0.1]],
  9: [['rain', 0.4], ['clear', 0.3], ['overcast', 0.3]],
  10: [['mud', 0.4], ['rain', 0.4], ['overcast', 0.2]],
  11: [['mud', 0.5], ['snow', 0.2], ['overcast', 0.3]],
  12: [['snow', 0.6], ['overcast', 0.3], ['clear', 0.1]],
};

export function turnDate(state: GameState): Date {
  const { year, month, day } = state.scenario.startDate;
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + (state.turn - 1) * 7);
  return d;
}

export function formatTurnDate(state: GameState): string {
  const d = turnDate(state);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function rollWeather(state: GameState): WeatherType {
  const month = turnDate(state).getUTCMonth() + 1;
  const table = MONTH_TABLE[month];
  const roll = draw(state.rngState);
  state.rngState = roll.next;
  let acc = roll.value;
  for (const [weather, p] of table) {
    acc -= p;
    if (acc <= 0) return weather;
  }
  return table[table.length - 1][0];
}
