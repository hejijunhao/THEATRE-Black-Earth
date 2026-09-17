// Interactive overlays: selection ring, movement range, attack targets,
// operation/deploy targeting, hover highlight and objective markers.
// Decorative meshes stay click-through — picks hit TerrainMesh.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { attackableTargets, useStore } from '../game/state/store';
import { reachableTiles } from '../game/rules/movement';
import { validateOpTarget } from '../game/rules/ops';
import { validDeployTiles } from '../game/rules/turn';
import { OPERATION_DEFS } from '../game/data/defs';
import { tileWorldById } from '../game/hex';
import { TileId } from '../game/types';
import {
  classifyReach,
  perimeterEdges,
  REACH_EDGE,
  REACH_EDGE_H,
  REACH_EDGE_LEN,
  REACH_EDGE_LIFT,
  REACH_EDGE_OPACITY,
  REACH_EDGE_W,
  REACH_FILL,
  REACH_FILL_RADIUS,
  ReachKind,
  reachFillOpacity,
  TelegraphEdge,
} from './boardTelegraph';
import { buildEdgeRibbon } from './edgeRibbon';
import { tileGroundY } from './terrain/heightfield';

function useHexShapes() {
  return useMemo(() => {
    const fill = new THREE.CircleGeometry(REACH_FILL_RADIUS, 6);
    fill.rotateZ(Math.PI / 6);
    fill.rotateX(-Math.PI / 2);
    const disc = new THREE.CircleGeometry(0.9, 6);
    disc.rotateZ(Math.PI / 6);
    disc.rotateX(-Math.PI / 2);
    const ring = new THREE.RingGeometry(0.8, 0.91, 6);
    ring.rotateZ(Math.PI / 6);
    ring.rotateX(-Math.PI / 2);
    const attack = new THREE.RingGeometry(0.76, 0.88, 6);
    attack.rotateZ(Math.PI / 6);
    attack.rotateX(-Math.PI / 2);
    return { fill, disc, ring, attack };
  }, []);
}

function tileY(_gameTiles: Record<string, { elevation: number; terrain: string }>, id: string): number {
  return tileGroundY(id) + 0.04;
}

function ContestedPulse({
  tile,
  geometry,
}: {
  tile: string;
  geometry: THREE.BufferGeometry;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const { wx, wz } = tileWorldById(tile);
  const y = tileGroundY(tile) + 0.055;
  useFrame(({ clock }) => {
    if (mat.current) {
      mat.current.opacity = 0.42 + Math.sin(clock.elapsedTime * 3.2) * 0.16;
    }
  });
  return (
    <mesh geometry={geometry} position={[wx, y, wz]} raycast={() => null}>
      <meshBasicMaterial ref={mat} color="#d8c48a" transparent opacity={0.45} depthWrite={false} />
    </mesh>
  );
}

function ReachSeam({
  edges,
  color,
  opacity,
}: {
  edges: TelegraphEdge[];
  color: string;
  opacity: number;
}) {
  const geo = useMemo(
    () =>
      buildEdgeRibbon(edges, {
        len: REACH_EDGE_LEN,
        height: REACH_EDGE_H,
        width: REACH_EDGE_W,
        lift: REACH_EDGE_LIFT,
      }),
    [edges],
  );
  useEffect(() => () => { geo?.dispose(); }, [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} raycast={() => null}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

export function Overlays() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const selectedTileId = useStore((s) => s.selectedTileId);
  const hoveredTileId = useStore((s) => s.hoveredTileId);
  const interactionMode = useStore((s) => s.interactionMode);
  const pendingOp = useStore((s) => s.pendingOp);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const lastCombat = useStore((s) => s.lastCombat);
  const mapMode = useStore((s) => s.mapMode);
  const { fill, disc, ring, attack } = useHexShapes();

  const selectedUnit = game && selectedUnitId ? game.units[selectedUnitId] : null;

  const wash = useMemo(() => {
    if (!game || !selectedUnit || game.phase !== 'player') return null;
    const reach = reachableTiles(game, selectedUnit);
    if (reach.size === 0) return null;
    const interior = new Set<TileId>([selectedUnit.tile, ...reach.keys()]);
    const fills = [...reach.values()].map((r) => {
      const enemyGround = game.tiles[r.id].controller !== game.playerFaction;
      const kind = classifyReach(r.entersZOC, enemyGround);
      return {
        id: r.id,
        kind,
        opacity: reachFillOpacity(kind, r.cost, selectedUnit.movement),
      };
    });
    fills.push({
      id: selectedUnit.tile,
      kind: 'open',
      opacity: reachFillOpacity('open', 0, selectedUnit.movement),
    });
    const kindOf = (id: TileId): ReachKind => {
      if (id === selectedUnit.tile) return 'open';
      const r = reach.get(id);
      if (!r) return 'open';
      return classifyReach(r.entersZOC, game.tiles[id].controller !== game.playerFaction);
    };
    const seams: Record<ReachKind, TelegraphEdge[]> = { open: [], enemy: [], zoc: [] };
    for (const e of perimeterEdges(interior)) {
      seams[kindOf(e.inside)].push(e);
    }
    return { fills, seams };
  }, [game, selectedUnit]);

  const targets = useMemo(() => {
    if (!game || !selectedUnit || game.phase !== 'player') return [];
    return attackableTargets(game, selectedUnit);
  }, [game, selectedUnit]);

  const opTargets = useMemo(() => {
    if (!game || interactionMode !== 'op-target' || !pendingOp) return [];
    const def = OPERATION_DEFS[pendingOp];
    const out: string[] = [];
    if (def.target === 'friendly-unit') {
      for (const u of Object.values(game.units)) {
        if (u.faction === game.playerFaction) {
          if (validateOpTarget(game, game.playerFaction, pendingOp, u.tile).ok) out.push(u.tile);
        }
      }
    } else if (def.target === 'enemy-tile') {
      const visible = new Set(game.visibleTiles);
      for (const u of Object.values(game.units)) {
        if (u.faction !== game.playerFaction && visible.has(u.tile)) out.push(u.tile);
      }
    }
    return out;
  }, [game, interactionMode, pendingOp]);

  const deployTiles = useMemo(() => {
    if (!game || interactionMode !== 'deploy') return [];
    return validDeployTiles(game, game.playerFaction);
  }, [game, interactionMode]);

  const objectiveMarkers = useMemo(() => {
    if (!game || mapMode !== 'objectives') return [];
    return Object.values(game.cities).filter((c) => c.vp > 0);
  }, [game, mapMode]);

  if (!game) return null;
  const tiles = game.tiles;
  const contested = pendingAttackId && game.units[pendingAttackId]
    ? game.units[pendingAttackId].tile
    : lastCombat?.tile;

  return (
    <group>
      {/* Reach wash — soil stain leads; silhouette is the outer seam only.
          No per-hex rings. Clicks go through to the pick plane. */}
      {wash &&
        wash.fills.map((r) => {
          if (r.opacity <= 0.004 || r.kind === 'zoc') return null;
          const { wx, wz } = tileWorldById(r.id);
          return (
            <mesh key={`reach-${r.id}`} geometry={fill} position={[wx, tileY(tiles, r.id) + 0.02, wz]} raycast={() => null}>
              <meshBasicMaterial
                color={r.kind === 'enemy' ? REACH_FILL.enemy : REACH_FILL.open}
                transparent
                opacity={r.opacity}
                depthWrite={false}
                depthTest={false}
              />
            </mesh>
          );
        })}
      {wash && (
        <>
          <ReachSeam edges={wash.seams.open} color={REACH_EDGE.open} opacity={REACH_EDGE_OPACITY.open} />
          <ReachSeam edges={wash.seams.enemy} color={REACH_EDGE.enemy} opacity={REACH_EDGE_OPACITY.enemy} />
          <ReachSeam edges={wash.seams.zoc} color={REACH_EDGE.zoc} opacity={REACH_EDGE_OPACITY.zoc} />
        </>
      )}

      {/* Attack targets */}
      {targets.map((t) => {
        const { wx, wz } = tileWorldById(t.tile);
        const isPending = pendingAttackId === t.id;
        return (
          <mesh key={`target-${t.id}`} geometry={attack} position={[wx, tileY(tiles, t.tile) + 0.012, wz]} raycast={() => null}>
            <meshBasicMaterial
              color={isPending ? '#e06c4f' : '#a8543f'}
              transparent
              opacity={isPending ? 0.92 : 0.62}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* Operation targeting */}
      {opTargets.map((id) => {
        const { wx, wz } = tileWorldById(id);
        return (
          <mesh key={`op-${id}`} geometry={ring} position={[wx, tileY(tiles, id) + 0.01, wz]} raycast={() => null}>
            <meshBasicMaterial color="#9db8d8" transparent opacity={0.8} depthWrite={false} />
          </mesh>
        );
      })}

      {/* Deploy targeting */}
      {deployTiles.map((id) => {
        const { wx, wz } = tileWorldById(id);
        return (
          <mesh key={`dep-${id}`} geometry={disc} position={[wx, tileY(tiles, id) + 0.01, wz]} raycast={() => null}>
            <meshBasicMaterial color="#8fae72" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        );
      })}

      {contested && tiles[contested] && (
        <ContestedPulse tile={contested} geometry={attack} />
      )}

      {/* Selection — hex chinagraph, not a fill. */}
      {selectedTileId && tiles[selectedTileId] && (
        <mesh geometry={ring} position={(() => {
          const { wx, wz } = tileWorldById(selectedTileId);
          return [wx, tileY(tiles, selectedTileId) + 0.02, wz];
        })()} raycast={() => null}>
          <meshBasicMaterial color="#efe8d4" transparent opacity={0.88} depthWrite={false} />
        </mesh>
      )}

      {/* Hover */}
      {hoveredTileId && tiles[hoveredTileId] && hoveredTileId !== selectedTileId && (
        <mesh geometry={ring} position={(() => {
          const { wx, wz } = tileWorldById(hoveredTileId);
          return [wx, tileY(tiles, hoveredTileId) + 0.015, wz];
        })()} raycast={() => null}>
          <meshBasicMaterial color="#c8c2b0" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}

      {/* Objective markers (objectives map mode) */}
      {objectiveMarkers.map((c) => {
        const { wx, wz } = tileWorldById(c.tile);
        const y = tileY(tiles, c.tile);
        const decisive = c.decisiveFor === game.playerFaction;
        const scale = 0.22 + Math.min(c.vp, 25) * 0.012;
        return (
          <mesh
            key={`obj-${c.id}`}
            position={[wx, y + 0.75, wz]}
            rotation={[Math.PI / 4, 0, Math.PI / 4]}
            scale={[scale, scale, scale]}
            raycast={() => null}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={decisive ? '#c9a352' : '#b8b2a0'}
              emissive={decisive ? '#7a5c1e' : '#3a3830'}
              emissiveIntensity={0.6}
              roughness={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}
