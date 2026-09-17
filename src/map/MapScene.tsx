// The 3D theatre. Owns the Canvas, lighting, atmosphere and all map layers.
// Consumes game state only — no rules live here.

import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../game/state/store';
import { CameraRig } from './CameraRig';
import { CityMarkers, Forests, Fortifications, UrbanBlocks } from './Decorations';
import { Frontline } from './Frontline';
import { Overlays } from './Overlays';
import { BattleWear, CombatMoment, Landmarks, SupplyFlow } from './Presentation';
import { TerrainMesh } from './terrain/TerrainMesh';
import { RiverRibbons, Sea } from './terrain/Water';
import { Units } from './Units';
import { Vegetation } from './Vegetation';
import { WeatherParticles } from './Weather';
import { PostFX } from './postfx/PostFX';
import { WEATHER_ENV } from './palette';
import { WORLD_H, WORLD_W } from './worldDims';

function Atmosphere() {
  const weather = useStore((s) => s.game?.weather ?? 'clear');
  const turn = useStore((s) => s.game?.turn ?? 1);
  const maxTurns = useStore((s) => s.game?.scenario.maxTurns ?? 36);
  const env = WEATHER_ENV[weather];
  const fog = useMemo(() => new THREE.FogExp2(env.fog, env.fogDensity), [env.fog, env.fogDensity]);
  const bg = useMemo(() => new THREE.Color(env.sky), [env.sky]);
  // The sun aims at the map centre and its shadow frustum covers the whole
  // theatre (a clamped frustum smears edge darkness across everything
  // outside it — the v1 ±30 bounds only covered a corner of the v2 map).
  const sunTarget = useMemo(() => {
    const t = new THREE.Object3D();
    t.position.set(WORLD_W / 2, 0, WORLD_H / 2);
    t.updateMatrixWorld();
    return t;
  }, []);

  // Time-of-day drift across the campaign (v2-vision §4.5): early turns in
  // low spring morning light from the east; high-summer sun mid-campaign;
  // colder, flatter light as autumn closes in. Cosmetic, derived from the
  // turn number — free and deterministic.
  const { sunPos, sunColor } = useMemo(() => {
    const phase = Math.min(1, (turn - 1) / (maxTurns - 1));
    const elevation = THREE.MathUtils.lerp(0.62, 1.0, Math.sin(phase * Math.PI)); // rad-ish
    const azimuth = THREE.MathUtils.lerp(0.85, -0.55, phase); // east -> west of south
    const r = 62;
    const sunPos: [number, number, number] = [
      WORLD_W / 2 + Math.sin(azimuth) * Math.cos(elevation) * r,
      Math.sin(elevation) * r,
      WORLD_H / 2 + Math.cos(azimuth) * Math.cos(elevation) * r * 0.7,
    ];
    const warm = new THREE.Color('#f6e9c9');
    const neutral = new THREE.Color('#f2ead8');
    const cold = new THREE.Color('#e6e5e0');
    const sunColor =
      phase < 0.5 ? warm.clone().lerp(neutral, phase * 2) : neutral.clone().lerp(cold, (phase - 0.5) * 2);
    return { sunPos, sunColor };
  }, [turn, maxTurns]);

  return (
    <>
      <primitive attach="fog" object={fog} />
      <primitive attach="background" object={bg} />
      <hemisphereLight args={['#e6d8b6', '#6a5c40', env.ambient]} />
      <primitive object={sunTarget} />
      <directionalLight
        position={sunPos}
        target={sunTarget}
        intensity={env.sun * 1.08}
        color={sunColor}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-58}
        shadow-camera-right={58}
        shadow-camera-top={44}
        shadow-camera-bottom={-44}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
      />
      {/* North fill: the far soil is the same place, not a grey hole. */}
      <directionalLight
        position={[WORLD_W / 2 + 8, 24, WORLD_H / 2 - 36]}
        intensity={0.22}
        color="#c4b890"
      />
      <directionalLight
        position={[WORLD_W / 2 - 36, 26, WORLD_H / 2 + 16]}
        intensity={0.1}
        color="#c8b888"
      />
    </>
  );
}

export function MapScene() {
  const selectTile = useStore((s) => s.selectTile);
  // The paper renderer is a MAP, not a model: 3D clutter comes off it.
  const paper = useStore((s) => s.mapMode === 'political');

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 42, near: 0.5, far: 220 }}
      onPointerMissed={() => selectTile(null)}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        // ACES crushes the mids; the sober palette needs the headroom back
        // (the post chain's AO + grade + vignette take another slice).
        gl.toneMappingExposure = 1.4;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Atmosphere />
      <TerrainMesh />
      <Sea />
      <RiverRibbons />
      <Frontline />
      {!paper && <Vegetation />}
      {!paper && <Forests />}
      {!paper && <UrbanBlocks />}
      {!paper && <Fortifications />}
      <CityMarkers />
      {!paper && <BattleWear />}
      {!paper && <Landmarks />}
      <Units />
      <Overlays />
      <SupplyFlow />
      <CombatMoment />
      <WeatherParticles />
      <PostFX />
      <CameraRig />
    </Canvas>
  );
}
