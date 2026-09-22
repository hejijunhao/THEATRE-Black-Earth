import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** A local, softly lit sky for metal and glass reflections; no network HDRI. */
export function SurfaceLighting() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const sky = ctx.createLinearGradient(0, 0, 0, 128);
    sky.addColorStop(0, '#a8b9c7');
    sky.addColorStop(.40, '#d1d7d4');
    sky.addColorStop(.51, '#b7b6a7');
    sky.addColorStop(.58, '#666452');
    sky.addColorStop(1, '#393b32');
    ctx.fillStyle = sky; ctx.fillRect(0,0,256,128);
    const key = ctx.createRadialGradient(70,35,0,70,35,36);
    key.addColorStop(0,'rgba(255,245,215,0.8)'); key.addColorStop(1,'rgba(255,245,215,0)');
    ctx.fillStyle = key; ctx.fillRect(0,0,256,128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const generator = new THREE.PMREMGenerator(gl);
    const target = generator.fromEquirectangular(texture);
    const previous = scene.environment;
    scene.environment = target.texture;
    scene.environmentIntensity = 0.65;
    texture.dispose(); generator.dispose();
    return () => { scene.environment = previous; target.dispose(); };
  }, [gl, scene]);
  return null;
}
