// Human and logistics silhouettes, authored in metres and merged with the
// formation. No per-frame model generation or external asset downloads.
import * as THREE from 'three';
import { FactionId } from '../game/types';
import { HERO_SCALE, HeroMat, hbox, hcyl, heroMats, hplate, hsphere, htorus } from './heroParts';

export function truckParts(faction: FactionId, command = false): THREE.BufferGeometry[] {
  const M = heroMats(faction);
  const p: THREE.BufferGeometry[] = [];
  p.push(hbox(5.7, .20, 1.58, M.DARKSTEEL, { x: -.2, y: .61 }));
  p.push(hbox(5.1, .18, 2.12, M.BODY, { x: -.3, y: .85 }));
  for (const x of [-1.92, -.82, 1.77]) {
    p.push(hcyl(.09,.09,2.23,10,M.DARKSTEEL,'z',{x,y:.49}));
    for (const side of [-1, 1]) {
      p.push(hcyl(.45,.45,.30,20,M.RUBBER,'z',{x,y:.46,z:side*1.06}));
      p.push(htorus(.35,.105,M.RUBBER,{x,y:.46,z:side*1.20},20,8));
      p.push(hcyl(.24,.24,.035,16,M.BODY,'z',{x,y:.46,z:side*1.315}));
      p.push(hcyl(.09,.09,.06,12,M.STEEL,'z',{x,y:.46,z:side*1.34}));
      for(let k=0;k<6;k++) {
        const a=k*Math.PI/3;
        p.push(hcyl(.022,.022,.045,6,M.STEEL,'z',{x:x+Math.cos(a)*.155,y:.46+Math.sin(a)*.155,z:side*1.34}));
      }
      p.push(hbox(.95,.09,.43,M.BODY,{x,y:.96,z:side*1.05}));
    }
  }
  // Separate engine hood, glazed cab, roof lip and bumper.
  p.push(hplate([{y:.91,w:1.15,d:1.90,cut:.12},{y:1.42,w:1.10,d:1.82,cut:.14,x:-.08}],M.BODY,{x:2.10}));
  p.push(hplate([{y:.91,w:1.70,d:2.0,cut:.12},{y:1.65,w:1.70,d:2.0,cut:.12},
    {y:2.30,w:1.35,d:1.91,cut:.14,x:-.16}],M.BODY,{x:1.12}));
  p.push(hbox(1.43,.08,2.02,M.TOP,{x:.94,y:2.32}));
  for(const side of [-1,1]) {
    p.push(hbox(.028,.48,.78,M.OPTIC,{x:1.835,y:1.94,z:side*.46,rz:.40}));
    p.push(hbox(.73,.44,.018,M.OPTIC,{x:.96,y:1.97,z:side*.982}));
    p.push(hbox(.10,.47,.035,M.BODY,{x:.65,y:1.97,z:side*.997}));
    p.push(hbox(.19,.04,.045,M.STEEL,{x:.60,y:1.55,z:side*1.02}));
    p.push(hbox(.81,.08,.25,M.DARKSTEEL,{x:.81,y:.83,z:side*1.08}));
    p.push(hcyl(.018,.018,.46,6,M.STEEL,'z',{x:1.52,y:1.99,z:side*1.16}));
    p.push(hbox(.08,.28,.18,M.DARKSTEEL,{x:1.52,y:2.0,z:side*1.38}));
    p.push(hcyl(.11,.11,.045,12,{c:'#a6a18a',r:.27,m:.15},'x',{x:2.72,y:1.17,z:side*.71}));
  }
  p.push(hbox(.12,.19,2.15,M.DARKSTEEL,{x:2.77,y:.82}));
  p.push(hbox(.035,.36,.94,M.SHADE,{x:2.70,y:1.19}));
  for(let k=0;k<6;k++) p.push(hbox(.045,.025,.92,M.STEEL,{x:2.72,y:1.05+k*.055}));
  // Canvas is a bowed cover with seams, over a separate drop-side bed.
  p.push(hbox(3.38,.44,2.13,M.BODY,{x:-1.16,y:1.10}));
  p.push(hplate([{y:1.30,w:3.36,d:2.10,cut:.07},{y:2.03,w:3.30,d:2.08,cut:.10},
    {y:2.30,w:3.24,d:1.60,cut:.18},{y:2.37,w:3.18,d:.82,cut:.17}],M.CANVAS,{x:-1.16}));
  for(const x of [-2.64,-1.92,-1.2,-.48,.24]) for(const side of [-1,1]) {
    p.push(hbox(.045,.70,.035,M.CANVAS2,{x,y:1.65,z:side*1.06}));
    p.push(hbox(.055,.38,.04,M.TOP,{x,y:1.08,z:side*1.08}));
    p.push(hsphere(.032,M.STEEL,{x,y:1.33,z:side*1.09},6,4));
  }
  p.push(hbox(.04,.49,1.98,M.SHADE,{x:-2.87,y:1.09}));
  p.push(hbox(.06,.09,2.02,M.DARKSTEEL,{x:-2.90,y:.78}));
  if(command) {
    p.push(hbox(.42,.19,.38,M.BODY,{x:-.35,y:2.46,z:.48}));
    p.push(hcyl(.014,.024,2.05,6,M.DARKSTEEL,'y',{x:-.35,y:3.47,z:.48}));
    p.push(hcyl(.075,.075,.18,10,M.STEEL,'y',{x:-.35,y:2.62,z:.48}));
  }
  return p.map(g=>g.scale(HERO_SCALE,HERO_SCALE,HERO_SCALE));
}

type Point = [number,number,number];
export function soldierParts(variant = 0): THREE.BufferGeometry[] {
  const cloth: HeroMat = {c:'#626a52',r:.96,m:0};
  const web: HeroMat = {c:'#535846',r:.98,m:0};
  const boot: HeroMat = {c:'#30332d',r:.9,m:0};
  const steel: HeroMat = {c:'#343a35',r:.48,m:.65};
  const skin: HeroMat = {c:'#ab9072',r:.93,m:0};
  const p: THREE.BufferGeometry[] = [];
  const ellipsoid = (sx:number,sy:number,sz:number,mat:HeroMat,at:Point) => {
    const g=hsphere(1,mat,undefined,12,8); g.scale(sx,sy,sz);g.translate(...at);p.push(g);
  };
  const limb=(a:Point,b:Point,r0:number,r1:number,mat:HeroMat)=>{
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b), d=bv.clone().sub(av);
    const g=hcyl(r1,r0,d.length(),10,mat);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));
    g.translate(...av.add(bv).multiplyScalar(.5).toArray());p.push(g);
  };
  const stride = [0.12,-0.10,0.02][variant%3];
  // Tailored jacket, rounded shoulders, belt, webbing and individual pouches.
  ellipsoid(.145,.29,.23,cloth,[0,1.19,0]);
  ellipsoid(.12,.13,.18,cloth,[-.01,.91,0]);
  for(const side of [-1,1]) {
    const hip:Point=[0,.91,side*.105], knee:Point=[side*stride,.52,side*.13], ankle:Point=[-side*stride,.12,side*.15];
    limb(hip,knee,.093,.075,cloth); limb(knee,ankle,.074,.047,cloth);
    ellipsoid(.13,.07,.065,boot,[ankle[0]+.043,.065,ankle[2]]);
    ellipsoid(.074,.086,.062,web,[.131,1.11,side*.125]);
    limb([.115,1.42,side*.14],[.145,1.08,side*.12],.020,.020,web);
  }
  ellipsoid(.105,.20,.17,web,[-.155,1.22,0]); // fitted pack
  p.push(hbox(.21,.048,.37,web,{y:.98}));
  limb([0,1.42,0],[.012,1.55,0],.062,.060,skin);
  ellipsoid(.088,.119,.084,skin,[.028,1.62,0]);
  ellipsoid(.116,.092,.113,cloth,[.008,1.71,0]);
  p.push(hcyl(.115,.119,.035,16,web,'y',{x:.008,y:1.688}));
  // Bent arms cradle a separate stock, receiver, magazine, barrel and optic.
  const aim = variant%3===1 ? -.09 : .03;
  for(const side of [-1,1]) {
    const elbow:Point=[.10,1.17,side*.27], hand:Point=[side===1?.43:.24,1.27+aim,.13];
    limb([0,1.40,side*.21],elbow,.079,.061,cloth);
    limb(elbow,hand,.062,.041,cloth);ellipsoid(.055,.047,.047,skin,hand);
  }
  p.push(hbox(.21,.075,.055,web,{x:.17,y:1.28+aim,z:.13}));
  p.push(hbox(.23,.068,.055,steel,{x:.36,y:1.29+aim,z:.13}));
  p.push(hbox(.057,.13,.042,steel,{x:.33,y:1.205+aim,z:.13,rz:-.18}));
  p.push(hcyl(.017,.022,.46,10,steel,'x',{x:.66,y:1.30+aim,z:.13}));
  p.push(hcyl(.027,.027,.07,10,steel,'x',{x:.83,y:1.30+aim,z:.13}));
  p.push(hcyl(.025,.025,.105,10,steel,'x',{x:.37,y:1.35+aim,z:.13}));
  // Slight cartographic exaggeration lets faces and rifle poses read on map.
  return p.map(g=>g.scale(.047,.047,.047));
}
