// The post chain (v2-vision §4.5): SSAO (N8AO) for relief, tightly
// restrained bloom (water sun-lane and fires only), a soft vignette, then
// the per-weather grade LAST so rain's veil-break can undo AO crush.
// No grain, no chromatic aberration — briefing-room discipline.

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { N8AOPostPass } from 'n8ao';
import { useFrame, useThree } from '@react-three/fiber';
import { VignetteEffect } from 'postprocessing';
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../../game/state/store';
import { GradeEffect, WEATHER_GRADE } from './Grade';
import { FAIR_AO, FAIR_VIGNETTE, RAIN_AO, RAIN_VIGNETTE, isWetWeather } from './rainStack';

type AoConfig = N8AOPostPass['configuration'] & { gammaCorrection?: boolean };

// n8ao ships a Pass (not an Effect); bridge it into the R3F composer.
const N8AO = forwardRef<N8AOPostPass, { halfRes?: boolean }>(function N8AO({ halfRes = true }, ref) {
  const { scene, camera, size } = useThree();
  const weather = useStore((s) => s.game?.weather ?? 'overcast');
  const pass = useMemo(() => {
    const p = new N8AOPostPass(scene, camera, size.width, size.height);
    p.configuration.aoRadius = FAIR_AO.aoRadius;
    p.configuration.distanceFalloff = FAIR_AO.distanceFalloff;
    p.configuration.intensity = FAIR_AO.intensity;
    p.configuration.halfRes = halfRes;
    p.configuration.color = new THREE.Color(FAIR_AO.color);
    // Composer + renderer already manage colour space. Double gamma is what
    // turned rain AO into a charcoal veil on the far/north soil.
    (p.configuration as AoConfig).gammaCorrection = false;
    return p;
  }, [scene, camera]);
  useEffect(() => {
    pass.setSize(size.width, size.height);
  }, [pass, size]);
  useFrame(() => {
    const wet = isWetWeather(weather);
    const cfg = wet ? RAIN_AO : FAIR_AO;
    pass.configuration.intensity = cfg.intensity;
    pass.configuration.aoRadius = cfg.aoRadius;
    pass.configuration.distanceFalloff = cfg.distanceFalloff;
    pass.configuration.color.set(cfg.color);
  });
  if (typeof ref === 'function') ref(pass);
  else if (ref) ref.current = pass;
  return <primitive object={pass} />;
});

// The paper renderer bypasses the weather film stock — a printed map is not
// subject to the light outside the map room.
const PAPER_GRADE = { temp: 0.04, tintG: 0.0, sat: 1.0, contrast: 1.02, lift: 0.01, veil: 0 };

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

function WeatherVignette() {
  const weather = useStore((s) => s.game?.weather ?? 'overcast');
  const ref = useRef<VignetteEffect>(null);
  useFrame(() => {
    const v = ref.current;
    if (!v) return;
    const wet = isWetWeather(weather);
    const cfg = wet ? RAIN_VIGNETTE : FAIR_VIGNETTE;
    v.offset = cfg.offset;
    v.darkness = cfg.darkness;
  });
  // r3f/postprocessing types the ref as the constructor, not the instance.
  return <Vignette ref={ref as never} eskil={false} offset={RAIN_VIGNETTE.offset} darkness={RAIN_VIGNETTE.darkness} />;
}

export function PostFX() {
  const quality = useStore((s) => s.quality);
  if (quality === 'low') return null;
  return (
    <EffectComposer multisampling={4}>
      <N8AO />
      <Bloom intensity={0.22} luminanceThreshold={0.92} luminanceSmoothing={0.15} mipmapBlur />
      <WeatherVignette />
      <GradePrimitive />
    </EffectComposer>
  );
}
