// The fighting vehicles of one formation, shared by the map and the #assets
// review rig so the two can never drift apart.
//
// Every element is the same shared hero geometry drawn at a different
// transform, so a tier-4 armored division costs one draw call and one copy
// of a ~19k-triangle model. Merging the vehicles into the miniature the way
// the old low-poly ones were would bake megabytes of duplicated vertices
// into every cache key (see assets/units.ts).

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FactionId } from '../game/types';
import { HeroUnitType, heroGeometry, heroMaterial } from '../assets/heroFleet';
import { HeroSlot } from '../assets/units';

export function HeroFormation({ type, faction, slots }: {
  type: HeroUnitType;
  faction: FactionId;
  slots: HeroSlot[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => heroGeometry(type, faction), [type, faction]);

  useEffect(() => {
    const im = ref.current;
    if (!im) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const unit = new THREE.Vector3(1, 1, 1);
    slots.forEach((s, i) => {
      // YXZ applies the roll before the heading, matching parts.ts place().
      q.setFromEuler(new THREE.Euler(0, s.ry, s.rz, 'YXZ'));
      p.set(s.x, 0, s.z);
      im.setMatrixAt(i, m.compose(p, q, unit));
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [slots, geometry]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, heroMaterial(type), slots.length]} // MECH/ARTY unlit stamp; armor wash unchanged
      castShadow
    />
  );
}
