// The frontline: a raised dark ribbon along every edge separating UA and RU
// controlled land. Rebuilt whenever territorial control changes.

import { useMemo } from 'react';
import * as THREE from 'three';
import { neighborIds, sharedEdge, HEX_SIZE } from '../game/hex';
import { useStore } from '../game/state/store';
import { mergeGeometries } from './Rivers';
import { tileTopY } from './Tiles';

export function Frontline() {
  const game = useStore((s) => s.game);

  const geo = useMemo(() => {
    if (!game) return null;
    const boxes: THREE.BufferGeometry[] = [];
    const seen = new Set<string>();
    for (const tile of Object.values(game.tiles)) {
      if (tile.controller === null) continue;
      for (const nId of neighborIds(tile.id)) {
        const n = game.tiles[nId];
        if (!n || n.controller === null) continue;
        if (n.controller === tile.controller) continue;
        const key = tile.id < nId ? `${tile.id}|${nId}` : `${nId}|${tile.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const edge = sharedEdge(tile.id, nId);
        if (!edge) continue;
        const h = Math.max(
          tileTopY(tile.elevation, tile.terrain),
          tileTopY(n.elevation, n.terrain),
        ) + 0.03;
        const len = HEX_SIZE * 1.18;
        const seg = new THREE.BoxGeometry(len, 0.07, 0.09);
        const angle = Math.atan2(edge.ez, edge.ex);
        const m = new THREE.Matrix4().makeRotationY(-angle).setPosition(edge.mx, h, edge.mz);
        seg.applyMatrix4(m);
        boxes.push(seg);
      }
    }
    return mergeGeometries(boxes);
  }, [game?.tiles]);

  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#1d1a16" roughness={0.6} emissive="#33251a" emissiveIntensity={0.35} />
    </mesh>
  );
}
