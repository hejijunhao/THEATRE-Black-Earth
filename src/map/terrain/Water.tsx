// Water (v2-vision §4.2): the sea as a shader plane — scrolling normal noise,
// depth tint from a shore-distance field, foam at the coast, a restrained sun
// term — and the rivers as ribbons following their REAL courses (the rules
// keep the hex-edge river set; the visual follows the geography it encodes).

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sharedEdge } from '../../game/hex';
import { useStore } from '../../game/state/store';
import { RIVER_COURSES, WORLD_H, WORLD_W } from '../data/terrainData';
import { WEATHER_ENV } from '../palette';
import { ALBEDO_MARGIN } from './albedo';
import { SEA_LEVEL_Y, getShoreField, groundY } from './heightfield';
import { mergeGeometries } from '../geomUtils';
import { riverRibbon } from '../riverRibbon';

function makeShoreTexture(): THREE.DataTexture {
  const { data, w, h } = getShoreField();
  const bytes = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i++) bytes[i] = Math.round(data[i] * 255);
  const tex = new THREE.DataTexture(bytes, w, h, THREE.RedFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// Tileable value-noise normal map, generated on a canvas.
function makeNoiseTexture(): THREE.CanvasTexture {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const h = (x: number, y: number, s: number) => {
    let v = Math.imul(((x % S) + S) % S, 374761393) + Math.imul(((y % S) + S) % S, 668265263) + s;
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
  };
  const val = (x: number, y: number, freq: number, s: number) => {
    const fx = (x / S) * freq;
    const fy = (y / S) * freq;
    const xi = Math.floor(fx);
    const yi = Math.floor(fy);
    const tx = fx - xi;
    const ty = fy - yi;
    const sm = (t: number) => t * t * (3 - 2 * t);
    const g = (ix: number, iy: number) => h(((ix % freq) + freq) % freq, ((iy % freq) + freq) % freq, s);
    return (
      g(xi, yi) * (1 - sm(tx)) * (1 - sm(ty)) +
      g(xi + 1, yi) * sm(tx) * (1 - sm(ty)) +
      g(xi, yi + 1) * (1 - sm(tx)) * sm(ty) +
      g(xi + 1, yi + 1) * sm(tx) * sm(ty)
    );
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = val(x, y, 8, 11) * 0.6 + val(x, y, 21, 13) * 0.4;
      const o = (y * S + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(n * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function Sea() {
  const weather = useStore((s) => s.game?.weather ?? 'overcast');
  const mapMode = useStore((s) => s.mapMode);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const spanX = WORLD_W + ALBEDO_MARGIN * 2;
    const spanZ = WORLD_H + ALBEDO_MARGIN * 2;
    const geometry = new THREE.PlaneGeometry(spanX, spanZ, 1, 1);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(spanX / 2 - ALBEDO_MARGIN, SEA_LEVEL_Y, spanZ / 2 - ALBEDO_MARGIN);
    const uniforms = {
      uTime: { value: 0 },
      uNoise: { value: makeNoiseTexture() },
      uShore: { value: makeShoreTexture() },
      uWorld: { value: new THREE.Vector2(WORLD_W, WORLD_H) },
      uSky: { value: new THREE.Color('#8d949a') },
      uSunDir: { value: new THREE.Vector3(0.42, 0.72, 0.2).normalize() },
      uSunIntensity: { value: 0.8 },
      uFogColor: { value: new THREE.Color('#8d949a') },
      uFogDensity: { value: 0.009 },
      uCamPos: { value: new THREE.Vector3() },
      uPaper: { value: 0 },
    };
    return { geometry, uniforms };
  }, []);

  useFrame(({ camera }, delta) => {
    uniforms.uTime.value += delta;
    const env = WEATHER_ENV[weather];
    uniforms.uSky.value.set(env.sky);
    uniforms.uFogColor.value.set(env.fog);
    uniforms.uFogDensity.value = env.fogDensity;
    uniforms.uSunIntensity.value = env.sun * 0.55;
    uniforms.uCamPos.value.copy(camera.position);
    const paperTarget = mapMode === 'political' ? 1 : 0;
    uniforms.uPaper.value += (paperTarget - uniforms.uPaper.value) * Math.min(1, delta * 5.5);
  });

  const vertexShader = /* glsl */ `
    varying vec3 vPos;
    void main() {
      vPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = /* glsl */ `
    varying vec3 vPos;
    uniform float uTime;
    uniform sampler2D uNoise;
    uniform sampler2D uShore;
    uniform vec2 uWorld;
    uniform vec3 uSky;
    uniform vec3 uSunDir;
    uniform float uSunIntensity;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform vec3 uCamPos;
    uniform float uPaper;

    void main() {
      vec2 suv = vPos.xz / uWorld;
      float shore = texture2D(uShore, suv).r; // 0 land .. 1 open sea
      if (shore <= 0.001) discard;            // over land: terrain covers us

      // Two scrolling noise layers as a cheap normal perturbation.
      vec2 uv1 = vPos.xz * 0.16 + vec2(uTime * 0.012, uTime * 0.008);
      vec2 uv2 = vPos.xz * 0.31 - vec2(uTime * 0.009, uTime * 0.014);
      float n1 = texture2D(uNoise, uv1).r;
      float n2 = texture2D(uNoise, uv2).r;
      float bump = (n1 + n2) - 1.0;
      vec3 normal = normalize(vec3(bump * 0.35, 1.0, bump * 0.28));

      // Depth tint: bright shallows at the coast, dark open water.
      vec3 deep = vec3(0.135, 0.185, 0.240);
      vec3 shallow = vec3(0.230, 0.300, 0.345);
      vec3 col = mix(shallow, deep, smoothstep(0.03, 0.5, shore));

      // Sky reflection with a soft fresnel.
      vec3 viewDir = normalize(uCamPos - vPos);
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0);
      col = mix(col, uSky * 0.9, 0.25 + fresnel * 0.35);

      // Restrained sun lane.
      vec3 refl = reflect(-uSunDir, normal);
      float spec = pow(max(dot(refl, viewDir), 0.0), 90.0) * uSunIntensity;
      col += vec3(0.98, 0.92, 0.78) * spec;

      // Shoreline foam: a noisy band hugging the coast.
      float foam = (1.0 - smoothstep(0.015, 0.11, shore)) * smoothstep(0.002, 0.015, shore);
      float foamN = texture2D(uNoise, vPos.xz * 0.6 + vec2(0.0, uTime * 0.02)).r;
      col += vec3(0.75, 0.78, 0.78) * foam * smoothstep(0.35, 0.75, foamN) * 0.5;

      // Parchment mode: the Vic2 flat ink-wash ocean.
      col = mix(col, vec3(0.5, 0.57, 0.58), uPaper);

      // Exp2 fog to match the scene.
      float dist = length(uCamPos - vPos);
      float fogF = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
      col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0) * (1.0 - uPaper * 0.7));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  return (
    <mesh geometry={geometry} renderOrder={1}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

// Rivers as draped ribbons along their real courses.
export function RiverRibbons() {
  const game = useStore((s) => s.game);

  const { riverGeo, bridgeGeo } = useMemo(() => {
    if (!game) return { riverGeo: null, bridgeGeo: null };

    const strips: THREE.BufferGeometry[] = [];
    for (const course of RIVER_COURSES) {
      const pts = course.points;
      if (pts.length < 2) continue;
      // Keep the Dnipro broader while tributaries remain fine map lines.
      const widthScale = course.name === 'Dnipro' ? 0.55 : 0.35;
      // Chaikin smoothing pass for gentler meanders.
      const sm: Array<[number, number]> = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i];
        const [bx, bz] = pts[i + 1];
        sm.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25]);
        sm.push([ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
      }
      sm.push(pts[pts.length - 1]);

      strips.push(riverRibbon(sm, course.width * widthScale, groundY));
    }

    // Bridge decks at the rules' bridge edges (contested crossings must read).
    const decks: THREE.BufferGeometry[] = [];
    for (const key of game.bridgeEdges) {
      const [aId, bId] = key.split('|');
      const edge = sharedEdge(aId, bId);
      if (!edge) continue;
      const y = groundY(edge.mx, edge.mz) + 0.05;
      const deck = new THREE.BoxGeometry(0.5, 0.045, 0.14);
      const angle = Math.atan2(edge.ez, edge.ex);
      const m = new THREE.Matrix4().makeRotationY(-angle + Math.PI / 2).setPosition(edge.mx, y, edge.mz);
      deck.applyMatrix4(m);
      decks.push(deck);
    }

    return { riverGeo: mergeGeometries(strips), bridgeGeo: mergeGeometries(decks) };
  }, [game?.scenario.id]);

  if (!riverGeo) return null;
  return (
    <group>
      <mesh geometry={riverGeo} renderOrder={2} raycast={() => null}>
        <meshBasicMaterial color="#435457" />
      </mesh>
      {bridgeGeo && (
        <mesh geometry={bridgeGeo}>
          <meshStandardMaterial color="#6d6252" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}
