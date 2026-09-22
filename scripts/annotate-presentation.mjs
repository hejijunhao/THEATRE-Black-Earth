// Editorial plates built in HTML from actual game captures. These annotations
// exist only in the review artifact, never in the game's HUD.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
const source=process.env.SOURCE_DIR ?? 'scripts/out/delivery';
const output=process.env.OUT_DIR ?? 'docs/art-direction/frames';
mkdirSync(output,{recursive:true});
const frames=JSON.parse(readFileSync(join(source,'frames.json'),'utf8'));
const notes=[
 [[350,515,'Survey first','Preserve the strip-field composition; fine grain falls away with distance.'],[806,590,'City hierarchy','Existing labels and the operational front remain the anchors.'],[480,18,'Thin chrome','Header, outliner and orders retain their existing design.']],
 [[770,435,'Company read','Small squads repeat into a formation; trucks sit behind the ranks.'],[366,244,'Machine read','Dark track bands, raised turret and projecting gun survive the squint test.'],[495,563,'Earth + water','Micro-relief inside parcels; an earthen bank gives the channel an edge.']],
 [[796,410,'Authored machine','Matte, mottled paint. Light turret over a darker hull and running gear.'],[1100,650,'Parcel-close earth','Filtered drill rows, clods and subdued stubble; no enlarged timber grain.'],[915,475,'Support scale','Raked cab and shaped canvas roof; supply remains a small companion.']],
 [[778,412,'Four small squads','Up to 24 tapered figures in echelon; strength changes the number of squads.'],[903,475,'Quiet equipment','Compact command wagons, dark rifles and helmets; no oversized soldier.'],[287,318,'Volumetric cover','Irregular leaf crowns and shaded boughs replace faceted tree balls.']],
 [[650,278,'Bank → channel','Silt and wet margins frame a darker, gently meandering channel.'],[691,351,'A town, not cubes','Low masonry, pitched roofs, chimneys and windows gather into streets.'],[957,374,'Crossing','Thin deck and curbs keep the bridge legible without a bulky block.']],
];
const executablePath=process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox'],defaultViewport:{width:1600,height:1200,deviceScaleFactor:1}});
try {
const page=await browser.newPage();
for(let i=0;i<frames.length;i++){
 const f=frames[i], items=notes[i];
 const src='data:image/png;base64,'+readFileSync(join(source,f.name+'.png')).toString('base64');
 const marks=items.map(([x,y],j)=>`<g><circle cx="${x}" cy="${y}" r="15" fill="#252920" stroke="#ded3b5" stroke-width="1.3"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="#f2e7cd" font-family="Arial" font-size="14">${j+1}</text></g>`).join('');
 await page.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;background:#20251f;color:#e5dcc5;font-family:Arial,sans-serif}.map{width:1600px;height:1000px;position:relative}.map img,.map svg{position:absolute;inset:0;width:100%;height:100%}footer{height:200px;padding:24px 36px;border-top:1px solid #837756;display:grid;grid-template-columns:460px 1fr;gap:34px}.kicker{font:11px monospace;letter-spacing:2px;color:#b3aa8f}h1{font:27px Georgia,serif;margin:12px 0 8px}p{font-size:13px;line-height:1.55;margin:0;color:#beb9a8}.notes{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding-top:12px}.notes b{display:block;font-size:14px;font-weight:normal;color:#eee4ca;margin-bottom:12px}.notes b span{display:inline-grid;place-items:center;width:23px;height:23px;border:1px solid #8e856d;border-radius:50%;margin-right:8px;font-size:11px}</style></head><body><div class="map"><img src="${src}"><svg viewBox="0 0 1600 1000">${marks}</svg></div><footer><div><div class="kicker">BLACK THEATRE / ART DIRECTION / 0${i+1}</div><h1>${f.title}</h1><p>Implemented frame · Overcast · Counters OFF<br>21 September 2026</p></div><div class="notes">${items.map(([, ,title,body],j)=>`<div><b><span>${j+1}</span>${title}</b><p>${body}</p></div>`).join('')}</div></footer></body></html>`);
 await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));
 await page.screenshot({path:join(output,f.name+'.jpg'),type:'jpeg',quality:94});
}
} finally {await browser.close();}
writeFileSync('docs/art-direction/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BLACK THEATRE — earth and machines</title><style>body{background:#20251f;color:#e5dcc5;margin:32px auto;max-width:1400px;padding:0 24px;font-family:Georgia,serif}h1{font-weight:normal}p,nav{font:15px/1.7 Arial,sans-serif;color:#c9c2b0}a{color:#dbcb9e}nav{display:flex;gap:24px;flex-wrap:wrap;position:sticky;top:0;background:#20251fee;padding:16px 0;z-index:2}figure{margin:32px 0}img{width:100%;display:block}figcaption{font:14px/1.6 Arial,sans-serif;margin:12px 0 24px}section{scroll-margin-top:70px}</style><h1>BLACK THEATRE / Earth and machines</h1><p>Five annotated captures of the implemented presentation pass. <a href="README.md">Direction, priorities and validation notes</a>.</p><nav>${frames.map((f,i)=>`<a href="#${f.name}">0${i+1} ${['Rest','Front','Armor','Infantry','River / town'][i]}</a>`).join('')}</nav>${frames.map(f=>`<section id="${f.name}"><figure><a href="frames/${f.name}.jpg"><img src="frames/${f.name}.jpg" alt="${f.title}" loading="lazy"></a><figcaption>${f.subtitle}</figcaption></figure></section>`).join('')}</html>`);
console.log(`Five annotated plates written to ${output}`);
