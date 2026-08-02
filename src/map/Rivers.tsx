// Rivers rendered as flat ribbons along shared hex edges; bridges as small
// crossing decks. Static for the whole campaign.

import { useMemo } from 'react';
import * as THREE from 'three';
import { sharedEdge, HEX_SIZE } from '../game/hex';
import { useStore } from '../game/state/store';
import { tileTopY } from './Tiles';

export function Rivers() {
  const game = useStore((s) => s.game);

  const { riverGeo, bridgeGeo } = useMemo(() => {
    if (!game) return { riverGeo: null, bridgeGeo: null };

    const riverBoxes: THREE.BufferGeometry[] = [];
    const bridgeBoxes: THREE.BufferGeometry[] = [];

    const edgeHeight = (aId: string, bId: string) => {
      const a = game.tiles[aId];
      const b = game.tiles[bId];
      return Math.max(
        tileTopY(a?.elevation ?? 0, a?.terrain ?? 'plains'),
        tileTopY(b?.elevation ?? 0, b?.terrain ?? 'plains'),
      );
    };

    for (const key of game.riverEdges) {
      const [aId, bId] = key.split('|');
      const edge = sharedEdge(aId, bId);
      if (!edge) continue;
      const h = edgeHeight(aId, bId) + 0.015;
      const len = HEX_SIZE * 1.24; // slight overlap so segments connect visually
      const geo = new THREE.BoxGeometry(len, 0.03, 0.3);
      const angle = Math.atan2(edge.ez, edge.ex);
      const m = new THREE.Matrix4()
        .makeRotationY(-angle)
        .setPosition(edge.mx, h, edge.mz);
      geo.applyMatrix4(m);
      riverBoxes.push(geo);

      if (game.bridgeEdges.includes(key)) {
        const deck = new THREE.BoxGeometry(0.5, 0.05, 0.16);
        const dm = new THREE.Matrix4()
          .makeRotationY(-angle + Math.PI / 2)
          .setPosition(edge.mx, h + 0.03, edge.mz);
        deck.applyMatrix4(dm);
        bridgeBoxes.push(deck);
      }
    }

    return {
      riverGeo: mergeGeometries(riverBoxes),
      bridgeGeo: mergeGeometries(bridgeBoxes),
    };
  }, [game?.scenario.id]);

  if (!riverGeo) return null;
  return (
    <group>
      <mesh geometry={riverGeo}>
        <meshStandardMaterial color="#41586e" roughness={0.35} metalness={0.1} />
      </mesh>
      {bridgeGeo && (
        <mesh geometry={bridgeGeo}>
          <meshStandardMaterial color="#6d6252" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

// Minimal geometry merge (positions/normals/uv) to avoid importing examples.
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;
  let totalVerts = 0;
  let totalIndex = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIndex += g.index ? g.index.count : 0;
  }
  const merged = new THREE.BufferGeometry();
  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const idx = new Uint32Array(totalIndex);
  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    pos.set(p.array as Float32Array, vOff * 3);
    norm.set(n.array as Float32Array, vOff * 3);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        idx[iOff + i] = g.index.array[i] + vOff;
      }
      iOff += g.index.count;
    }
    vOff += p.count;
  }
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  return merged;
}

export { mergeGeometries };
