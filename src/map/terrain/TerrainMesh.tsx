// The continuous relief surface (v2-vision §4.1). One displaced, lit mesh
// replaces the v1 hex prisms. The material is a MeshStandardMaterial with
// injected shader chunks: painted albedo + dynamic per-hex tint + a
// camera/selection-driven hex overlay seam + snow + map-edge fade. Picking is
// world-position -> hex inverse math against an invisible flat plane.

import { ThreeEvent, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MAP_H, MAP_W } from '../../game/scenarios/blackEarth2025';
import { useStore } from '../../game/state/store';
import { TileId } from '../../game/types';
import { WORLD_H, WORLD_W } from '../data/terrainData';
import { ALBEDO_MARGIN, makeAlbedoTexture } from './albedo';
import { groundY } from './heightfield';
import { makeTintTexture, updateTintTexture } from './tint';

const HEXW = Math.sqrt(3);

// Geometry resolution (one draw call; Low preset can decimate later).
const SEG_X = 288;

function buildGeometry(): THREE.PlaneGeometry {
  const spanX = WORLD_W + ALBEDO_MARGIN * 2;
  const spanZ = WORLD_H + ALBEDO_MARGIN * 2;
  const segX = SEG_X;
  const segZ = Math.round((SEG_X * spanZ) / spanX);
  const geo = new THREE.PlaneGeometry(spanX, spanZ, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  // Plane is centred at origin; shift so it covers [-margin, WORLD+margin].
  geo.translate(spanX / 2 - ALBEDO_MARGIN, 0, spanZ / 2 - ALBEDO_MARGIN);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i);
    const wz = pos.getZ(i);
    pos.setY(i, groundY(wx, wz));
  }
  geo.computeVertexNormals();
  return geo;
}

// GLSL: odd-r pointy-top world->hex + hex-edge seam. Mirrors src/game/hex.ts.
const HEX_GLSL = /* glsl */ `
  vec2 hexCellCenter(vec2 p, out vec2 cell) {
    float rf = p.y / 1.5;
    float qf = p.x / ${HEXW.toFixed(8)} - rf * 0.5;
    float sf = -qf - rf;
    float rq = floor(qf + 0.5);
    float rr = floor(rf + 0.5);
    float rs = floor(sf + 0.5);
    float dq = abs(rq - qf);
    float dr = abs(rr - rf);
    float ds = abs(rs - sf);
    if (dq > dr && dq > ds) { rq = -rr - rs; }
    else if (dr > ds) { rr = -rq - rs; }
    float m = mod(rr, 2.0);
    float col = rq + (rr - m) * 0.5;
    cell = vec2(col, rr);
    float cx = (col + m * 0.5) * ${HEXW.toFixed(8)};
    float cz = rr * 1.5;
    return vec2(cx, cz);
  }
  float hexEdgeDist(vec2 local) {
    float d1 = abs(local.x);
    float d2 = abs(0.5 * local.x + ${(Math.sqrt(3) / 2).toFixed(8)} * local.y);
    float d3 = abs(0.5 * local.x - ${(Math.sqrt(3) / 2).toFixed(8)} * local.y);
    return max(d1, max(d2, d3));
  }
`;

export function TerrainMesh() {
  const game = useStore((s) => s.game);
  const mapMode = useStore((s) => s.mapMode);
  const selectTile = useStore((s) => s.selectTile);
  const hoverTile = useStore((s) => s.hoverTile);
  const selectedUnitId = useStore((s) => s.selectedUnitId);

  const geometry = useMemo(() => buildGeometry(), []);
  const albedo = useMemo(() => makeAlbedoTexture(), []);
  const tint = useMemo(() => makeTintTexture(), []);

  const uniforms = useMemo(
    () => ({
      uAlbedo: { value: albedo },
      uTint: { value: tint },
      uOrigin: { value: new THREE.Vector2(-ALBEDO_MARGIN, -ALBEDO_MARGIN) },
      uSpan: {
        value: new THREE.Vector2(WORLD_W + ALBEDO_MARGIN * 2, WORLD_H + ALBEDO_MARGIN * 2),
      },
      uGrid: { value: new THREE.Vector2(MAP_W, MAP_H) },
      uHexOpacity: { value: 0.16 },
      uSnow: { value: 0 },
      uCloud: { value: 0 },
      uCloudTime: { value: 0 },
      // Political mode is a different RENDERER (v2-vision §5): parchment,
      // flat washes, graticule. 0 = terrain, 1 = paper; lerped ~400 ms.
      uPaper: { value: 0 },
    }),
    [albedo, tint],
  );

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.90,
      metalness: 0.02,
      // Quiet soil keep-alive — far-north loft only. A midground emissive
      // wash lifted crushed chernozem back toward umber/ochre.
      emissive: new THREE.Color('#2a1e12'),
      emissiveIntensity: 0.016,
    });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vWorldPos3;',
        )
        .replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\nvWorldPos3 = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWorldPos3;
          uniform sampler2D uAlbedo;
          uniform sampler2D uTint;
          uniform vec2 uOrigin;
          uniform vec2 uSpan;
          uniform vec2 uGrid;
          uniform float uHexOpacity;
          uniform float uSnow;
          uniform float uCloud;
          uniform float uCloudTime;
          uniform float uPaper;
          vec3 uSoilGround;
          ${HEX_GLSL}
          // Cheap 2-octave value noise for drifting cloud shadow patches.
          float chash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float cnoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u2 = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(chash(i), chash(i + vec2(1.0, 0.0)), u2.x),
              mix(chash(i + vec2(0.0, 1.0)), chash(i + vec2(1.0, 1.0)), u2.x),
              u2.y);
          }`,
        )
        .replace(
          '#include <map_fragment>',
          `{
            vec2 wp = vWorldPos3.xz;
            vec2 auv = (wp - uOrigin) / uSpan;
            vec3 ground = texture2D(uAlbedo, auv).rgb;

            // Snow cover (uniform-driven; water plane handles the sea).
            ground = mix(ground, vec3(0.72, 0.74, 0.76), uSnow * 0.5 * (1.0 - uPaper));

            // Parchment base: warm paper with faint grain.
            if (uPaper > 0.001) {
              float grain = cnoise(wp * 3.1) * 0.05 + cnoise(wp * 0.5) * 0.04;
              vec3 paper = vec3(0.84, 0.81, 0.71) - grain;
              ground = mix(ground, paper, uPaper * 0.92);
            }

            // Per-hex tint wash (control / mode / fog / off-map fade).
            vec2 cell;
            vec2 center = hexCellCenter(wp, cell);
            if (cell.x >= 0.0 && cell.x < uGrid.x && cell.y >= 0.0 && cell.y < uGrid.y) {
              vec2 tuv = (cell + 0.5) / uGrid;
              vec4 tintc = texture2D(uTint, tuv);
              // On paper, washes become stronger flat fills that KEEP their
              // hue (the weather grade is bypassed in this mode).
              vec3 tcol = tintc.rgb;
              float ta = mix(tintc.a, min(0.8, tintc.a * 3.3), uPaper);
              ground = mix(ground, tcol, ta);
              // Hex overlay seam, faded on paper.
              float d = hexEdgeDist(wp - center);
              float seam = smoothstep(${(Math.sqrt(3) / 2 - 0.085).toFixed(4)}, ${(Math.sqrt(3) / 2 - 0.012).toFixed(4)}, d);
              float northLatSeam = 1.0 - clamp(wp.y / ${WORLD_H.toFixed(4)}, 0.0, 1.0);
              float seamDark = mix(0.78, 0.90, northLatSeam);
              ground = mix(ground, ground * seamDark, seam * uHexOpacity * (1.0 - uPaper * 0.85));
            } else {
              vec3 haze = mix(vec3(0.80, 0.74, 0.52), vec3(0.84, 0.80, 0.68), uPaper);
              ground = mix(ground, haze, mix(0.55, 0.97, uPaper));
            }
            // Printed graticule on paper (1° lon/lat over the linear mapping).
            if (uPaper > 0.001) {
              float gx = abs(fract(wp.x / ${(82.272 / 17.2).toFixed(4)}) - 0.5);
              float gz = abs(fract(wp.y / ${(52.5 / 7.8).toFixed(4)}) - 0.5);
              float grat = (1.0 - smoothstep(0.0, 0.012, min(gx, gz) * ${(82.272 / 17.2).toFixed(4)} / 4.783));
              ground = mix(ground, ground * 0.8, grat * uPaper * 0.5);
            }
            // Cloud shadows drifting over the ground under heavy weather.
            if (uCloud > 0.01) {
              vec2 cuv = wp * 0.045 + vec2(uCloudTime * 0.010, uCloudTime * 0.004);
              float cl = cnoise(cuv) * 0.6 + cnoise(cuv * 2.3 + 7.0) * 0.4;
              float shade = smoothstep(0.52, 0.78, cl) * uCloud * (1.0 - uPaper);
              ground *= 1.0 - shade * 0.10;
            }
            // Far-north keep only. A midground luma floor was the ochre
            // plate — it lifted crushed chernozem back to umber wash.
            float northLat = 1.0 - clamp(wp.y / ${WORLD_H.toFixed(4)}, 0.0, 1.0);
            vec3 soilKeep = vec3(0.48, 0.36, 0.20);
            float keep = smoothstep(0.70, 0.96, northLat);
            ground = mix(ground, mix(max(ground, soilKeep), soilKeep, 0.50), keep * 0.38);
            float luma = dot(ground, vec3(0.2126, 0.7152, 0.0722));
            float floorL = 0.22 * keep;
            if (keep > 0.001 && luma < floorL) {
              vec3 lifted = mix(ground, soilKeep, 0.40);
              float luma2 = dot(lifted, vec3(0.2126, 0.7152, 0.0722));
              ground = luma2 < floorL ? lifted * (floorL / max(luma2, 0.001)) : lifted;
            }
            uSoilGround = ground;
            diffuseColor.rgb = ground;
          }`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          float northEmit = 1.0 - clamp(vWorldPos3.z / ${WORLD_H.toFixed(4)}, 0.0, 1.0);
          totalEmissiveRadiance += uSoilGround * (0.28 * smoothstep(0.70, 0.96, northEmit));`,
        )
        .replace(
          '#include <opaque_fragment>',
          `{
            // Lit-path floor — far-north only. A valley floor lifted the
            // scar back to one ochre plate after the albedo crush.
            float northLit = 1.0 - clamp(vWorldPos3.z / ${WORLD_H.toFixed(4)}, 0.0, 1.0);
            float keepLit = smoothstep(0.70, 0.96, northLit);
            float litL = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
            float floorLit = 0.26 * keepLit;
            if (keepLit > 0.001 && litL < floorLit) outgoingLight *= floorLit / max(litL, 0.001);
            vec3 soilLit = vec3(0.46, 0.34, 0.18);
            outgoingLight = mix(outgoingLight, max(outgoingLight, soilLit), keepLit * 0.14);
          }
          #include <opaque_fragment>`,
        );
    };
    return mat;
  }, [uniforms]);

  // Dynamic tint updates: control / visibility / supply / mode / weather.
  useEffect(() => {
    if (!game) return;
    updateTintTexture(tint, game, mapMode);
  }, [game?.tiles, game?.visibleTiles, game?.supplyLevels, mapMode, tint, game]);

  // Snow + cloud-shadow amount follow weather.
  useEffect(() => {
    const w = game?.weather;
    uniforms.uSnow.value = w === 'snow' ? 1 : 0;
    uniforms.uCloud.value =
      w === 'overcast' ? 0.28 : w === 'rain' ? 0.14 : w === 'mud' ? 0.16 : w === 'snow' ? 0.22 : 0.08;
  }, [game?.weather, uniforms]);

  // Hex overlay opacity: stronger while a unit is selected, softer when the
  // camera is high (the zoom metaphor's first dial).
  useFrame(({ camera }, delta) => {
    const base = selectedUnitId ? 0.55 : 0.16;
    const alt = THREE.MathUtils.clamp(1.25 - (camera.position.y - 12) / 55, 0.25, 1);
    const target = base * alt;
    uniforms.uHexOpacity.value += (target - uniforms.uHexOpacity.value) * Math.min(1, delta * 6);
    uniforms.uCloudTime.value += delta;
    // Staged mode transition (~400 ms): terrain <-> parchment.
    const paperTarget = mapMode === 'political' ? 1 : 0;
    uniforms.uPaper.value += (paperTarget - uniforms.uPaper.value) * Math.min(1, delta * 5.5);
  });

  // Picking: an invisible flat plane + world->hex math (replaces per-prism
  // raycasting; covered by playtest.mjs before the prisms were removed).
  const pickGeo = useMemo(() => {
    const spanX = WORLD_W + ALBEDO_MARGIN * 2;
    const spanZ = WORLD_H + ALBEDO_MARGIN * 2;
    const g = new THREE.PlaneGeometry(spanX, spanZ, 1, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(spanX / 2 - ALBEDO_MARGIN, 0.55, spanZ / 2 - ALBEDO_MARGIN);
    return g;
  }, []);

  const hexFromPoint = (p: THREE.Vector3): TileId | null => {
    if (!game) return null;
    const rf = p.z / 1.5;
    const qf = p.x / HEXW - rf / 2;
    const sf = -qf - rf;
    let q = Math.round(qf);
    let r = Math.round(rf);
    const s = Math.round(sf);
    const dq = Math.abs(q - qf);
    const dr = Math.abs(r - rf);
    const ds = Math.abs(s - sf);
    if (dq > dr && dq > ds) q = -r - s;
    else if (dr > ds) r = -q - s;
    const x = q + (r - (r & 1)) / 2;
    const id = `${x},${r}` as TileId;
    return game.tiles[id] ? id : null;
  };

  const lastHover = useRef<TileId | null>(null);
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectTile(hexFromPoint(e.point));
  };
  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    const id = hexFromPoint(e.point);
    if (id !== lastHover.current) {
      lastHover.current = id;
      hoverTile(id);
    }
  };

  if (!game) return null;

  return (
    <group>
      <mesh geometry={geometry} material={material} receiveShadow castShadow raycast={() => null} />
      <mesh
        geometry={pickGeo}
        onClick={handleClick}
        onPointerMove={handleMove}
        onPointerOut={() => {
          lastHover.current = null;
          hoverTile(null);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} colorWrite={false} />
      </mesh>
    </group>
  );
}
