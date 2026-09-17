// Terrain decorations: forest cone clusters, urban block clusters, town
// markers, city label sprites and fortification rings. Everything is
// deterministic from tile coordinates (no per-frame randomness).

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hashSeed } from '../game/rng';
import { useStore } from '../game/state/store';
import { tileWorld, tileWorldById } from '../game/hex';
import {
  FOREST_EMIT_SOUTH, FOREST_NORTH, FOREST_SNOW, FOREST_SOUTH,
  forestStemCount, forestStemScale, northForestWeight,
} from './forestPaint';
import { makeLabelTexture } from './textures';
import { groundY, hexFracs, tileGroundY } from './terrain/heightfield';
import { WORLD_H } from './worldDims';

function jitter(x: number, y: number, salt: number): number {
  return ((hashSeed(`${x}:${y}:${salt}`) % 1000) / 1000 - 0.5);
}

export function Forests() {
  const game = useStore((s) => s.game);
  const snow = game?.weather === 'snow';

  const { geometry, count, matrices } = useMemo(() => {
    if (!game) return { geometry: null, count: 0, matrices: [] as THREE.Matrix4[] };
    const geometry = new THREE.ConeGeometry(0.16, 0.42, 6);
    const matrices: THREE.Matrix4[] = [];
    for (const tile of Object.values(game.tiles)) {
      const frac = hexFracs(tile.x, tile.y).forest;
      const isForest = tile.terrain === 'forest';
      // Shelter belts: sparse trees on partially wooded steppe hexes, so
      // partial cover reads as woodland rather than as albedo darkening.
      if (!isForest && (frac < 0.14 || tile.terrain === 'water')) continue;
      const { wx, wz } = tileWorld(tile.x, tile.y);
      // Density follows the geodata forest fraction, thinned on the far
      // north so rain AO cannot pile a charcoal band on the horizon.
      const n = forestStemCount(isForest, frac, wz, hashSeed(tile.id), WORLD_H);
      for (let k = 0; k < n; k++) {
        const dx = jitter(tile.x, tile.y, k * 3 + 1) * 1.15;
        const dz = jitter(tile.x, tile.y, k * 3 + 2) * 1.05;
        const s = forestStemScale(0.75 + (jitter(tile.x, tile.y, k * 3 + 3) + 0.5) * 0.6, wz, WORLD_H);
        const gy = groundY(wx + dx, wz + dz);
        const m = new THREE.Matrix4()
          .makeScale(s, s, s)
          .setPosition(wx + dx, gy + 0.2 * s, wz + dz);
        matrices.push(m);
      }
    }
    return { geometry, count: matrices.length, matrices };
  }, [game?.scenario.id]);

  const meshRef = useRef<THREE.InstancedMesh | null>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const col = new THREE.Color();
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      const wz = m.elements[14];
      const north = northForestWeight(wz, WORLD_H);
      if (snow) col.set(FOREST_SNOW);
      else col.set(FOREST_SOUTH).lerp(new THREE.Color(FOREST_NORTH), north);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices, count, snow]);

  if (!geometry || count === 0) return null;
  return (
    <instancedMesh
      args={[geometry, undefined, count]}
      ref={meshRef}
    >
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.9}
        flatShading
        emissive={snow ? FOREST_SNOW : FOREST_EMIT_SOUTH}
        emissiveIntensity={snow ? 0.18 : 0.34}
      />
    </instancedMesh>
  );
}

export function UrbanBlocks() {
  const game = useStore((s) => s.game);

  const { geometry, count, matrices } = useMemo(() => {
    if (!game) return { geometry: null, count: 0, matrices: [] as THREE.Matrix4[] };
    const geometry = new THREE.BoxGeometry(0.2, 0.22, 0.2);
    const matrices: THREE.Matrix4[] = [];
    for (const tile of Object.values(game.tiles)) {
      const isUrban = tile.terrain === 'urban';
      const isTown = !!tile.cityId && !isUrban;
      if (!isUrban && !isTown) continue;
      const { wx, wz } = tileWorld(tile.x, tile.y);
      const n = isUrban ? 6 : 2;
      for (let k = 0; k < n; k++) {
        const dx = jitter(tile.x, tile.y, k * 5 + 11) * 1.1;
        const dz = jitter(tile.x, tile.y, k * 5 + 12) * 1.0;
        const sy = 0.7 + (jitter(tile.x, tile.y, k * 5 + 13) + 0.5) * 1.6;
        const sxz = 0.7 + (jitter(tile.x, tile.y, k * 5 + 14) + 0.5) * 0.8;
        const gy = groundY(wx + dx, wz + dz);
        const m = new THREE.Matrix4()
          .makeScale(sxz, sy, sxz)
          .setPosition(wx + dx, gy + 0.11 * sy, wz + dz);
        matrices.push(m);
      }
    }
    return { geometry, count: matrices.length, matrices };
  }, [game?.scenario.id]);

  const meshRef = useMemo(() => ({ current: null as THREE.InstancedMesh | null }), []);

  if (!geometry || count === 0) return null;
  return (
    <instancedMesh
      args={[geometry, undefined, count]}
      ref={(mesh) => {
        if (mesh && meshRef.current !== mesh) {
          meshRef.current = mesh;
          matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
          mesh.instanceMatrix.needsUpdate = true;
        }
      }}
      castShadow
    >
      <meshStandardMaterial color="#7b7973" roughness={0.85} flatShading />
    </instancedMesh>
  );
}

function CityLabel({ cityId }: { cityId: string }) {
  const game = useStore((s) => s.game)!;
  const city = game.cities[cityId];
  const tile = game.tiles[city.tile];

  const { texture, aspect } = useMemo(
    () => makeLabelTexture(city.name, city.size, tile.controller),
    [city.name, city.size],
  );

  const { wx, wz } = tileWorldById(city.tile);
  const top = tileGroundY(city.tile);
  const scale = city.size === 'capital' ? 3.1 : city.size === 'major' ? 2.5 : 1.75;

  return (
    <sprite position={[wx, top + 1.2, wz]} scale={[scale * aspect * 0.32, scale * 0.32, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

export function CityMarkers() {
  const game = useStore((s) => s.game);
  const cityIds = useMemo(() => (game ? Object.keys(game.cities) : []), [game?.scenario.id]);
  if (!game) return null;
  return (
    <group>
      {cityIds.map((id) => (
        <CityLabel key={id} cityId={id} />
      ))}
    </group>
  );
}

// Fortification rings on fortified tiles (rebuilds when tiles change).
export function Fortifications() {
  const game = useStore((s) => s.game);

  const positions = useMemo(() => {
    if (!game) return [];
    return Object.values(game.tiles)
      .filter((t) => t.fortified)
      .map((t) => {
        const { wx, wz } = tileWorld(t.x, t.y);
        return { wx, wz, y: tileGroundY(t.id) + 0.05, id: t.id };
      });
  }, [game?.tiles]);

  const ringGeo = useMemo(() => {
    const g = new THREE.RingGeometry(0.62, 0.72, 6);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI / 6);
    return g;
  }, []);

  return (
    <group>
      {positions.map((p) => (
        <mesh key={p.id} geometry={ringGeo} position={[p.wx, p.y, p.wz]}>
          <meshBasicMaterial color="#8a7a55" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}
