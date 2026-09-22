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
import { groundY } from './terrain/heightfield';
import { HeroSlot } from '../assets/units';

export function HeroFormation({ type, faction, slots, ground }: {
  type: HeroUnitType;
  faction: FactionId;
  slots: HeroSlot[];
  ground?: { x: number; z: number; y: number; heading: number; scale: number };
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
      let y = 0;
      if (ground) {
        const c = Math.cos(ground.heading), sn = Math.sin(ground.heading);
        const sample = (x: number, z: number) => groundY(
          ground.x + (x * c + z * sn) * ground.scale,
          ground.z + (-x * sn + z * c) * ground.scale,
        );
        y = (sample(s.x, s.z) - ground.y) / ground.scale;
        const dx = (sample(s.x + .08, s.z) - sample(s.x - .08, s.z)) / (.16 * ground.scale);
        const dz = (sample(s.x, s.z + .05) - sample(s.x, s.z - .05)) / (.10 * ground.scale);
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.atan(dz), 0, -Math.atan(dx)));
        // A rotation around z raises +x; around x lowers +z.
        tilt.invert();
        q.premultiply(tilt);
      }
      p.set(s.x, y, s.z);
      im.setMatrixAt(i, m.compose(p, q, unit));
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [slots, geometry, ground?.x, ground?.z, ground?.y, ground?.heading, ground?.scale]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, heroMaterial(type), slots.length]}
      castShadow
      receiveShadow
    />
  );
}
