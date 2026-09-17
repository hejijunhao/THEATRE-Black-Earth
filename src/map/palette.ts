// Map colour system. Restrained palette: black earth, dry grass, muted
// greens, slate, concrete. Faction tints are mixed into terrain colours
// rather than painted over them.

import * as THREE from 'three';
import { FactionId, TerrainType, WeatherType } from '../game/types';

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  plains: '#8f875f',
  forest: '#55663f',
  urban: '#75736e',
  marsh: '#6d7a5c',
  water: '#39485a',
};

export const FACTION_TINT: Record<FactionId, string> = {
  UA: '#41628f',
  RU: '#7a3b32',
};

export const FACTION_STRONG: Record<FactionId, string> = {
  UA: '#5b83b8',
  RU: '#a05243',
};

export const WEATHER_ENV: Record<WeatherType, { sky: string; fog: string; sun: number; ambient: number; fogDensity: number }> = {
  // Air over soil, one place. Fog is warm earth-haze at low density so the
  // north does not drop into a dark-grey veil under rain or mud.
  clear:    { sky: '#c8d4c4', fog: '#c6be9e', sun: 1.72, ambient: 0.58, fogDensity: 0.0014 },
  overcast: { sky: '#a8a890', fog: '#b4aa8c', sun: 1.16, ambient: 0.62, fogDensity: 0.0018 },
  rain:     { sky: '#8e8c78', fog: '#9a9078', sun: 0.92, ambient: 0.6, fogDensity: 0.0022 },
  mud:      { sky: '#a4987c', fog: '#a89a7c', sun: 1.1, ambient: 0.6, fogDensity: 0.0018 },
  snow:     { sky: '#c4ccd0', fog: '#d0d2c8', sun: 1.2, ambient: 0.66, fogDensity: 0.002 },
};

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

// Compute a tile's rendered colour for the current map mode.
export function tileColor(
  out: THREE.Color,
  terrain: TerrainType,
  controller: FactionId | null,
  opts: {
    mode: 'political' | 'supply' | 'terrain' | 'objectives' | 'intel';
    visible: boolean;
    supplyLevel?: number;      // for supply mode (player faction network)
    isPlayerTile?: boolean;
    snow?: boolean;
    jitter?: number;           // 0..1 per-tile variation
  },
): THREE.Color {
  out.set(TERRAIN_COLORS[terrain]);

  // Subtle per-tile variation so fields read as textured, not flat.
  const j = (opts.jitter ?? 0.5) - 0.5;
  out.offsetHSL(0, j * 0.04, j * 0.05);

  if (opts.snow && terrain !== 'water') {
    tmpA.set('#c3c8cc');
    out.lerp(tmpA, terrain === 'forest' ? 0.35 : 0.55);
  }

  if (terrain === 'water') return out;

  switch (opts.mode) {
    case 'political':
      if (controller) {
        tmpA.set(FACTION_TINT[controller]);
        out.lerp(tmpA, 0.28);
      }
      break;
    case 'terrain':
      break;
    case 'supply': {
      if (controller) {
        tmpA.set(FACTION_TINT[controller]);
        out.lerp(tmpA, 0.1);
      }
      if (opts.isPlayerTile) {
        const level = opts.supplyLevel ?? 0;
        if (level <= 0) {
          tmpA.set('#7d2f2f');
          out.lerp(tmpA, 0.55);
        } else {
          const t = Math.min(level / 12, 1);
          tmpA.set('#274a33');
          tmpB.set('#7fae7a');
          tmpA.lerp(tmpB, t);
          out.lerp(tmpA, 0.5);
        }
      } else {
        out.multiplyScalar(0.75);
      }
      break;
    }
    case 'objectives':
      if (controller) {
        tmpA.set(FACTION_TINT[controller]);
        out.lerp(tmpA, 0.16);
      }
      out.multiplyScalar(0.82);
      break;
    case 'intel':
      if (controller) {
        tmpA.set(FACTION_TINT[controller]);
        out.lerp(tmpA, 0.2);
      }
      if (!opts.visible) out.multiplyScalar(0.5);
      else out.multiplyScalar(1.05);
      break;
  }

  // Fog of war mainly hides enemy formations, not terrain: only a gentle
  // dimming outside observation in normal modes (intel mode is explicit).
  if (!opts.visible && opts.mode !== 'intel') {
    out.multiplyScalar(0.88);
  }
  return out;
}
