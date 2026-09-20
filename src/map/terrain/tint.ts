// The dynamic per-hex tint texture: control wash, fog dimming, map-mode
// recolouring and the off-map fade, packed as RGBA (rgb = tint colour,
// a = blend strength). Updated whenever control / visibility / supply / mode
// changes — the same cadence as v1's instance-colour baking.

import * as THREE from 'three';
import { MAP_H, MAP_W } from '../../game/scenarios/blackEarth2025';
import { neighborCoords } from '../../game/hex';
import { GameState, TileId } from '../../game/types';
import { FACTION_TINT } from '../palette';

export type MapMode = 'political' | 'supply' | 'terrain' | 'objectives' | 'intel';

const UA = new THREE.Color(FACTION_TINT.UA);
const RU = new THREE.Color(FACTION_TINT.RU);
// Off-map fade colour: LIGHT haze (mist over the unmodeled beyond), never
// dark — darkness reads as ocean at map scale.
const FOG_FAR = new THREE.Color('#b4ae94');
const SUPPLY_CUT = new THREE.Color('#7d2f2f');
const SUPPLY_LOW = new THREE.Color('#274a33');
const SUPPLY_GOOD = new THREE.Color('#7fae7a');
const OBJECTIVE_GRAY = new THREE.Color('#787672');
const INTEL_FROST = new THREE.Color('#46525e');

// Distance (in hexes) from each cell to the nearest on-map cell; 0 for
// playable cells. Computed once per scenario for the off-map fade.
let offMapDepth: Uint8Array | null = null;
function computeOffMapDepth(state: GameState): Uint8Array {
  if (offMapDepth) return offMapDepth;
  const depth = new Uint8Array(MAP_W * MAP_H).fill(255);
  const queue: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (state.tiles[`${x},${y}` as TileId]) {
        depth[y * MAP_W + x] = 0;
        queue.push({ x, y });
      }
    }
  }
  let head = 0;
  while (head < queue.length) {
    const { x, y } = queue[head++];
    const d = depth[y * MAP_W + x];
    for (const nb of neighborCoords(x, y)) {
      if (nb.x < 0 || nb.x >= MAP_W || nb.y < 0 || nb.y >= MAP_H) continue;
      const i = nb.y * MAP_W + nb.x;
      if (depth[i] > d + 1) {
        depth[i] = d + 1;
        queue.push(nb);
      }
    }
  }
  offMapDepth = depth;
  return depth;
}

export function makeTintTexture(): THREE.DataTexture {
  const data = new Uint8Array(MAP_W * MAP_H * 4);
  const tex = new THREE.DataTexture(data, MAP_W, MAP_H, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  // We write sRGB colour bytes; without this they'd be read as linear and
  // wash brightness would drift from the palette.
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const tmp = new THREE.Color();
const tmpOut = new THREE.Color();

export function updateTintTexture(
  tex: THREE.DataTexture,
  state: GameState,
  mode: MapMode,
): void {
  const data = tex.image.data as Uint8Array;
  const depth = computeOffMapDepth(state);
  const visible = new Set(state.visibleTiles);
  const playerLevels = state.supplyLevels[state.playerFaction];

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = (y * MAP_W + x) * 4;
      const id = `${x},${y}` as TileId;
      const tile = state.tiles[id];

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      if (!tile) {
        // Off-map: fade into a light haze over the unmodeled beyond.
        const d = depth[y * MAP_W + x];
        tmp.copy(FOG_FAR);
        r = tmp.r;
        g = tmp.g;
        b = tmp.b;
        a = Math.min(0.92, 0.5 + d * 0.14);
      } else {
        const ctl = tile.controller;
        const isVisible = visible.has(id);
        switch (mode) {
          case 'political':
            if (ctl) {
              // Desaturated wash — colour is information, not paint (§1.4).
              tmp.copy(ctl === 'UA' ? UA : RU).lerp(new THREE.Color('#8a8578'), 0.3);
              a = 0.18;
            }
            break;
          case 'terrain':
            a = 0;
            break;
          case 'supply': {
            if (tile.controller === state.playerFaction) {
              const level = playerLevels[id] ?? 0;
              if (level <= 0) {
                tmp.copy(SUPPLY_CUT);
                a = 0.55;
              } else {
                tmp.copy(SUPPLY_LOW).lerp(SUPPLY_GOOD, Math.min(level / 12, 1));
                a = 0.48;
              }
            } else {
              tmp.copy(FOG_FAR);
              a = 0.42;
            }
            break;
          }
          case 'objectives':
            tmp.copy(OBJECTIVE_GRAY);
            if (ctl) tmp.lerp(ctl === 'UA' ? UA : RU, 0.25);
            a = 0.5;
            break;
          case 'intel':
            if (!isVisible) {
              tmp.copy(INTEL_FROST);
              a = 0.5;
            } else if (ctl) {
              tmp.copy(ctl === 'UA' ? UA : RU);
              a = 0.14;
            }
            break;
        }
        // Gentle fog dimming outside observation in normal modes — warm dark,
        // never blue (blue reads as water at map scale). The political map is
        // a printed document: it shows control, not observation, so no fog.
        if (!isVisible && mode !== 'intel' && mode !== 'political' && tile.terrain !== 'water') {
          if (a === 0) {
            tmp.set('#4a463c');
            a = 0.07;
          } else {
            tmp.lerp(new THREE.Color('#4a463c'), 0.15);
            a = Math.min(1, a + 0.03);
          }
        }
        if (a > 0) {
          r = tmp.r;
          g = tmp.g;
          b = tmp.b;
        }
      }

      // THREE.Color stores linear floats; the texture is tagged sRGB, so
      // convert back before writing bytes or the GPU decode double-darkens
      // every wash.
      tmpOut.setRGB(r, g, b).convertLinearToSRGB();
      data[i] = Math.round(tmpOut.r * 255);
      data[i + 1] = Math.round(tmpOut.g * 255);
      data[i + 2] = Math.round(tmpOut.b * 255);
      data[i + 3] = Math.round(a * 255);
    }
  }
  tex.needsUpdate = true;
}
