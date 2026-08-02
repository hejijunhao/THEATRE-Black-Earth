// Roads and rail: line segments between adjacent infrastructure tiles,
// draped slightly above the terrain.

import { useMemo } from 'react';
import * as THREE from 'three';
import { neighborIds, tileWorldById } from '../game/hex';
import { useStore } from '../game/state/store';
import { tileTopY } from './Tiles';

function buildSegments(
  game: NonNullable<ReturnType<typeof useStore.getState>['game']>,
  predicate: (id: string) => boolean,
): Float32Array {
  const points: number[] = [];
  const seen = new Set<string>();
  for (const tile of Object.values(game.tiles)) {
    if (!predicate(tile.id)) continue;
    for (const nId of neighborIds(tile.id)) {
      const n = game.tiles[nId];
      if (!n || !predicate(nId)) continue;
      const key = tile.id < nId ? `${tile.id}|${nId}` : `${nId}|${tile.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const a = tileWorldById(tile.id);
      const b = tileWorldById(nId);
      const ya = tileTopY(tile.elevation, tile.terrain) + 0.025;
      const yb = tileTopY(n.elevation, n.terrain) + 0.025;
      points.push(a.wx, ya, a.wz, b.wx, yb, b.wz);
    }
  }
  return new Float32Array(points);
}

export function Roads() {
  const game = useStore((s) => s.game);

  const { roadGeo, railGeo } = useMemo(() => {
    if (!game) return { roadGeo: null, railGeo: null };
    const roads = buildSegments(game, (id) => game.tiles[id].road && !game.tiles[id].rail);
    const rails = buildSegments(game, (id) => game.tiles[id].rail);
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.BufferAttribute(roads, 3));
    const railGeo = new THREE.BufferGeometry();
    railGeo.setAttribute('position', new THREE.BufferAttribute(rails, 3));
    return { roadGeo, railGeo };
  }, [game?.scenario.id]);

  if (!roadGeo || !railGeo) return null;
  return (
    <group>
      <lineSegments geometry={roadGeo}>
        <lineBasicMaterial color="#5d5647" transparent opacity={0.85} />
      </lineSegments>
      <lineSegments geometry={railGeo}>
        <lineBasicMaterial color="#3f3a33" transparent opacity={0.95} />
      </lineSegments>
    </group>
  );
}
