// Interactive overlays: selection ring, movement range, attack targets,
// operation/deploy targeting, hover highlight and objective markers.

import { useMemo } from 'react';
import * as THREE from 'three';
import { attackableTargets, useStore } from '../game/state/store';
import { reachableTiles } from '../game/rules/movement';
import { validateOpTarget } from '../game/rules/ops';
import { validDeployTiles } from '../game/rules/turn';
import { OPERATION_DEFS } from '../game/data/defs';
import { tileWorldById } from '../game/hex';
import { threatenedIds } from '../ui/boardChrome';
import { tileGroundY } from './terrain/heightfield';

function useHexShapes() {
  return useMemo(() => {
    const disc = new THREE.CircleGeometry(0.9, 6);
    disc.rotateZ(Math.PI / 6);
    disc.rotateX(-Math.PI / 2);
    const ring = new THREE.RingGeometry(0.74, 0.9, 6);
    ring.rotateZ(Math.PI / 6);
    ring.rotateX(-Math.PI / 2);
    return { disc, ring };
  }, []);
}

function tileY(_gameTiles: Record<string, { elevation: number; terrain: string }>, id: string): number {
  return tileGroundY(id) + 0.045;
}

export function Overlays() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  const selectedTileId = useStore((s) => s.selectedTileId);
  const hoveredTileId = useStore((s) => s.hoveredTileId);
  const interactionMode = useStore((s) => s.interactionMode);
  const pendingOp = useStore((s) => s.pendingOp);
  const pendingAttackId = useStore((s) => s.pendingAttackId);
  const mapMode = useStore((s) => s.mapMode);
  const { disc, ring } = useHexShapes();

  const selectedUnit = game && selectedUnitId ? game.units[selectedUnitId] : null;

  const reach = useMemo(() => {
    if (!game || !selectedUnit || game.phase !== 'player') return null;
    return reachableTiles(game, selectedUnit);
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

  return (
    <group>
      {/* Movement range */}
      {reach &&
        [...reach.values()].map((r) => {
          const { wx, wz } = tileWorldById(r.id);
          const enemyGround = tiles[r.id].controller !== game.playerFaction;
          return (
            <mesh key={`reach-${r.id}`} geometry={disc} position={[wx, tileY(tiles, r.id), wz]}>
              <meshBasicMaterial
                color={r.entersZOC ? '#c9a352' : enemyGround ? '#b08b5a' : '#c6c0ab'}
                transparent
                opacity={r.entersZOC ? 0.34 : 0.24}
                depthWrite={false}
              />
            </mesh>
          );
        })}

      {/* Threatened hex wash — parchment on the ground, not a ring twin. */}
      {selectedUnit && game.phase === 'player' &&
        [...threatenedIds(game, selectedUnitId)].map((id) => {
          const unit = game.units[id];
          if (!unit) return null;
          const { wx, wz } = tileWorldById(unit.tile);
          return (
            <mesh key={`threat-${id}`} geometry={disc} position={[wx, tileY(tiles, unit.tile), wz]}>
              <meshBasicMaterial color="#efe6d0" transparent opacity={0.22} depthWrite={false} />
            </mesh>
          );
        })}

      {/* Attack targets */}
      {targets.map((t) => {
        const { wx, wz } = tileWorldById(t.tile);
        const isPending = pendingAttackId === t.id;
        return (
          <mesh key={`target-${t.id}`} geometry={ring} position={[wx, tileY(tiles, t.tile) + 0.01, wz]}>
            <meshBasicMaterial
              color={isPending ? '#e06c4f' : '#a8543f'}
              transparent
              opacity={isPending ? 0.95 : 0.65}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* Operation targeting */}
      {opTargets.map((id) => {
        const { wx, wz } = tileWorldById(id);
        return (
          <mesh key={`op-${id}`} geometry={ring} position={[wx, tileY(tiles, id) + 0.01, wz]}>
            <meshBasicMaterial color="#9db8d8" transparent opacity={0.8} depthWrite={false} />
          </mesh>
        );
      })}

      {/* Deploy targeting */}
      {deployTiles.map((id) => {
        const { wx, wz } = tileWorldById(id);
        return (
          <mesh key={`dep-${id}`} geometry={disc} position={[wx, tileY(tiles, id) + 0.01, wz]}>
            <meshBasicMaterial color="#8fae72" transparent opacity={0.4} depthWrite={false} />
          </mesh>
        );
      })}

      {/* Selection */}
      {selectedTileId && tiles[selectedTileId] && (
        <mesh geometry={ring} position={(() => {
          const { wx, wz } = tileWorldById(selectedTileId);
          return [wx, tileY(tiles, selectedTileId) + 0.02, wz];
        })()}>
          <meshBasicMaterial color="#d6cfba" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}

      {/* Hover */}
      {hoveredTileId && tiles[hoveredTileId] && hoveredTileId !== selectedTileId && (
        <mesh geometry={ring} position={(() => {
          const { wx, wz } = tileWorldById(hoveredTileId);
          return [wx, tileY(tiles, hoveredTileId) + 0.015, wz];
        })()}>
          <meshBasicMaterial color="#bdb7a6" transparent opacity={0.35} depthWrite={false} />
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
