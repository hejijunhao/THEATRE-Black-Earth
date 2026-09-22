// Reproducible art-direction frames from the real renderer; counters always off.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { assertCountersOff, clearCountersBeforeScripts } from './lib/counters-off.mjs';
const out = process.env.OUT_DIR ?? 'scripts/out/fidelity';
mkdirSync(out, {recursive:true});
const executablePath = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
const browser = await puppeteer.launch({ executablePath, headless:true, args:['--no-sandbox','--disable-dev-shm-usage'], defaultViewport:{width:1600,height:1000,deviceScaleFactor:1} });
const errors=[];
const review = process.env.REVIEW_DIR;
if (review) mkdirSync(review, {recursive:true});
const retained = new Set(['02-front','03-armor','detail-armored','detail-infantry','detail-mechanized','05-river-town']);
try {
const page = await browser.newPage();
const capture = async name => {
  await page.screenshot({path:join(out,name+'.png')});
  if (review && retained.has(name)) await page.screenshot({path:join(review,name+'.jpg'),quality:90});
};
page.on('pageerror', e=>errors.push(String(e)));
page.on('console', m=>{if(m.type()==='error') errors.push(m.text());});
await clearCountersBeforeScripts(page);
await page.goto(process.env.URL ?? 'http://127.0.0.1:5199', {waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.__TBE_DEBUG__ && window.__TBE_CAMERA__,{timeout:60000});
await page.evaluate(()=>{window.__TBE_DEBUG__.newGame('UA',42);window.__TBE_DEBUG__.setMapMode('terrain');window.__TBE_DEBUG__.setWeather('overcast');});
await new Promise(r=>setTimeout(r,1800));
await assertCountersOff(page, 'presentation');
const units=await page.evaluate(()=>window.__TBE_DEBUG__.units());
const frames = [
  { name:'01-rest', title:'Campaign / keep the survey', subtitle:'Existing composition, city typography and subtractive chrome. Detail recedes into the same cadastral earth.', camera:[67.3,22,32,67.55,18] },
  { name:'02-front', title:'Operational / machines on earth', subtitle:'Echelon silhouettes and company ranks. Broken woodland crowns, banked water and quiet parcel grain.', camera:[67.3,10.4,24.7,67.55,18] },
  { name:'03-armor', type:'armored', title:'Parcel close / steel, soil, contact', subtitle:'Dark running gear, lighter turret, a distinct gun. Fine drill rows and clods resolve inside the existing surveyed fields.', close: true },
  { name:'04-infantry', type:'infantry', title:'Company / ranked human scale', subtitle:'Four small squads, tapered figures and restrained equipment. Trucks remain subordinate to the rank silhouette.', close: true },
  { name:'05-river-town', title:'River town / banks and settlement mass', subtitle:'Wet bank → shallow water → dark channel. Pitched roofs, eaves and streets replace scattered grey blocks.', camera:[67.0,5.5,26.5,67.55,21] },
];
for(const f of frames){
  let cam=f.camera;
  if(f.type){
    const u=units.filter(u=>u.type===f.type && u.faction==='UA').sort((a,b)=>b.strength-a.strength)[0];
    cam=[u.wx-0.4,5.4,u.wz+5.6,u.wx,u.wz];
  }
  await page.evaluate(cam=>{window.__TBE_DEBUG__.selectTile(null);window.__TBE_CAMERA__.set(...cam);},cam);
  await new Promise(r=>setTimeout(r,700));
  await capture(f.name);
}
// Secondary evidence for every machine class and wet/dry continuity.
for(const type of ['mechanized','artillery','recon']){
 const u=units.filter(u=>u.type===type&&u.faction==='UA').sort((a,b)=>b.strength-a.strength)[0];
 await page.evaluate(u=>window.__TBE_CAMERA__.set(u.wx-.4,5.4,u.wz+5.6,u.wx,u.wz),u);
 await new Promise(r=>setTimeout(r,500));
 await capture(`check-${type}`);
}
// Closest playable camera, same scene and models as normal play.
for(const type of ['armored','infantry','mechanized','artillery','recon']) {
 const u=units.filter(u=>u.type===type&&u.faction==='UA').sort((a,b)=>b.strength-a.strength)[0];
 await page.evaluate(u=>window.__TBE_CAMERA__.set(u.wx-.8,2.9,u.wz+3.2,u.wx,u.wz),u);
 await new Promise(r=>setTimeout(r,700));
 await capture(`detail-${type}`);
}
await page.evaluate(u=>{window.__TBE_DEBUG__.selectUnit(u.id);window.__TBE_CAMERA__.set(u.wx-.4,5.4,u.wz+5.6,u.wx,u.wz);}, units.find(u=>u.id==='u30'));
await new Promise(r=>setTimeout(r,1300));
await capture('check-selected');
for(const weather of ['clear','rain','snow']){
 await page.evaluate(w=>{window.__TBE_DEBUG__.selectTile(null);window.__TBE_DEBUG__.setWeather(w);window.__TBE_CAMERA__.set(67.3,10.4,24.7,67.55,18);},weather);
 await new Promise(r=>setTimeout(r,750));
 await capture(`check-${weather}`);
}
await page.evaluate(()=>{window.__TBE_DEBUG__.setMapMode('political');});
await new Promise(r=>setTimeout(r,1100));
await capture('check-political');
await page.evaluate(()=>{window.__TBE_DEBUG__.setMapMode('terrain');window.__TBE_DEBUG__.setCounterMode(true);});
await new Promise(r=>setTimeout(r,700));
await capture('check-counters');
await page.evaluate(()=>{window.__TBE_DEBUG__.newGame('RU',42);window.__TBE_DEBUG__.setCounterMode(false);window.__TBE_DEBUG__.setWeather('clear');
  const u=window.__TBE_DEBUG__.units().filter(u=>u.type==='armored'&&u.faction==='RU').sort((a,b)=>b.strength-a.strength)[0];
  window.__TBE_CAMERA__.set(u.wx-.8,2.9,u.wz+3.2,u.wx,u.wz);
});
await new Promise(r=>setTimeout(r,1200));
await capture('check-ru');
await page.goto((process.env.URL ?? 'http://127.0.0.1:5199') + '/#assets', {waitUntil:'domcontentloaded'});
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>document.body.textContent.includes('ASSET REVIEW')); 
await new Promise(r=>setTimeout(r,1200));
await capture('check-assets');
writeFileSync(join(out,'frames.json'), JSON.stringify(frames,null,2));
writeFileSync(join(out,'browser-errors.json'), JSON.stringify(errors,null,2));
if(errors.length) throw new Error(errors.join('\n'));
console.log(`Presentation frames: ${out}; no browser or shader errors.`);
} finally { await browser.close(); }
