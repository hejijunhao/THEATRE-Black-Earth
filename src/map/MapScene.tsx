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
import { Rivers } from './Rivers';
import { Roads } from './Roads';
import { Tiles } from './Tiles';
import { Units } from './Units';
import { WeatherParticles } from './Weather';
import { WEATHER_ENV } from './palette';
import { HEX_W, HEX_H } from '../game/hex';

function Atmosphere() {
  const weather = useStore((s) => s.game?.weather ?? 'clear');
  const env = WEATHER_ENV[weather];
  const fog = useMemo(() => new THREE.FogExp2(env.fog, env.fogDensity), [env.fog, env.fogDensity]);
  const bg = useMemo(() => new THREE.Color(env.sky), [env.sky]);

  return (
    <>
      <primitive attach="fog" object={fog} />
      <primitive attach="background" object={bg} />
      <hemisphereLight args={['#c8cfd4', '#3c3a30', env.ambient]} />
      <directionalLight
        position={[18, 30, 8]}
        intensity={env.sun}
        color="#f2ead8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />
    </>
  );
}

// A large ground plane beneath the tiles so the map reads as a solid relief
// model rather than floating hexes.
function GroundPlane() {
  return (
    <mesh position={[26 * HEX_W * 0.5 - HEX_W / 2, -0.05, 17 * HEX_H * 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[26 * HEX_W * 2.4, 17 * HEX_H * 2.8]} />
      <meshStandardMaterial color="#31404f" roughness={1} />
    </mesh>
  );
}

export function MapScene() {
  const selectTile = useStore((s) => s.selectTile);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 42, near: 0.5, far: 220 }}
      onPointerMissed={() => selectTile(null)}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Atmosphere />
      <GroundPlane />
      <Tiles />
      <Rivers />
      <Roads />
      <Frontline />
      <Forests />
      <UrbanBlocks />
      <Fortifications />
      <CityMarkers />
      <Units />
      <Overlays />
      <WeatherParticles />
      <CameraRig />
    </Canvas>
  );
}
