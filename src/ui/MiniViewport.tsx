// Live miniature viewport in the unit panel (v2-vision §7.2): the selected
// formation's actual model, slowly turning. State renders exactly as it does
// on the map — same factory, same spec.

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { makeEarthworksGeometry, makeMiniatureBuild, tierFromStrength } from '../assets/units';
import { HeroFormation } from '../map/HeroFormation';
import { Unit } from '../game/types';

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05 });

function Model({ unit, fortified }: { unit: Unit; fortified: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const build = useMemo(
    () =>
      makeMiniatureBuild({
        type: unit.type,
        faction: unit.faction,
        tier: tierFromStrength(unit.strength),
        supplyTruck: unit.supply === 'full' || unit.supply === 'supplied',
        reinforcing: unit.reinforcing,
        disorganized: unit.disorganized > 0,
        smoke: unit.hasAttacked,
      }),
    [unit.type, unit.faction, unit.strength, unit.supply, unit.reinforcing, unit.disorganized, unit.hasAttacked],
  );
  const earthworks = useMemo(
    () => makeEarthworksGeometry(unit.entrenchment, fortified),
    [unit.entrenchment, fortified],
  );
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.45;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, -0.016, 0]}>
        <boxGeometry args={[0.74, 0.032, 0.52]} />
        <meshStandardMaterial color={unit.faction === 'UA' ? '#33507a' : '#67352c'} roughness={0.6} />
      </mesh>
      {build.props && <mesh geometry={build.props} material={MAT} />}
      {build.heroType && (
        <HeroFormation type={build.heroType} faction={unit.faction} slots={build.heroSlots} />
      )}
      {earthworks && <mesh geometry={earthworks} material={MAT} position={[0, -0.012, 0]} />}
    </group>
  );
}

export function MiniViewport({ unit, fortified }: { unit: Unit; fortified: boolean }) {
  return (
    <div className="unit-viewport">
      <Canvas camera={{ position: [0.72, 0.6, 0.72], fov: 38 }} dpr={[1, 2]}>
        <hemisphereLight args={['#c8cfd4', '#3c3a30', 0.85]} />
        <directionalLight position={[2, 3, 1.4]} intensity={1.5} color="#f2ead8" />
        <Model unit={unit} fortified={fortified} />
      </Canvas>
    </div>
  );
}
