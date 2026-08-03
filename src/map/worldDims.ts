// World-space extent of the theatre, derived from the scenario grid so the
// render layer follows the map dimensions (v1 hardcoded 26×17).

import { HEX_H, HEX_W } from '../game/hex';
import { MAP_H, MAP_W } from '../game/scenarios/blackEarth2025';

export const WORLD_W = MAP_W * HEX_W;
export const WORLD_H = MAP_H * HEX_H;
