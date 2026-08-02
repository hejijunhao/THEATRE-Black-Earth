// Tilted strategic camera with pan/zoom, clamped to the theatre, plus smooth
// focus animation when the game asks to look at a tile (AI actions, alerts).

import { MapControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { tileWorldById, HEX_W, HEX_H } from '../game/hex';
import { useStore } from '../game/state/store';

const MAP_W = 26 * HEX_W;
const MAP_H = 17 * HEX_H;

export function CameraRig() {
  const controlsRef = useRef<MapControlsImpl>(null);
  const focus = useStore((s) => s.cameraFocus);
  const targetGoal = useRef<THREE.Vector3 | null>(null);
  const { camera } = useThree();

  // Initial framing: center on the Dnipro bend, looking north.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.target.set(MAP_W * 0.58, 0, MAP_H * 0.45);
    camera.position.set(MAP_W * 0.58, 26, MAP_H * 0.45 + 17);
    controls.update();
  }, [camera]);

  useEffect(() => {
    if (!focus) return;
    const { wx, wz } = tileWorldById(focus.tile);
    targetGoal.current = new THREE.Vector3(wx, 0, wz);
  }, [focus?.seq]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    // Clamp target to the map bounds.
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -4, MAP_W + 4);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -4, MAP_H + 6);
    controls.target.y = 0;

    const goal = targetGoal.current;
    if (goal) {
      const dist = controls.target.distanceTo(goal);
      if (dist < 0.15) {
        targetGoal.current = null;
      } else {
        const step = Math.min(1, delta * 4);
        const delta3 = goal.clone().sub(controls.target).multiplyScalar(step);
        controls.target.add(delta3);
        camera.position.add(delta3);
      }
    }
    controls.update();
  });

  return (
    <MapControls
      ref={controlsRef}
      makeDefault
      enableRotate
      minPolarAngle={0.35}
      maxPolarAngle={1.05}
      minAzimuthAngle={-0.7}
      maxAzimuthAngle={0.7}
      minDistance={7}
      maxDistance={55}
      dampingFactor={0.12}
      panSpeed={1.1}
      zoomSpeed={1.0}
      screenSpacePanning={false}
    />
  );
}
