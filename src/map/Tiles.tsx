// All land/water hexes rendered as a single InstancedMesh. Colours encode
// terrain, control tint, map mode and fog; geometry is static after mount.

import { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hashSeed } from '../game/rng';
import { useStore } from '../game/state/store';
import { TileId } from '../game/types';
import { HEX_SIZE, tileWorld } from '../game/hex';
import { tileColor } from './palette';

export const TILE_BASE_HEIGHT = 0.22;
export const TILE_ELEV_SCALE = 0.5;

export function tileTopY(elevation: number, terrain: string): number {
  if (terrain === 'water') return 0.06;
  return TILE_BASE_HEIGHT + elevation * TILE_ELEV_SCALE;
}

export function Tiles() {
  const game = useStore((s) => s.game);
  const mapMode = useStore((s) => s.mapMode);
  const selectTile = useStore((s) => s.selectTile);
  const hoverTile = useStore((s) => s.hoverTile);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Stable tile ordering for instance ids.
  const tileIds = useMemo(() => (game ? Object.keys(game.tiles).sort() : []), [game?.scenario.id]);

  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6);
    geo.rotateY(Math.PI / 6); // pointy-top orientation
    return geo;
  }, []);

  // Static transforms (heights never change during a campaign).
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !game) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const pos = new THREE.Vector3();
    tileIds.forEach((id, i) => {
      const tile = game.tiles[id];
      const { wx, wz } = tileWorld(tile.x, tile.y);
      const top = tileTopY(tile.elevation, tile.terrain);
      pos.set(wx, top / 2, wz);
      scl.set(HEX_SIZE * 0.985, top, HEX_SIZE * 0.985);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tileIds, game?.scenario.id]);

  // Colour baking: run when control, mode, visibility or supply changes.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !game) return;
    const color = new THREE.Color();
    const visible = new Set(game.visibleTiles);
    const snow = game.weather === 'snow';
    const playerLevels = game.supplyLevels[game.playerFaction];
    tileIds.forEach((id, i) => {
      const tile = game.tiles[id];
      tileColor(color, tile.terrain, tile.controller, {
        mode: mapMode,
        visible: visible.has(id),
        supplyLevel: playerLevels[id],
        isPlayerTile: tile.controller === game.playerFaction,
        snow,
        jitter: (hashSeed(`${id}|c`) % 1000) / 1000,
      });
      mesh.setColorAt(i, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [game?.tiles, game?.visibleTiles, game?.supplyLevels, game?.weather, mapMode, tileIds]);

  if (!game) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    selectTile(tileIds[e.instanceId] as TileId);
  };
  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId === undefined) return;
    hoverTile(tileIds[e.instanceId] as TileId);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, tileIds.length]}
      onClick={handleClick}
      onPointerMove={handleMove}
      onPointerOut={() => hoverTile(null)}
      receiveShadow
    >
      <meshStandardMaterial roughness={0.94} metalness={0.02} flatShading />
    </instancedMesh>
  );
}
