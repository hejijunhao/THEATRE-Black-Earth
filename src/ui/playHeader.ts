// Vic3-thin play header model. The strip is chips, not a wordmark banner.
// Pure reads of GameState — no rules, no React.

import { FACTION_META, WEATHER_DEFS } from '../game/data/defs';
import { formatTurnDate } from '../game/rules/weather';
import { FactionId, GameState } from '../game/types';

/** Product wordmark is menu-only. The play strip never carries this. */
export const PLAY_HEADER_WORDMARK: null = null;

export interface FactionMark {
  code: FactionId;
  name: string;
}

export interface WeekWeatherChip {
  week: number;
  maxTurns: number;
  weatherId: GameState['weather'];
  weatherLabel: string;
  date: string;
  phase: GameState['phase'];
}

export type ResourceChipId = 'manpower' | 'equipment' | 'command';

export interface ResourceChip {
  id: ResourceChipId;
  icon: ResourceChipId;
  value: number;
  income: number;
  cap?: number;
}

export function factionMark(faction: FactionId): FactionMark {
  const meta = FACTION_META[faction];
  return { code: faction, name: meta.name };
}

export function weekWeatherChip(game: GameState): WeekWeatherChip {
  const weather = WEATHER_DEFS[game.weather];
  return {
    week: game.turn,
    maxTurns: game.scenario.maxTurns,
    weatherId: game.weather,
    weatherLabel: weather.label,
    date: formatTurnDate(game),
    phase: game.phase,
  };
}

export function resourceChips(game: GameState): ResourceChip[] {
  const f = game.factions[game.playerFaction];
  return [
    { id: 'manpower', icon: 'manpower', value: Math.floor(f.manpower), income: f.manpowerIncome },
    { id: 'equipment', icon: 'equipment', value: Math.floor(f.equipment), income: f.equipmentIncome },
    { id: 'command', icon: 'command', value: f.command, income: f.commandRegen, cap: f.commandMax },
  ];
}

export function resourceChipNow(chip: ResourceChip): string {
  if (chip.id === 'command' && chip.cap != null) {
    return `${chip.value} of ${chip.cap}; regenerates ${chip.income}.`;
  }
  return `${chip.value} in the depot; +${chip.income} next week.`;
}

export function weekChipNow(chip: WeekWeatherChip): string {
  return `Week ${chip.week} of ${chip.maxTurns} · ${chip.weatherLabel} · ${chip.date}.`;
}

export function headerHasProductWordmark(): boolean {
  return PLAY_HEADER_WORDMARK != null;
}
