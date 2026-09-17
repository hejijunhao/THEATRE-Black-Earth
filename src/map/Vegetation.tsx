// Ground vegetation — the map-LOD counterpart of the terrainHero tile set.
// Blade-geometry tufts merged into one static draw call, placed per land hex
// from the same geodata the albedo painter uses: dry steppe clumps on plains,
// straw stubble rows where the crop fraction is high, wet-green tufts and
// reed clusters on marsh/wetland. Deterministic from tile coordinates
// (hashSeed, no Math.random()); hidden in the paper political mode with the
// rest of the 3D clutter; snow retints the whole layer like the forests.

import { useMemo } from 'react';
import * as THREE from 'three';
import { hashSeed } from '../game/rng';
import { useStore } from '../game/state/store';
import { tileWorld } from '../game/hex';
import { GeoBuilder, pushBlade } from '../assets/terrainHero';
import { SEA_LEVEL_Y, groundY, hexFracs } from './terrain/heightfield';
import { stripFrame } from './terrain/strips';

// Deterministic 0..1 per (tile, salt).
function rnd(id: string, salt: number): number {
  return (hashSeed(`${id}:veg:${salt}`) % 1000) / 1000;
}

interface TuftPalette {
  roots: string[];
  tips: string[];
}

// Colour families sit on the map's terrain albedo (palette.ts): dry-grass
// steppe, straw cropland, wetland green — muted, no lawn saturation.
const STEPPE: TuftPalette = {
  roots: ['#6f6845', '#665f3f', '#5d6140'],
  tips: ['#a2966a', '#998d5f', '#7d8155'],
};
const CROP: TuftPalette = {
  roots: ['#77693f', '#6e6039'],
  tips: ['#b3a065', '#a6935a'],
};
const MARSH: TuftPalette = {
  roots: ['#47513a', '#414b35'],
  tips: ['#6d7a52', '#64714a'],
};
const REED_ROOT = '#3d4a30';
const REED_TIP = '#5a6840';

const rootC = new THREE.Color();
const tipC = new THREE.Color();

// A clump of 3–4 blades sharing a base — single blades vanish at map
// distance, clumps read as ground cover.
function pushClump(
  b: GeoBuilder, id: string, salt: number,
  cx: number, cz: number, pal: TuftPalette,
  hMin: number, hMax: number, wBase: number,
): void {
  const gy = groundY(cx, cz);
  if (gy < SEA_LEVEL_Y + 0.05) return;
  const n = 3 + (hashSeed(`${id}:n:${salt}`) % 2);
  const ci = hashSeed(`${id}:c:${salt}`) % pal.roots.length;
  const jl = 0.82 + rnd(id, salt * 7 + 1) * 0.36;
  rootC.set(pal.roots[ci]).multiplyScalar(jl);
  tipC.set(pal.tips[Math.min(ci, pal.tips.length - 1)]).multiplyScalar(jl);
  for (let k = 0; k < n; k++) {
    const a = rnd(id, salt * 13 + k * 3) * Math.PI * 2;
    const r = rnd(id, salt * 13 + k * 3 + 1) * 0.045;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const H = hMin + (hMax - hMin) * rnd(id, salt * 13 + k * 3 + 2);
    const lean = H * (0.25 + rnd(id, salt * 17 + k) * 0.5);
    const yaw = rnd(id, salt * 19 + k) * Math.PI * 2;
    pushBlade(b, {
      x, z, ground: gy - 0.012, H, wBase,
      tipX: Math.cos(yaw) * lean, tipZ: Math.sin(yaw) * lean,
      root: rootC, tip: tipC, rough: 0.85, sway: 0,
    });
  }
}

// Exported so the layer's cost can be measured without a browser.
export function buildVegetation(tiles: {
  id: string; x: number; y: number; terrain: string;
}[]): THREE.BufferGeometry | null {
  const b = new GeoBuilder();

  for (const tile of tiles) {
    if (tile.terrain === 'water' || tile.terrain === 'urban' || tile.terrain === 'forest') continue;
    const { wx, wz } = tileWorld(tile.x, tile.y);
    const f = hexFracs(tile.x, tile.y);
    const marshy = tile.terrain === 'marsh' || f.wetland > 0.3;
    const cropland = !marshy && f.crop > 0.45;

    if (cropland) {
      // Stubble rows follow the painted strip frame so albedo, relief and
      // vegetation read as one cultivated parcel, not three competing grids.
      const frame = stripFrame(wx, wz);
      const dx = Math.sin(frame.theta);
      const dz = Math.cos(frame.theta);
      let salt = 20;
      for (const off of [-0.52, -0.26, 0, 0.26, 0.52]) {
        for (let k = -1.6; k <= 1.6; k++) {
          const along = k * 0.34 + (rnd(tile.id, salt) - 0.5) * 0.10;
          const cx = wx + dx * along - dz * off + (rnd(tile.id, salt + 1) - 0.5) * 0.05;
          const cz = wz + dz * along + dx * off + (rnd(tile.id, salt + 2) - 0.5) * 0.05;
          // Keep the tile centre clear — units stand there.
          if (Math.hypot(cx - wx, cz - wz) < 0.26) { salt += 3; continue; }
          pushClump(b, tile.id, salt, cx, cz, CROP, 0.07, 0.14, 0.024);
          salt += 3;
        }
      }
    } else if (marshy) {
      const n = 8 + (hashSeed(tile.id) % 3);
      for (let k = 0; k < n; k++) {
        const a = rnd(tile.id, 40 + k * 2) * Math.PI * 2;
        const r = 0.28 + rnd(tile.id, 41 + k * 2) * 0.5;
        pushClump(
          b, tile.id, 60 + k,
          wx + Math.cos(a) * r, wz + Math.sin(a) * r * 0.9,
          MARSH, 0.08, 0.15, 0.02,
        );
      }
      // A few taller reeds so wetland reads as reedbed, not just greener.
      rootC.set(REED_ROOT);
      tipC.set(REED_TIP);
      const reeds = 2 + (hashSeed(`${tile.id}:r`) % 2);
      for (let k = 0; k < reeds; k++) {
        const a = rnd(tile.id, 80 + k * 3) * Math.PI * 2;
        const r = 0.3 + rnd(tile.id, 81 + k * 3) * 0.45;
        const x = wx + Math.cos(a) * r;
        const z = wz + Math.sin(a) * r * 0.9;
        const gy = groundY(x, z);
        if (gy < SEA_LEVEL_Y + 0.04) continue;
        pushBlade(b, {
          x, z, ground: gy - 0.012,
          H: 0.18 + rnd(tile.id, 82 + k * 3) * 0.08, wBase: 0.014,
          tipX: (rnd(tile.id, 83 + k) - 0.5) * 0.05,
          tipZ: (rnd(tile.id, 84 + k) - 0.5) * 0.05,
          root: rootC, tip: tipC, rough: 0.85, sway: 0,
        });
      }
    } else {
      // Open steppe: sparse dry clumps, denser where some crop cover exists.
      const n = 6 + (hashSeed(tile.id) % 3) + Math.round(f.crop * 4);
      for (let k = 0; k < n; k++) {
        const a = rnd(tile.id, 100 + k * 2) * Math.PI * 2;
        const r = 0.28 + rnd(tile.id, 101 + k * 2) * 0.52;
        pushClump(
          b, tile.id, 120 + k,
          wx + Math.cos(a) * r, wz + Math.sin(a) * r * 0.9,
          STEPPE, 0.06, 0.115, 0.02,
        );
      }
    }
  }

  if (b.vertCount === 0) return null;
  const g = b.build();
  // Ground-cover lighting: tilt blade normals toward up so the layer shades
  // like a soft surface instead of a heap of facets (same trick as the hero
  // tiles, stronger here because blades are near-pixel at map distance).
  const norm = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < norm.count; i++) {
    const nx = norm.getX(i);
    const ny = norm.getY(i) + 1.6;
    const nz = norm.getZ(i);
    const len = Math.hypot(nx, ny, nz) || 1;
    norm.setXYZ(i, nx / len, ny / len, nz / len);
  }
  return g;
}

export function Vegetation() {
  const game = useStore((s) => s.game);
  const snow = game?.weather === 'snow';

  const geometry = useMemo(() => {
    if (!game) return null;
    return buildVegetation(Object.values(game.tiles));
  }, [game?.scenario.id]);

  if (!geometry) return null;
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.92}
        side={THREE.DoubleSide}
        color={snow ? '#a9b0a6' : '#ffffff'}
      />
    </mesh>
  );
}
