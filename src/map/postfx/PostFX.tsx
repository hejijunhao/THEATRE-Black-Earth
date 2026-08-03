// The post chain (v2-vision §4.5): SSAO (N8AO) for relief, tightly
// restrained bloom (water sun-lane and fires only), the per-weather grade,
// a soft vignette, and subtle depth-of-field that only engages at close
// zoom so the focus area sits in a pool of sharpness. No grain, no
// chromatic aberration — briefing-room discipline.

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { N8AOPostPass } from 'n8ao';
import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from '../../game/state/store';
import { GradeEffect, WEATHER_GRADE } from './Grade';

// n8ao ships a Pass (not an Effect); bridge it into the R3F composer.
const N8AO = forwardRef<N8AOPostPass, { halfRes?: boolean }>(function N8AO({ halfRes = true }, ref) {
  const { scene, camera, size } = useThree();
  const pass = useMemo(() => {
    const p = new N8AOPostPass(scene, camera, size.width, size.height);
    p.configuration.aoRadius = 1.3;
    p.configuration.distanceFalloff = 1.2;
    p.configuration.intensity = 1.5;
    p.configuration.halfRes = halfRes;
    p.configuration.color = new THREE.Color('#1b1a14'); // warm-dark occlusion
    return p;
  }, [scene, camera]);
  useEffect(() => {
    pass.setSize(size.width, size.height);
  }, [pass, size]);
  if (typeof ref === 'function') ref(pass);
  else if (ref) ref.current = pass;
  return <primitive object={pass} />;
});

// The paper renderer bypasses the weather film stock — a printed map is not
// subject to the light outside the map room.
const PAPER_GRADE = { temp: 0.04, tintG: 0.0, sat: 1.0, contrast: 1.02, lift: 0.01 };

function GradePrimitive() {
  const weather = useStore((s) => s.game?.weather ?? 'overcast');
  const mapMode = useStore((s) => s.mapMode);
  const effect = useMemo(() => new GradeEffect(), []);
  useFrame((_, delta) => {
    const target = mapMode === 'political' ? PAPER_GRADE : WEATHER_GRADE[weather];
    effect.lerpTowards(target, Math.min(1, delta * 2.2));
  });
  return <primitive object={effect} />;
}

export function PostFX() {
  const quality = useStore((s) => s.quality);
  if (quality === 'low') return null;
  return (
    <EffectComposer multisampling={4}>
      <N8AO />
      <Bloom intensity={0.22} luminanceThreshold={0.92} luminanceSmoothing={0.15} mipmapBlur />
      <GradePrimitive />
      <Vignette eskil={false} offset={0.24} darkness={0.42} />
    </EffectComposer>
  );
}
