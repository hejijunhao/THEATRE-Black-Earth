// Formations as machines (v2-vision §6): miniatures on faction base plates
// with state legible from silhouette — element count from strength, supply
// truck present or absent, off-formation scatter when disorganized, a
// replacement column when reinforcing, earthworks growing with entrenchment,
// lingering muzzle smoke after an attack — plus a compact standard overhead.
//
// The v1 counter plates are kept as the far LOD *and* as a manual override
// (Tab): near camera shows miniatures + slim standards; past the zoom
// breakpoint the counters crossfade back in. Wargamers read counters faster.

import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../game/state/store';
import { IntelRecord, Unit } from '../game/types';
import { tileWorldById } from '../game/hex';
import { BoardChrome, boardChrome, threatenedIds } from '../ui/boardChrome';
import {
  counterKey, CounterSpec, makeCounterTexture,
  makeStandardTexture, standardKey, StandardSpec,
} from './textures';
import { tileGroundY } from './terrain/heightfield';
import {
  makeEarthworksGeometry, makeMiniatureBuild, tierFromStrength,
} from '../assets/units';
import { HeroFormation } from './HeroFormation';
import { hashSeed } from '../game/rng';
import { FACTION_STRONG } from './palette';

// Global crossfade state (0 = miniatures, 1 = counters), shared by every
// unit's per-frame material update. Driven by camera height or the Tab
// override — the zoom metaphor's unit dial.
const fadeState = { value: 0 };
const COUNTER_ZOOM_IN = 24;  // mid-zoom keeps machines; counters for the theatre
const COUNTER_ZOOM_FULL = 42;

/** Sit the token on the earth — a contact shadow, not another ring. */
function GroundPresence({ radius }: { radius: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} raycast={() => null}>
        <circleGeometry args={[radius * 1.15, 32]} />
        <meshBasicMaterial color="#0a0907" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} raycast={() => null}>
        <circleGeometry args={[radius, 28]} />
        <meshBasicMaterial color="#0c0b08" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ONE selected language: a camera-facing parchment mat with an ink rim,
// sitting behind the plate / standard so it frames the token. Ground
// washers vanished — cream-on-cream plus the billboard covering them.
// Can-attack is an amber chevron on the same billboard (screen-right),
// a different silhouette. Contact-only and threatened stay on the plate.
function AgencyMarks({
  chrome,
  selected,
  width,
  height,
  y,
}: {
  chrome: BoardChrome;
  selected: boolean;
  width: number;
  height: number;
  y: number;
}) {
  const inkW = width * 1.48;
  const inkH = height * 1.62;
  const paperW = width * 1.28;
  const paperH = height * 1.38;
  const chevR = height * 0.95;
  return (
    <Billboard position={[0, y, 0]} follow>
      {selected && (
        <group>
          <mesh position={[0, 0, -0.02]} raycast={() => null}>
            <planeGeometry args={[inkW, inkH]} />
            <meshBasicMaterial color="#2a2418" depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, -0.01]} raycast={() => null}>
            <planeGeometry args={[paperW, paperH]} />
            <meshBasicMaterial color="#d8c89a" depthWrite={false} />
          </mesh>
        </group>
      )}
      {chrome.canAttack && (
        <group position={[inkW * 0.5 + chevR * 0.72, 0, -0.01]}>
          <mesh raycast={() => null}>
            <circleGeometry args={[chevR, 3]} />
            <meshBasicMaterial color="#1e1b14" depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, 0.004]} scale={0.78} raycast={() => null}>
            <circleGeometry args={[chevR, 3]} />
            <meshBasicMaterial color="#d4b05a" depthWrite={false} />
          </mesh>
        </group>
      )}
    </Billboard>
  );
}

// Peak-to-peak heading spread of a formation on its base plate, in radians.
const UNIT_FACING_JITTER = 0.2;

function useCrossfade() {
  const counterMode = useStore((s) => s.counterMode);
  useFrame(({ camera }, delta) => {
    const auto = THREE.MathUtils.clamp(
      (camera.position.y - COUNTER_ZOOM_IN) / (COUNTER_ZOOM_FULL - COUNTER_ZOOM_IN),
      0,
      1,
    );
    const target = counterMode ? 1 : auto;
    fadeState.value += (target - fadeState.value) * Math.min(1, delta * 8);
  });
}

const MINI_MATERIAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.72,
  metalness: 0.08,
  transparent: true,
  emissive: '#2c2618',
  emissiveIntensity: 0.28,
});

function UnitMiniature({ unit, selected, chrome }: { unit: Unit; selected: boolean; chrome: BoardChrome }) {
  const game = useStore((s) => s.game)!;
  const selectUnit = useStore((s) => s.selectUnit);
  const selectTile = useStore((s) => s.selectTile);
  const groupRef = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3());
  const baseMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const stdMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  const tier = tierFromStrength(unit.strength);
  const build = useMemo(
    () =>
      makeMiniatureBuild({
        type: unit.type,
        faction: unit.faction,
        tier,
        supplyTruck: unit.supply === 'full' || unit.supply === 'supplied',
        reinforcing: unit.reinforcing,
        disorganized: unit.disorganized > 0,
        smoke: unit.hasAttacked,
      }),
    [unit.type, unit.faction, tier, unit.supply, unit.reinforcing, unit.disorganized > 0, unit.hasAttacked],
  );

  const earthworks = useMemo(
    () => makeEarthworksGeometry(unit.entrenchment, game.tiles[unit.tile]?.fortified ?? false),
    [unit.entrenchment, game.tiles[unit.tile]?.fortified],
  );

  const stdSpec: StandardSpec = {
    type: unit.type,
    faction: unit.faction,
    name: unit.name,
    tier,
    supply: unit.supply,
    experience: unit.experience,
    selected,
    movement: chrome.showMp ? chrome.mp : undefined,
    movementMax: chrome.showMp ? chrome.mpMax : undefined,
    spent: chrome.spent,
    hasAttacked: chrome.hasAttacked,
    inContact: chrome.inContact,
    canAttack: chrome.canAttack,
    threatened: chrome.threatened,
  };
  const stdTexture = useMemo(() => makeStandardTexture(stdSpec), [standardKey(stdSpec)]);
  useEffect(() => () => stdTexture.dispose(), [stdTexture]);

  const { wx, wz } = tileWorldById(unit.tile);
  const y = tileGroundY(unit.tile);
  // Deterministic facing jitter per formation. The base plate does not turn
  // with the vehicles, so this is bounded by how far a full hero echelon can
  // swing before its outer elements hang off the plate — see the step
  // constants in assets/units.ts. It was ±0.25 when the vehicles were
  // 84-triangle wedges a third the size.
  const facing = ((hashSeed(unit.id) % 100) / 100 - 0.5) * UNIT_FACING_JITTER;

  useEffect(() => {
    target.current.set(wx, y, wz);
    if (groupRef.current && groupRef.current.position.lengthSq() === 0) {
      groupRef.current.position.copy(target.current);
    }
  }, [wx, wz, y]);

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (g.position.distanceTo(target.current) > 0.002) {
      g.position.lerp(target.current, Math.min(1, delta * 7));
    }
    // Crossfade against the counters.
    const vis = (1 - fadeState.value) * (chrome.spent ? 0.78 : 1);
    g.visible = vis > 0.02;
    if (baseMatRef.current) baseMatRef.current.opacity = vis;
    if (stdMatRef.current) stdMatRef.current.opacity = vis;
    // Isolated: slow red pulse on the base ring.
    if (pulseRef.current) {
      const m = pulseRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = (0.35 + Math.sin(clock.elapsedTime * 2.2) * 0.25) * vis;
    }
  });

  const isPlayer = unit.faction === game.playerFaction;

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        if (isPlayer && game.phase === 'player') selectUnit(unit.id);
        else selectTile(unit.tile);
      }}
      onPointerOver={(e) => e.stopPropagation()}
    >
      <GroundPresence radius={0.78} />
      {/* Base plate: faction identity lives here, not on the vehicles. */}
      <mesh position={[0, 0.018, 0]} castShadow>
        <boxGeometry args={[0.96, 0.04, 0.68]} />
        <meshStandardMaterial
          ref={baseMatRef}
          color={chrome.spent
            ? (unit.faction === 'UA' ? '#1c2838' : '#3a201c')
            : (unit.faction === 'UA' ? '#33507a' : '#67352c')}
          roughness={0.6}
          transparent
          emissive={
            selected
              ? FACTION_STRONG[unit.faction]
              : chrome.threatened
                ? '#cfc6a8'
                : FACTION_STRONG[unit.faction]
          }
          emissiveIntensity={selected ? 0.55 : chrome.threatened ? 0.28 : 0.16}
        />
      </mesh>
      {/* The machines: hero vehicles as instances, everything else — foot
          elements, logistics, muzzle smoke — merged into one props mesh. */}
      <group rotation={[0, facing, 0]} position={[0, 0.036, 0]} scale={1.32}>
        {build.props && <mesh geometry={build.props} material={MINI_MATERIAL} castShadow />}
        {build.heroType && (
          <HeroFormation type={build.heroType} faction={unit.faction} slots={build.heroSlots} />
        )}
      </group>
      {/* Earthworks grow with entrenchment. */}
      {earthworks && <mesh geometry={earthworks} material={MINI_MATERIAL} position={[0, 0.005, 0]} />}
      {/* Isolated: red pulsing ring. */}
      {unit.supply === 'isolated' && (
        <mesh ref={pulseRef} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.5, 24]} />
          <meshBasicMaterial color="#b04a3a" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      )}
      <AgencyMarks chrome={chrome} selected={selected} width={1.18} height={0.78} y={0.16} />
      {/* The standard. */}
      <Billboard position={[0, 0.64, 0]} follow>
        <mesh>
          <planeGeometry args={[1.28, 0.38]} />
          <meshBasicMaterial ref={stdMatRef} map={stdTexture} transparent depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

// v1 counter plate — the far LOD and the Tab override.
function UnitCounter({ unit, selected, chrome }: { unit: Unit; selected: boolean; chrome: BoardChrome }) {
  const game = useStore((s) => s.game)!;
  const selectUnit = useStore((s) => s.selectUnit);
  const selectTile = useStore((s) => s.selectTile);
  const groupRef = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3());
  const plateMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const baseMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const spec: CounterSpec = {
    type: unit.type,
    faction: unit.faction,
    name: unit.name,
    strength: unit.strength,
    supply: unit.supply,
    entrenchment: unit.entrenchment,
    reinforcing: unit.reinforcing,
    disorganized: unit.disorganized > 0,
    selected,
    ghost: false,
    movement: chrome.showMp ? chrome.mp : undefined,
    movementMax: chrome.showMp ? chrome.mpMax : undefined,
    spent: chrome.spent,
    hasAttacked: chrome.hasAttacked,
    inContact: chrome.inContact,
    canAttack: chrome.canAttack,
    threatened: chrome.threatened,
  };
  const key = counterKey(spec);
  const texture = useMemo(() => makeCounterTexture(spec), [key]);
  useEffect(() => () => texture.dispose(), [texture]);

  const { wx, wz } = tileWorldById(unit.tile);
  const y = tileGroundY(unit.tile);

  useEffect(() => {
    target.current.set(wx, y, wz);
    if (groupRef.current && groupRef.current.position.lengthSq() === 0) {
      groupRef.current.position.copy(target.current);
    }
  }, [wx, wz, y]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (g.position.distanceTo(target.current) > 0.002) {
      g.position.lerp(target.current, Math.min(1, delta * 7));
    }
    const vis = fadeState.value * (chrome.spent ? 0.78 : 1);
    g.visible = vis > 0.02;
    if (plateMatRef.current) plateMatRef.current.opacity = vis;
    if (baseMatRef.current) baseMatRef.current.opacity = vis;
  });

  const isPlayer = unit.faction === game.playerFaction;

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        if (isPlayer && game.phase === 'player') selectUnit(unit.id);
        else selectTile(unit.tile);
      }}
      onPointerOver={(e) => e.stopPropagation()}
    >
      <GroundPresence radius={0.82} />
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.86, 0.16, 0.56]} />
        <meshStandardMaterial
          ref={baseMatRef}
          color={chrome.spent ? '#1c1b17' : '#2e2c26'}
          roughness={0.78}
          metalness={0.04}
          transparent
          emissive={
            selected
              ? FACTION_STRONG[unit.faction]
              : chrome.threatened
                ? '#cfc6a8'
                : '#000000'
          }
          emissiveIntensity={selected ? 0.42 : chrome.threatened ? 0.22 : 0}
        />
      </mesh>
      <AgencyMarks chrome={chrome} selected={selected} width={2.62} height={1.64} y={0.86} />
      <Billboard position={[0, 0.96, 0]} follow>
        <mesh>
          <planeGeometry args={[2.62, 1.64]} />
          <meshBasicMaterial ref={plateMatRef} map={texture} transparent depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function GhostMarker({ rec }: { rec: IntelRecord }) {
  const game = useStore((s) => s.game)!;
  const spec: CounterSpec = {
    type: rec.type ?? 'infantry',
    faction: game.playerFaction === 'UA' ? 'RU' : 'UA',
    name: rec.level >= 2 && rec.type ? `${rec.type.toUpperCase()} · T${rec.seenTurn}` : `CONTACT · T${rec.seenTurn}`,
    strength: rec.strength ?? 0,
    supply: 'supplied',
    entrenchment: 0,
    reinforcing: false,
    disorganized: false,
    selected: false,
    ghost: true,
    intelLevel: rec.level,
  };
  const key = counterKey(spec);
  const texture = useMemo(() => makeCounterTexture(spec), [key]);
  useEffect(() => () => texture.dispose(), [texture]);

  const tile = game.tiles[rec.tile];
  if (!tile) return null;
  const { wx, wz } = tileWorldById(rec.tile);
  const y = tileGroundY(rec.tile);
  // Presence decays exactly as the intel record decays.
  const age = Math.max(0, game.turn - rec.seenTurn);
  const opacity = Math.max(0.3, 0.8 - age * 0.09);

  return (
    <Billboard position={[wx, y + 0.7, wz]} follow>
      <mesh>
        <planeGeometry args={[0.9, 0.56]} />
        <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

export function Units() {
  const game = useStore((s) => s.game);
  const selectedUnitId = useStore((s) => s.selectedUnitId);
  useCrossfade();
  if (!game) return null;

  const visible = new Set(game.visibleTiles);
  const player = game.playerFaction;

  const shown: Unit[] = [];
  const ghosts: IntelRecord[] = [];
  for (const unit of Object.values(game.units)) {
    if (unit.faction === player) {
      shown.push(unit);
    } else if (visible.has(unit.tile)) {
      shown.push(unit);
    }
  }
  for (const rec of Object.values(game.intel)) {
    const unit = game.units[rec.unitId];
    if (!unit) continue;
    if (!visible.has(unit.tile)) ghosts.push(rec);
  }

  const threatened = threatenedIds(game, selectedUnitId);

  return (
    <group>
      {shown.map((u) => {
        const chrome = boardChrome(game, u, threatened.has(u.id));
        return <UnitMiniature key={`m-${u.id}`} unit={u} selected={u.id === selectedUnitId} chrome={chrome} />;
      })}
      {shown.map((u) => {
        const chrome = boardChrome(game, u, threatened.has(u.id));
        return <UnitCounter key={`c-${u.id}`} unit={u} selected={u.id === selectedUnitId} chrome={chrome} />;
      })}
      {ghosts.map((r) => (
        <GhostMarker key={`ghost-${r.unitId}`} rec={r} />
      ))}
    </group>
  );
}
