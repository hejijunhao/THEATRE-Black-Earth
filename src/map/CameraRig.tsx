// Tilted strategic camera with pan/zoom, clamped to the theatre, plus smooth
// focus animation when the game asks to look at a tile (AI actions, alerts).

import { MapControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { tileWorldById } from '../game/hex';
import { useStore } from '../game/state/store';
import { setHexProjector } from './hexScreen';
import { bootCamera } from './lod';
import { tileGroundY } from './terrain/heightfield';
import { WORLD_W as MAP_W, WORLD_H as MAP_H } from './worldDims';

export function CameraRig() {
  const controlsRef = useRef<MapControlsImpl>(null);
  const focus = useStore((s) => s.cameraFocus);
  const screen = useStore((s) => s.screen);
  const targetGoal = useRef<THREE.Vector3 | null>(null);
  const { camera, gl } = useThree();
  const scratch = useRef(new THREE.Vector3());

  const frameFront = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const boot = bootCamera();
    controls.target.set(boot.tx, 0, boot.tz);
    camera.position.set(boot.px, boot.py, boot.pz);
    controls.update();
  };

  // Initial framing: Kupiansk–Sloviansk tight at mid-zoom. The scar is the hero.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    frameFront();
    const projectTile = (tile: string) => {
      const { wx, wz } = tileWorldById(tile);
      camera.updateMatrixWorld();
      const v = scratch.current.set(wx, tileGroundY(tile) + 0.05, wz).project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      return {
        tile,
        x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (-v.y * 0.5 + 0.5) * rect.height + rect.top,
        visible: Number.isFinite(v.x) && Number.isFinite(v.y),
      };
    };
    setHexProjector(projectTile);
    // Dev/automation camera hook (golden harness close-ups, playtest).
    (window as unknown as Record<string, unknown>).__TBE_CAMERA__ = {
      set: (px: number, py: number, pz: number, tx: number, tz: number) => {
        camera.position.set(px, py, pz);
        controls.target.set(tx, 0, tz);
        controls.update();
      },
      projectTile,
    };
    return () => setHexProjector(null);
  }, [camera, gl]);

  useEffect(() => {
    if (screen !== 'game') return;
    frameFront();
  }, [screen, camera]);

  useEffect(() => {
    if (!focus) return;
    const { wx, wz } = tileWorldById(focus.tile);
    targetGoal.current = new THREE.Vector3(wx, 0, wz);
  }, [focus?.seq]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    // Main-menu backdrop: a slow drift along the Dnipro (v2-vision §7.2).
    if (useStore.getState().screen === 'menu') {
      const t = state.clock.elapsedTime * 0.018;
      const cx = MAP_W * 0.52 + Math.sin(t) * MAP_W * 0.1;
      const cz = MAP_H * 0.42 + Math.cos(t * 0.7) * MAP_H * 0.08;
      controls.target.set(cx, 0, cz);
      camera.position.set(cx + 3, 15, cz + 11.5);
      controls.update();
      return;
    }
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
      maxDistance={80}
      dampingFactor={0.12}
      panSpeed={1.1}
      zoomSpeed={1.0}
      screenSpacePanning={false}
    />
  );
}
