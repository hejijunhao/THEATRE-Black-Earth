// Dev-only asset review route (v2-vision §8): open the app with #assets to
// see every miniature factory on a turntable, per faction and tier, with
// status from the asset ledger. No asset ships unreviewed.

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { UnitType } from '../game/types';
import { makeEarthworksGeometry, makeMiniatureGeometry } from '../assets/units';

const TYPES: UnitType[] = ['infantry', 'mechanized', 'armored', 'artillery', 'recon'];

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.05 });

function Turntable({ type, faction, tier, extras }: {
  type: UnitType;
  faction: 'UA' | 'RU';
  tier: 1 | 2 | 3 | 4;
  extras: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const geometry = useMemo(
    () =>
      makeMiniatureGeometry({
        type,
        faction,
        tier,
        supplyTruck: extras,
        reinforcing: extras,
        disorganized: false,
        smoke: extras,
      }),
    [type, faction, tier, extras],
  );
  const earthworks = useMemo(() => (extras ? makeEarthworksGeometry(3, true) : null), [extras]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.6;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, -0.016, 0]}>
        <boxGeometry args={[0.74, 0.032, 0.52]} />
        <meshStandardMaterial color={faction === 'UA' ? '#33507a' : '#67352c'} roughness={0.6} />
      </mesh>
      <mesh geometry={geometry} material={MAT} position={[0, 0.0, 0]} />
      {earthworks && <mesh geometry={earthworks} material={MAT} position={[0, -0.01, 0]} />}
    </group>
  );
}

export function AssetsView() {
  const [faction, setFaction] = useState<'UA' | 'RU'>('UA');
  const [tier, setTier] = useState<1 | 2 | 3 | 4>(4);
  const [extras, setExtras] = useState(false);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1c1e1f', color: '#d8d2c0', fontFamily: 'IBM Plex Mono, monospace' }}>
      <div style={{ padding: '12px 18px', display: 'flex', gap: 16, alignItems: 'center', borderBottom: '1px solid #3a3c3a' }}>
        <strong>ASSET REVIEW</strong>
        <button onClick={() => setFaction(faction === 'UA' ? 'RU' : 'UA')}>faction: {faction}</button>
        <button onClick={() => setTier((tier % 4) + 1 as 1 | 2 | 3 | 4)}>tier: {tier}</button>
        <button onClick={() => setExtras(!extras)}>extras: {extras ? 'on' : 'off'}</button>
        <span style={{ opacity: 0.6 }}>docs/asset-ledger.md · remove #assets from the URL to exit</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', height: 'calc(100% - 50px)' }}>
        {TYPES.map((type) => (
          <div key={type} style={{ borderRight: '1px solid #2c2e2c', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center', zIndex: 1, textTransform: 'uppercase', fontSize: 12, letterSpacing: 2 }}>
              {type}
            </div>
            <Canvas camera={{ position: [0.9, 0.75, 0.9], fov: 40 }}>
              <hemisphereLight args={['#c8cfd4', '#3c3a30', 0.9]} />
              <directionalLight position={[2, 3, 1]} intensity={1.4} color="#f2ead8" />
              <Turntable type={type} faction={faction} tier={tier} extras={extras} />
            </Canvas>
          </div>
        ))}
      </div>
    </div>
  );
}
