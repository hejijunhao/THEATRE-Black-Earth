import * as THREE from 'three';
import { ccyl, paint } from '../assets/parts';
import { mergeGeometries } from './geomUtils';
import { ihash } from './terrain/strips';

/** Cluster atlas with individual leaf silhouettes, baked once at startup. */
export function leafAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  for(let i=0;i<260;i++) {
    const a=ihash(i,4,61)*Math.PI*2;
    const r=Math.sqrt(ihash(i,9,63))*49;
    const x=64+Math.cos(a)*r, y=64+Math.sin(a)*r*.88;
    const shade=Math.round(205+ihash(i,3,65)*50);
    ctx.fillStyle=`rgb(${shade},${shade},${shade})`;
    ctx.beginPath();ctx.ellipse(x,y,2+ihash(i,6,67)*4,1.2+ihash(i,7,69)*2.2,a,0,Math.PI*2);ctx.fill();
  }
  // Opaque central texel is also the bark's UV sample.
  ctx.fillStyle='#ffffff';ctx.fillRect(62,62,4,4);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
}

/** Crossed leaf sprays give porous crowns and broken cast shadows. */
export function woodlandGeometry(): THREE.BufferGeometry {
  const trunk=ccyl(.006,.012,.16,'#665c46',0,.07,0,'y',7);
  const uv=trunk.getAttribute('uv');
  for(let i=0;i<uv.count;i++) uv.setXY(i,.5,.5);
  const parts=[trunk];
  for(let k=0;k<24;k++) {
    const a=k*2.39996;
    const r=.085*Math.sqrt((k+.5)/24);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const y=.105+Math.sqrt(Math.max(0,1-r*r/.011))*.10 + (ihash(k,2,4)-.5)*.025;
    const span=.092+ihash(k,5,8)*.032;
    for(let j=0;j<3;j++) {
      const g=new THREE.PlaneGeometry(span,span);
      g.rotateY(a+j*Math.PI/3);
      g.rotateX((ihash(k,j,9)-.5)*1.4);
      g.translate(x,y,z);
      paint(g,['#d0d4b5','#e0e1c3','#bac9a4'][k%3]);
      // Foliage volume normals soften the obvious card-plane illumination.
      const normal=g.getAttribute('normal');
      const n=new THREE.Vector3(x*4,.8,z*4).normalize();
      for(let i=0;i<normal.count;i++) normal.setXYZ(i,n.x,n.y,n.z);
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
}
