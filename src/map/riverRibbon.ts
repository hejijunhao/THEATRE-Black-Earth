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
