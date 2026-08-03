// Phase F presentation layers (v2-vision §5, §4.4, §6.4):
//   SupplyFlow    — the flood-fill made visible: animated dashes along
//                   road/rail in friendly territory, red pulses where the
//                   network is cut.
//   BattleWear    — craters, burns and a lingering smoke column on tiles
//                   with recent combat (tile.recentCombat).
//   CombatMoment  — ~1.2 s restrained flash + dust when an attack resolves.
//   Landmarks     — abstracted silhouettes for tagged cities.
// All variation is hashed from tile coordinates; nothing random.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { hashSeed } from '../game/rng';
import { neighborIds, tileWorldById } from '../game/hex';
import { useStore } from '../game/state/store';
import { CombatResult, TileId } from '../game/types';
import { mergeGeometries } from './geomUtils';
import { groundY, tileGroundY } from './terrain/heightfield';
import { paint } from '../assets/parts';

// ------------------------------------------------------------- supply flow

const FLOW_VERT = /* glsl */ `
  attribute float aDist;
  attribute float aLevel;
  varying float vDist;
  varying float vLevel;
  void main() {
    vDist = aDist;
    vLevel = aLevel;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FLOW_FRAG = /* glsl */ `
  uniform float uTime;
  varying float vDist;
  varying float vLevel;
  void main() {
    // Dashes crawling from source toward the front.
    float dash = step(0.45, fract(vDist * 1.6 - uTime * 0.8));
    if (dash < 0.5) discard;
    vec3 good = vec3(0.56, 0.72, 0.47);
    vec3 thin = vec3(0.79, 0.64, 0.32);
    vec3 col = mix(thin, good, clamp(vLevel / 10.0, 0.0, 1.0));
    gl_FragColor = vec4(col, 0.85);
  }
`;

export function SupplyFlow() {
  const game = useStore((s) => s.game);
  const mapMode = useStore((s) => s.mapMode);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, cutTiles } = useMemo(() => {
    if (!game || mapMode !== 'supply') return { geometry: null, cutTiles: [] as TileId[] };
    const player = game.playerFaction;
    const levels = game.supplyLevels[player];
    const positions: number[] = [];
    const dists: number[] = [];
    const lvls: number[] = [];
    const seen = new Set<string>();
    const cutSet = new Set<TileId>();

    for (const tile of Object.values(game.tiles)) {
      if (!(tile.road || tile.rail) || tile.controller !== player) continue;
      const hereLevel = levels[tile.id] ?? 0;
      // Cut corridor: an owned road tile with no supply next to a supplied one.
      if (hereLevel <= 0) {
        for (const nId of neighborIds(tile.id)) {
          if ((levels[nId] ?? 0) > 0 && game.tiles[nId]?.controller === player) {
            cutSet.add(tile.id);
            break;
          }
        }
        continue;
      }
      for (const nId of neighborIds(tile.id)) {
        const n = game.tiles[nId];
        if (!n || !(n.road || n.rail) || n.controller !== player) continue;
        const nLevel = levels[nId] ?? 0;
        if (nLevel <= 0) continue;
        const key = tile.id < nId ? `${tile.id}|${nId}` : `${nId}|${tile.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // Orient the dash flow from higher supply toward lower.
        const [hi, lo, hiL, loL] =
          hereLevel >= nLevel ? [tile.id, nId, hereLevel, nLevel] : [nId, tile.id, nLevel, hereLevel];
        const a = tileWorldById(hi);
        const b = tileWorldById(lo);
        const ya = tileGroundY(hi) + 0.06;
        const yb = tileGroundY(lo) + 0.06;
        // Subdivide for dash resolution.
        const STEPS = 6;
        for (let i = 0; i < STEPS; i++) {
          const t0 = i / STEPS;
          const t1 = (i + 1) / STEPS;
          positions.push(
            a.wx + (b.wx - a.wx) * t0, ya + (yb - ya) * t0, a.wz + (b.wz - a.wz) * t0,
            a.wx + (b.wx - a.wx) * t1, ya + (yb - ya) * t1, a.wz + (b.wz - a.wz) * t1,
          );
          dists.push(t0 * 1.7, t1 * 1.7);
          const l0 = hiL + (loL - hiL) * t0;
          lvls.push(l0, hiL + (loL - hiL) * t1);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute('aDist', new THREE.BufferAttribute(new Float32Array(dists), 1));
    geo.setAttribute('aLevel', new THREE.BufferAttribute(new Float32Array(lvls), 1));
    return { geometry: geo, cutTiles: [...cutSet] };
  }, [game?.supplyLevels, game?.tiles, mapMode, game?.playerFaction]);

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta;
  });

  const ringGeo = useMemo(() => {
    const g = new THREE.RingGeometry(0.5, 0.66, 6);
    g.rotateZ(Math.PI / 6);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const pulseRefs = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(({ clock }) => {
    for (const m of pulseRefs.current) {
      if (m) m.opacity = 0.35 + Math.sin(clock.elapsedTime * 3.2) * 0.3;
    }
  });

  if (!geometry || mapMode !== 'supply') return null;
  pulseRefs.current = [];

  return (
    <group>
      <lineSegments geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          vertexShader={FLOW_VERT}
          fragmentShader={FLOW_FRAG}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          depthWrite={false}
        />
      </lineSegments>
      {cutTiles.map((id) => {
        const { wx, wz } = tileWorldById(id);
        return (
          <mesh key={`cut-${id}`} geometry={ringGeo} position={[wx, tileGroundY(id) + 0.05, wz]}>
            <meshBasicMaterial
              ref={(m) => m && pulseRefs.current.push(m)}
              color="#c0392b"
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ------------------------------------------------------------- battle wear

export function BattleWear() {
  const game = useStore((s) => s.game);

  const { scarGeo, smokeAt } = useMemo(() => {
    if (!game) return { scarGeo: null, smokeAt: [] as Array<{ wx: number; wz: number; y: number }> };
    const scars: THREE.BufferGeometry[] = [];
    const smokeAt: Array<{ wx: number; wz: number; y: number }> = [];
    for (const tile of Object.values(game.tiles)) {
      const rc = tile.recentCombat ?? 0;
      if (rc <= 0) continue;
      const { wx, wz } = tileWorldById(tile.id);
      const n = 3 + (hashSeed(tile.id) % 3);
      for (let k = 0; k < n; k++) {
        const a = ((hashSeed(`${tile.id}|bw${k}`) % 1000) / 1000) * Math.PI * 2;
        const r = 0.12 + ((hashSeed(`${tile.id}|br${k}`) % 1000) / 1000) * 0.55;
        const px = wx + Math.cos(a) * r;
        const pz = wz + Math.sin(a) * r;
        const size = 0.06 + ((hashSeed(`${tile.id}|bs${k}`) % 1000) / 1000) * 0.1;
        const g = new THREE.CircleGeometry(size, 8);
        g.rotateX(-Math.PI / 2);
        g.translate(px, groundY(px, pz) + 0.015, pz);
        // Fade the scorch with the counter (fresh = darker).
        const shade = 0.1 + (3 - rc) * 0.05;
        paint(g, `#${Math.round(shade * 255).toString(16).padStart(2, '0').repeat(3)}`);
        scars.push(g);
      }
      if (rc >= 3) smokeAt.push({ wx, wz, y: tileGroundY(tile.id) });
    }
    return { scarGeo: mergeGeometries(scars), smokeAt };
  }, [game?.tiles]);

  const smokeMatRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (smokeMatRef.current) {
      smokeMatRef.current.opacity = 0.3 + Math.sin(clock.elapsedTime * 0.9) * 0.06;
    }
  });

  if (!scarGeo && smokeAt.length === 0) return null;
  return (
    <group>
      {scarGeo && (
        <mesh geometry={scarGeo}>
          <meshBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
      {smokeAt.map((s, i) => (
        <group key={i} position={[s.wx + 0.15, s.y, s.wz - 0.1]}>
          {[0.05, 0.14, 0.24, 0.36].map((h, j) => (
            <mesh key={j} position={[j * 0.03, h, j * 0.015]}>
              <sphereGeometry args={[0.05 + j * 0.03, 6, 5]} />
              <meshStandardMaterial
                ref={j === 0 ? smokeMatRef : undefined}
                color="#8a867c"
                transparent
                opacity={0.32 - j * 0.05}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ----------------------------------------------------------- combat moment

interface Moment {
  key: number;
  tile: TileId;
  start: number;
}

export function CombatMoment() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    let prevPlayer: CombatResult | null = null;
    let prevAI: CombatResult | null | undefined = null;
    return useStore.subscribe((s) => {
      const push = (tile: TileId) => {
        seq.current += 1;
        const m = { key: seq.current, tile, start: performance.now() };
        setMoments((cur) => [...cur.filter((x) => performance.now() - x.start < 1400), m]);
      };
      if (s.lastCombat && s.lastCombat !== prevPlayer) {
        push(s.lastCombat.tile);
      }
      prevPlayer = s.lastCombat;
      const aiCombat = s.lastAILog?.combat;
      if (aiCombat && aiCombat !== prevAI) {
        push(aiCombat.tile);
      }
      prevAI = aiCombat;
    });
  }, []);

  // Drop finished moments.
  useEffect(() => {
    if (moments.length === 0) return;
    const t = setTimeout(() => {
      setMoments((cur) => cur.filter((m) => performance.now() - m.start < 1400));
    }, 1500);
    return () => clearTimeout(t);
  }, [moments]);

  return (
    <group>
      {moments.map((m) => (
        <MomentEffect key={m.key} moment={m} />
      ))}
    </group>
  );
}

function MomentEffect({ moment }: { moment: Moment }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const dustRefs = useRef<THREE.Mesh[]>([]);
  const { wx, wz } = tileWorldById(moment.tile);
  const y = tileGroundY(moment.tile);

  useFrame(() => {
    const t = (performance.now() - moment.start) / 1200; // 0..1
    if (lightRef.current) {
      // Two quick flashes, then dark.
      const flash = t < 0.08 ? 1 - t / 0.08 : t > 0.14 && t < 0.2 ? 1 - (t - 0.14) / 0.06 : 0;
      lightRef.current.intensity = flash * 5;
    }
    dustRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = Math.min(1, Math.max(0, t * 1.15 - i * 0.06));
      const s = 0.12 + p * 0.5;
      mesh.scale.set(s, s * 0.7, s);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - p);
    });
  });

  const offsets = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        x: ((hashSeed(`${moment.key}|dx${i}`) % 100) / 100 - 0.5) * 0.5,
        z: ((hashSeed(`${moment.key}|dz${i}`) % 100) / 100 - 0.5) * 0.5,
      })),
    [moment.key],
  );

  return (
    <group position={[wx, y, wz]}>
      <pointLight ref={lightRef} position={[0, 0.4, 0]} color="#f3c98a" intensity={0} distance={4} />
      {offsets.map((o, i) => (
        <mesh key={i} position={[o.x, 0.12, o.z]} ref={(el) => el && (dustRefs.current[i] = el)}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshBasicMaterial color="#9a917d" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- landmarks

function landmarkGeometry(tag: string): THREE.BufferGeometry | null {
  const CONCRETE = '#8b887e';
  const DARK = '#6c695f';
  const parts: THREE.BufferGeometry[] = [];
  const box = (w: number, h: number, d: number, c: string, x: number, y: number, z: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    parts.push(paint(g, c));
  };
  switch (tag) {
    case 'derzhprom':
      // Stepped constructivist slabs.
      box(0.1, 0.34, 0.08, CONCRETE, -0.12, 0.17, 0);
      box(0.1, 0.46, 0.08, CONCRETE, 0, 0.23, 0.02);
      box(0.1, 0.3, 0.08, CONCRETE, 0.12, 0.15, -0.01);
      box(0.26, 0.05, 0.04, DARK, 0, 0.36, 0.03);
      break;
    case 'capital': {
      // A slim monumental spire.
      const spire = new THREE.CylinderGeometry(0.008, 0.03, 0.62, 6);
      spire.translate(0, 0.31, 0);
      parts.push(paint(spire, CONCRETE));
      box(0.1, 0.05, 0.1, DARK, 0, 0.025, 0);
      break;
    }
    case 'port':
      // Two gantry cranes.
      for (const dx of [-0.1, 0.12]) {
        box(0.025, 0.3, 0.025, DARK, dx, 0.15, 0);
        box(0.24, 0.022, 0.03, DARK, dx + 0.07, 0.3, 0);
        box(0.02, 0.08, 0.02, DARK, dx + 0.16, 0.25, 0);
      }
      break;
    case 'dam':
      // A long low dam wall with piers.
      box(0.5, 0.09, 0.06, CONCRETE, 0, 0.045, 0);
      for (let i = -2; i <= 2; i++) box(0.03, 0.13, 0.08, DARK, i * 0.1, 0.065, 0);
      break;
    default:
      return null;
  }
  return mergeGeometries(parts);
}

const LANDMARK_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });

export function Landmarks() {
  const game = useStore((s) => s.game);
  const items = useMemo(() => {
    if (!game) return [];
    return Object.values(game.cities)
      .filter((c) => c.landmark)
      .map((c) => {
        const { wx, wz } = tileWorldById(c.tile);
        return {
          id: c.id,
          geo: landmarkGeometry(c.landmark!),
          wx: wx + 0.32,
          wz: wz + 0.28,
          y: tileGroundY(c.tile),
        };
      })
      .filter((l) => l.geo);
  }, [game?.scenario.id]);

  return (
    <group>
      {items.map((l) => (
        <mesh key={l.id} geometry={l.geo!} material={LANDMARK_MAT} position={[l.wx, l.y, l.wz]} castShadow />
      ))}
    </group>
  );
}
