// Terrain decorations: forest cone clusters, urban block clusters, town
// markers, city label sprites and fortification rings. Everything is
// deterministic from tile coordinates (no per-frame randomness).

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hashSeed } from '../game/rng';
import { useStore } from '../game/state/store';
import { tileWorld, tileWorldById } from '../game/hex';
import {
  FOREST_EMIT_SOUTH, FOREST_NORTH, FOREST_SNOW, FOREST_SOUTH,
  forestStemCount, forestStemScale, northForestWeight,
} from './forestPaint';
import { makeLabelTexture } from './textures';
import { groundY, hexFracs, tileGroundY } from './terrain/heightfield';
import { cbox, ccyl, ctrap, paint } from '../assets/parts';
import { mergeGeometries } from './geomUtils';
import { CORRIDORS } from '../game/scenarios/blackEarth2025';
import { RIVER_COURSES } from './data/terrainData';
import { riverRibbon } from './riverRibbon';
import { leafAtlas, woodlandGeometry } from './foliage';
import { WORLD_H } from './worldDims';

function jitter(x: number, y: number, salt: number): number {
  return ((hashSeed(`${x}:${y}:${salt}`) % 1000) / 1000 - 0.5);
}

/** Keep settlement footprints on the bank, even where a town crosses a meander. */
function dryBuildingPosition(x: number, z: number): [number, number] {
  for (let pass = 0; pass < 2; pass++) for (const course of RIVER_COURSES) {
    const clearance = course.width * (course.name === 'Dnipro' ? 0.55 : 0.35) / 2 + 0.14;
    for (let i = 0; i < course.points.length - 1; i++) {
      const a = course.points[i], b = course.points[i + 1];
      const vx = b[0] - a[0], vz = b[1] - a[1];
      const length2 = vx * vx + vz * vz;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (length2 || 1)));
      const dx = x - (a[0] + vx * t), dz = z - (a[1] + vz * t);
      const distance = Math.hypot(dx, dz);
      if (distance >= clearance) continue;
      const nx = distance > 0.0001 ? dx / distance : -vz / (Math.sqrt(length2) || 1);
      const nz = distance > 0.0001 ? dz / distance : vx / (Math.sqrt(length2) || 1);
      x += nx * (clearance - distance); z += nz * (clearance - distance);
    }
  }
  return [x, z];
}

/** Low masonry, pitched slate / oxidised roofs, eaves and recessed windows. */
function townGeometry(): THREE.BufferGeometry {
  const parts = [
    cbox(0.15, 0.073, 0.10, '#a09880', 0, 0.037, 0),
    cbox(0.162, 0.009, 0.113, '#4a453a', 0, 0.078, 0),
    ctrap(0.164, 0.115, 0.164, 0.001, 0.043, '#65584b', 0, 0.082, 0),
    cbox(0.012, 0.043, 0.014, '#786d59', -0.044, 0.116, 0.017),
    cbox(0.018, 0.035, 0.002, '#393b33', 0.045, 0.023, 0.051),
  ];
  for (const x of [-0.051, -0.017, 0.018, 0.052]) for (const z of [-0.051, 0.051]) {
    parts.push(cbox(0.013, 0.018, 0.002, '#43473e', x, 0.051, z));
    parts.push(cbox(0.019, 0.003, 0.004, '#b0a389', x, 0.041, z));
  }
  // Fine roof courses, gutters, ridge caps and masonry foundations.
  parts.push(cbox(.154,.009,.105,'#6c695c',0,.005,0));
  parts.push(cbox(.17,.007,.009,'#887663',0,.125,0));
  parts.push(cbox(.017,.005,.019,'#514c43',-.044,.139,.017));
  for(const side of [-1,1]) {
    parts.push(cbox(.17,.004,.005,'#57594e',0,.081,side*.056));
    for(let k=1;k<6;k++) {
      const z=side*k*.009;
      parts.push(cbox(.164,.002,.002,'#786758',0,.125-Math.abs(z)*.74,z));
    }
    for(const x of [-.05,-.017,.018,.052]) {
      parts.push(cbox(.002,.017,.003,'#aaa18b',x,.051,side*.052));
    }
  }
  return mergeGeometries(parts)!;
}

export function Forests() {
  const game = useStore((s) => s.game);
  const snow = game?.weather === 'snow';
  const leaves = useMemo(() => leafAtlas(), []);
  useEffect(() => () => leaves.dispose(), [leaves]);

  const { geometry, count, matrices } = useMemo(() => {
    if (!game) return { geometry: null, count: 0, matrices: [] as THREE.Matrix4[] };
    const geometry = woodlandGeometry();
    const matrices: THREE.Matrix4[] = [];
    for (const tile of Object.values(game.tiles)) {
      const frac = hexFracs(tile.x, tile.y).forest;
      const isForest = tile.terrain === 'forest';
      // Shelter belts: sparse trees on partially wooded steppe hexes, so
      // partial cover reads as woodland rather than as albedo darkening.
      if (!isForest && (frac < 0.14 || tile.terrain === 'water')) continue;
      const { wx, wz } = tileWorld(tile.x, tile.y);
      // Density follows the geodata forest fraction, thinned on the far
      // north so rain AO cannot pile a charcoal band on the horizon.
      const n = forestStemCount(isForest, frac, wz, hashSeed(tile.id), WORLD_H) * 3;
      for (let k = 0; k < n; k++) {
        let dx = jitter(tile.x, tile.y, k * 3 + 1) * 1.4;
        let dz = jitter(tile.x, tile.y, k * 3 + 2) * 1.2;
        const r = Math.hypot(dx, dz);
        // Leave the formation anchor clear, including when formations move.
        if (r < 0.53) { dx *= 0.53 / Math.max(r, 0.01); dz *= 0.53 / Math.max(r, 0.01); }
        const s = forestStemScale(0.75 + (jitter(tile.x, tile.y, k * 3 + 3) + 0.5) * 0.6, wz, WORLD_H);
        const gy = groundY(wx + dx, wz + dz);
        const m = new THREE.Matrix4()
          .makeScale(s * 1.1, s * 0.85, s)
          .setPosition(wx + dx, gy - 0.012, wz + dz);
        matrices.push(m);
      }
    }
    return { geometry, count: matrices.length, matrices };
  }, [game?.scenario.id]);

  const meshRef = useRef<THREE.InstancedMesh | null>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const col = new THREE.Color();
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      const wz = m.elements[14];
      const north = northForestWeight(wz, WORLD_H);
      if (snow) col.set(FOREST_SNOW);
      else col.set(FOREST_SOUTH).lerp(new THREE.Color(FOREST_NORTH), north);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [matrices, count, snow]);

  if (!geometry || count === 0) return null;
  return (
    <instancedMesh
      args={[geometry, undefined, count]}
      ref={meshRef}
      castShadow
      receiveShadow
      raycast={() => null}
    >
      <meshStandardMaterial
        color="#ffffff"
        map={leaves}
        alphaTest={0.42}
        alphaToCoverage
        side={THREE.DoubleSide}
        roughness={0.94}
        vertexColors
        emissive={snow ? FOREST_SNOW : FOREST_EMIT_SOUTH}
        emissiveIntensity={snow ? 0.12 : 0.12}
      />
    </instancedMesh>
  );
}

export function UrbanBlocks() {
  const game = useStore((s) => s.game);

  const { geometry, count, matrices } = useMemo(() => {
    if (!game) return { geometry: null, count: 0, matrices: [] as THREE.Matrix4[] };
    const geometry = townGeometry();
    const matrices: THREE.Matrix4[] = [];
    for (const tile of Object.values(game.tiles)) {
      const isUrban = tile.terrain === 'urban';
      const isTown = !!tile.cityId && !isUrban;
      if (!isUrban && !isTown) continue;
      const { wx, wz } = tileWorld(tile.x, tile.y);
      const n = isUrban ? 24 : 12;
      for (let k = 0; k < n; k++) {
        const dx = -0.55 + (k % 6 - 2.5) * 0.14 + jitter(tile.x, tile.y, k * 5 + 11) * 0.025;
        const dz = -0.48 + (Math.floor(k / 6) - (isUrban ? 1.5 : 0.5)) * 0.17 + jitter(tile.x, tile.y, k * 5 + 12) * 0.035;
        const sy = 0.7 + (jitter(tile.x, tile.y, k * 5 + 13) + 0.5) * 0.75;
        const sxz = 0.62 + (jitter(tile.x, tile.y, k * 5 + 14) + 0.5) * 0.32;
        const [bx, bz] = dryBuildingPosition(wx + dx, wz + dz);
        const gy = groundY(bx, bz);
        const m = new THREE.Matrix4()
          .makeScale(sxz, sy, sxz)
          .setPosition(bx, gy, bz);
        matrices.push(m);
      }
    }
    return { geometry, count: matrices.length, matrices };
  }, [game?.scenario.id]);

  const meshRef = useMemo(() => ({ current: null as THREE.InstancedMesh | null }), []);

  if (!geometry || count === 0) return null;
  return (
    <instancedMesh
      args={[geometry, undefined, count]}
      ref={(mesh) => {
        if (mesh && meshRef.current !== mesh) {
          meshRef.current = mesh;
          matrices.forEach((m, i) => {
            mesh.setMatrixAt(i, m);
            mesh.setColorAt(i, new THREE.Color(['#ffffff', '#ccc7b7', '#ddd7c8', '#b9bcb1'][i % 4]));
          });
          mesh.instanceMatrix.needsUpdate = true;
        }
      }}
      castShadow
    >
      <meshStandardMaterial vertexColors roughness={0.92} />
    </instancedMesh>
  );
}

function CityLabel({ cityId }: { cityId: string }) {
  const game = useStore((s) => s.game)!;
  const city = game.cities[cityId];
  const tile = game.tiles[city.tile];

  const { texture, aspect } = useMemo(
    () => makeLabelTexture(city.name, city.size, tile.controller),
    [city.name, city.size],
  );

  const { wx, wz } = tileWorldById(city.tile);
  const top = tileGroundY(city.tile);
  const scale = city.size === 'capital' ? 3.1 : city.size === 'major' ? 2.5 : 1.75;

  return (
    <sprite position={[wx, top + 1.2, wz]} scale={[scale * aspect * 0.16, scale * 0.16, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

export function CityMarkers() {
  const game = useStore((s) => s.game);
  const cityIds = useMemo(() => (game ? Object.keys(game.cities) : []), [game?.scenario.id]);
  if (!game) return null;
  return (
    <group>
      {cityIds.map((id) => (
        <CityLabel key={id} cityId={id} />
      ))}
    </group>
  );
}

// Fortification rings on fortified tiles (rebuilds when tiles change).
export function Fortifications() {
  const game = useStore((s) => s.game);

  const positions = useMemo(() => {
    if (!game) return [];
    return Object.values(game.tiles)
      .filter((t) => t.fortified)
      .map((t) => {
        const { wx, wz } = tileWorld(t.x, t.y);
        return { wx, wz, y: tileGroundY(t.id) + 0.05, id: t.id };
      });
  }, [game?.tiles]);

  const ringGeo = useMemo(() => {
    const g = new THREE.RingGeometry(0.62, 0.72, 6);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI / 6);
    return g;
  }, []);

  return (
    <group>
      {positions.map((p) => (
        <mesh key={p.id} geometry={ringGeo} position={[p.wx, p.y, p.wz]}>
          <meshBasicMaterial color="#8a7a55" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** A narrow compacted surface and dusty shoulder on the existing corridors. */
export function RoadStrips() {
  const geometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const road of CORRIDORS) {
      if (road.rail) continue;
      let pts: Array<[number, number]> = road.path.map(([x, z]) => {
        const p = tileWorld(x, z); return [p.wx, p.wz];
      });
      for (let pass = 0; pass < 2; pass++) {
        const next: Array<[number, number]> = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          next.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]);
          next.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
        }
        next.push(pts[pts.length - 1]); pts = next;
      }
      parts.push(paint(riverRibbon(pts, .048, groundY), '#73634d'));
      parts.push(paint(riverRibbon(pts, .025, (x, z) => groundY(x, z) + .003), '#4f4b3e'));
    }
    return mergeGeometries(parts);
  }, []);
  return geometry ? <mesh geometry={geometry} raycast={() => null}><meshLambertMaterial vertexColors /></mesh> : null;
}
