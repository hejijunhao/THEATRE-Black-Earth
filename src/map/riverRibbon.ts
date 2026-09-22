import * as THREE from 'three';

/** Sample both banks against the ground; long course segments must not cut
 * through relief. Upward winding keeps the river visible from the map camera. */
export function riverRibbon(
  course: readonly (readonly [number, number])[],
  width: number,
  elevation: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const points: Array<readonly [number, number]> = [];
  for (let i = 0; i < course.length - 1; i++) {
    const a = course[i], b = course[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.16));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  if (course.length) points.push(course[course.length - 1]);
  const positions: number[] = [], indices: number[] = [];
  points.forEach(([x, z], i) => {
    const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    const dx = next[0] - prev[0], dz = next[1] - prev[1];
    const length = Math.hypot(dx, dz) || 1;
    const nx = -dz / length * width / 2, nz = dx / length * width / 2;
    const y = Math.max(elevation(x, z), elevation(x + nx, z + nz), elevation(x - nx, z - nz)) + 0.035;
    positions.push(x + nx, y, z + nz, x - nx, y, z - nz);
    if (i) {
      const b = i * 2;
      indices.push(b - 2, b, b - 1, b - 1, b, b + 1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** A continuous cross-section: dry verge, wet bank, shallows, deep channel.
 * Shares the draped centreline, so the banks never float over the water. */
export function bankedRiverRibbon(
  course: readonly (readonly [number, number])[], width: number,
  elevation: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const base = riverRibbon(course, width + 0.055, elevation);
  const source = base.getAttribute('position');
  const sections = [0, 0.08, 0.18, 0.50, 0.82, 0.92, 1];
  const palette = ['#61563f', '#494637', '#46524a', '#3e4e49', '#46524a', '#494637', '#61563f'].map(c => new THREE.Color(c));
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let i = 0; i < source.count / 2; i++) {
    const a = i * 2, b = a + 1;
    for (let k = 0; k < sections.length; k++) {
      const t = sections[k];
      const x = THREE.MathUtils.lerp(source.getX(a), source.getX(b), t);
      const z = THREE.MathUtils.lerp(source.getZ(a), source.getZ(b), t);
      const y = source.getY(a) + (k === 0 || k === 6 ? 0.002 : k === 1 || k === 5 ? 0.005 : 0.003);
      positions.push(x, y, z);
      const c = palette[k].clone().multiplyScalar(0.96 + Math.sin(x * 37 + z * 19) * 0.04);
      colors.push(c.r, c.g, c.b);
      if (i && k < 6) {
        const v = i * 7 + k;
        indices.push(v - 7, v, v - 6, v - 6, v, v + 1);
      }
    }
  }
  base.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
