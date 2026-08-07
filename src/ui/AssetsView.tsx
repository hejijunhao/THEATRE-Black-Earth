// Dev-only asset review route (v2-vision §8): open the app with #assets to
// see every miniature factory on a turntable, per faction and tier, with
// status from the asset ledger. No asset ships unreviewed.

import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { UnitType } from '../game/types';
import { makeEarthworksGeometry, makeMiniatureGeometry } from '../assets/units';
import { ifv, mrap, panzer, towedGun } from '../assets/vehicles';
import { makePanzerHero } from '../assets/panzerHero';
import { makeMechHero } from '../assets/heroMech';
import { makeArtilleryHero } from '../assets/heroArtillery';
import { makeReconHero } from '../assets/heroRecon';
import { mergeGeometries } from '../map/geomUtils';

// Hero factories under review, keyed alongside their map-LOD counterparts.
const REVIEW_UNITS = ['panzer', 'mech', 'arty', 'recon'] as const;
type ReviewUnit = (typeof REVIEW_UNITS)[number];
const HERO_MAKERS: Record<ReviewUnit, (f: 'UA' | 'RU') => { geometry: THREE.BufferGeometry; material: THREE.Material }> = {
  panzer: makePanzerHero,
  mech: makeMechHero,
  arty: makeArtilleryHero,
  recon: makeReconHero,
};
const MAP_LODS: Record<ReviewUnit, (f: 'UA' | 'RU') => THREE.BufferGeometry[]> = {
  panzer, mech: ifv, arty: towedGun, recon: mrap,
};

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

// Close-up single-vehicle turntable for factories still in ledger status
// `review` — scaled up so plate slopes and roof fit can actually be judged.
// `unit` picks the hero factory; `hero` swaps to its map-LOD counterpart.
function ReviewTurntable({ faction, hero, unit }: { faction: 'UA' | 'RU'; hero: boolean; unit: ReviewUnit }) {
  const ref = useRef<THREE.Group>(null);
  const mapGeometry = useMemo(() => mergeGeometries(MAP_LODS[unit](faction))!, [faction, unit]);
  const heroModel = useMemo(() => HERO_MAKERS[unit](faction), [faction, unit]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.45;
  });
  return (
    <group ref={ref} scale={1.5} position={[0, -0.07, 0]}>
      <mesh position={[0, -0.009, 0]}>
        <cylinderGeometry args={[0.17, 0.18, 0.018, 32]} />
        <meshStandardMaterial color={faction === 'UA' ? '#33507a' : '#67352c'} roughness={0.6} />
      </mesh>
      {hero
        ? <mesh geometry={heroModel.geometry} material={heroModel.material} />
        : <mesh geometry={mapGeometry} material={MAT} />}
    </group>
  );
}

export function AssetsView() {
  const [faction, setFaction] = useState<'UA' | 'RU'>('UA');
  const [tier, setTier] = useState<1 | 2 | 3 | 4>(4);
  const [extras, setExtras] = useState(false);
  const [hero, setHero] = useState(true);
  const [reviewUnit, setReviewUnit] = useState<ReviewUnit>('panzer');

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#1c1e1f', color: '#d8d2c0', fontFamily: 'IBM Plex Mono, monospace' }}>
      <div style={{ padding: '12px 18px', display: 'flex', gap: 16, alignItems: 'center', borderBottom: '1px solid #3a3c3a' }}>
        <strong>ASSET REVIEW</strong>
        <button onClick={() => setFaction(faction === 'UA' ? 'RU' : 'UA')}>faction: {faction}</button>
        <button onClick={() => setTier((tier % 4) + 1 as 1 | 2 | 3 | 4)}>tier: {tier}</button>
        <button onClick={() => setExtras(!extras)}>extras: {extras ? 'on' : 'off'}</button>
        <button onClick={() => setHero(!hero)}>review model: {hero ? 'hero' : 'map LOD'}</button>
        <button onClick={() => setReviewUnit(REVIEW_UNITS[(REVIEW_UNITS.indexOf(reviewUnit) + 1) % REVIEW_UNITS.length])}>
          review unit: {reviewUnit}
        </button>
        <span style={{ opacity: 0.6 }}>docs/asset-ledger.md · remove #assets from the URL to exit</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', height: 'calc(100% - 50px)' }}>
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
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center', zIndex: 1, textTransform: 'uppercase', fontSize: 12, letterSpacing: 2 }}>
            {reviewUnit} · review
          </div>
          <Canvas
            camera={{ position: [0.85, 0.62, 0.85], fov: 40 }}
            onCreated={({ gl, scene }) => {
              // Studio-style image-based lighting for PBR judgement calls —
              // local RoomEnvironment through PMREM, no network assets.
              const pmrem = new THREE.PMREMGenerator(gl);
              scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
              scene.environmentIntensity = 0.4;
              pmrem.dispose();
            }}
          >
            <hemisphereLight args={['#c8cfd4', '#3c3a30', 0.25]} />
            <directionalLight position={[2.5, 3, 1.5]} intensity={1.1} color="#f2ead8" />
            <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#b8c4d4" />
            <directionalLight position={[-1, 2.5, -2.5]} intensity={0.5} color="#e8e2d2" />
            <ReviewTurntable faction={faction} hero={hero} unit={reviewUnit} />
            <ContactShadows position={[0, -0.068, 0]} opacity={0.55} scale={1.3} blur={2.4} far={0.35} resolution={512} />
          </Canvas>
        </div>
      </div>
    </div>
  );
}
