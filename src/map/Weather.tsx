// Precipitation: a lightweight particle field over the theatre for rain and
// snow. Purely atmospheric.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../game/state/store';
import { HEX_W, HEX_H } from '../game/hex';

const COUNT = 1400;
const AREA_W = 26 * HEX_W;
const AREA_H = 17 * HEX_H;
const CEILING = 14;

export function WeatherParticles() {
  const weather = useStore((s) => s.game?.weather);
  const active = weather === 'rain' || weather === 'snow';
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = Math.random() * AREA_W;
      positions[i * 3 + 1] = Math.random() * CEILING;
      positions[i * 3 + 2] = Math.random() * AREA_H;
      speeds[i] = 0.6 + Math.random() * 0.8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry, speeds };
  }, []);

  useFrame((_, delta) => {
    if (!active || !pointsRef.current) return;
    const attr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const fall = weather === 'rain' ? 16 : 3.2;
    const drift = weather === 'snow' ? 0.6 : 0.1;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] -= fall * speeds[i] * delta;
      arr[i * 3] += drift * speeds[i] * delta;
      if (arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = CEILING;
        arr[i * 3] = Math.random() * AREA_W;
        arr[i * 3 + 2] = Math.random() * AREA_H;
      }
    }
    attr.needsUpdate = true;
  });

  if (!active) return null;
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color={weather === 'rain' ? '#7d8b96' : '#dfe5ea'}
        size={weather === 'rain' ? 0.05 : 0.09}
        transparent
        opacity={weather === 'rain' ? 0.5 : 0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
