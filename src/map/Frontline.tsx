// The frontline: a hatched scar along every edge separating UA and RU
// controlled land. Quiet seams stay thin; contact (a unit on either bank)
// densifies the hatch. Decorative — picks go through to TerrainMesh.

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { neighborIds, sharedEdge } from '../game/hex';
import { useStore } from '../game/state/store';
import {
  FRONT_COLOR,
  FRONT_CONTACT_HATCH,
  FRONT_GLOW_H,
  FRONT_GLOW_LIFT,
  FRONT_GLOW_W,
  FRONT_HATCH_H,
  FRONT_HATCH_LEN,
  FRONT_HATCH_LIFT,
  FRONT_HATCH_W,
  FRONT_OPACITY,
  FRONT_QUIET_HATCH,
  FRONT_SCAR_H,
  FRONT_SCAR_LEN,
  FRONT_SCAR_LIFT,
  FRONT_SCAR_W,
  TelegraphEdge,
  edgePairKey,
} from './boardTelegraph';
import { buildEdgeRibbon, buildSeamHatches } from './edgeRibbon';

function FrontMesh({
  geometry,
  color,
  opacity,
}: {
  geometry: THREE.BufferGeometry | null;
  color: string;
  opacity: number;
}) {
  useEffect(() => () => { geometry?.dispose(); }, [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} raycast={() => null}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

export function Frontline() {
  const game = useStore((s) => s.game);

  const layers = useMemo(() => {
    if (!game) return null;
    const occupied = new Set<string>();
    for (const u of Object.values(game.units)) {
      if (u.strength > 0) occupied.add(u.tile);
    }
    const quiet: TelegraphEdge[] = [];
    const contact: TelegraphEdge[] = [];
    const seen = new Set<string>();
    for (const tile of Object.values(game.tiles)) {
      if (tile.controller === null) continue;
      for (const nId of neighborIds(tile.id)) {
        const n = game.tiles[nId];
        if (!n || n.controller === null) continue;
        if (n.controller === tile.controller) continue;
        const key = edgePairKey(tile.id, nId);
        if (seen.has(key)) continue;
        seen.add(key);
        const edge = sharedEdge(tile.id, nId);
        if (!edge) continue;
        const seg: TelegraphEdge = { ...edge, inside: tile.id, outside: nId };
        if (occupied.has(tile.id) || occupied.has(nId)) contact.push(seg);
        else quiet.push(seg);
      }
    }
    const ribbon = (edges: TelegraphEdge[], width: number, height: number, lift: number) =>
      buildEdgeRibbon(edges, { len: FRONT_SCAR_LEN, height, width, lift });
    const hatch = (edges: TelegraphEdge[], ts: readonly number[]) =>
      buildSeamHatches(edges, ts, {
        len: FRONT_HATCH_LEN,
        height: FRONT_HATCH_H,
        width: FRONT_HATCH_W,
        lift: FRONT_HATCH_LIFT,
      });
    return {
      glowQuiet: ribbon(quiet, FRONT_GLOW_W, FRONT_GLOW_H, FRONT_GLOW_LIFT),
      glowContact: ribbon(contact, FRONT_GLOW_W, FRONT_GLOW_H, FRONT_GLOW_LIFT),
      scarQuiet: ribbon(quiet, FRONT_SCAR_W, FRONT_SCAR_H, FRONT_SCAR_LIFT),
      scarContact: ribbon(contact, FRONT_SCAR_W, FRONT_SCAR_H, FRONT_SCAR_LIFT),
      hatchQuiet: hatch(quiet, FRONT_QUIET_HATCH),
      hatchContact: hatch(contact, FRONT_CONTACT_HATCH),
    };
  }, [game?.tiles, game?.units]);

  if (!layers) return null;
  return (
    <group>
      <FrontMesh geometry={layers.glowQuiet} color={FRONT_COLOR.glowQuiet} opacity={FRONT_OPACITY.glowQuiet} />
      <FrontMesh geometry={layers.glowContact} color={FRONT_COLOR.glowContact} opacity={FRONT_OPACITY.glowContact} />
      <FrontMesh geometry={layers.scarQuiet} color={FRONT_COLOR.scarQuiet} opacity={FRONT_OPACITY.scarQuiet} />
      <FrontMesh geometry={layers.scarContact} color={FRONT_COLOR.scarContact} opacity={FRONT_OPACITY.scarContact} />
      <FrontMesh geometry={layers.hatchQuiet} color={FRONT_COLOR.hatchQuiet} opacity={FRONT_OPACITY.hatchQuiet} />
      <FrontMesh geometry={layers.hatchContact} color={FRONT_COLOR.hatchContact} opacity={FRONT_OPACITY.hatchContact} />
    </group>
  );
}
