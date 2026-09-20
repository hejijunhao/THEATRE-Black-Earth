// Slice 1 ground-albedo gate: rest rain + mid-zoom soil.
// Fail if rest-under-rain is a painted khaki slab, if north goes cool grey,
// or if strip/parcel contrast from 0.2.18 disappears. Atmosphere / units /
// HUD are not this script's job.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import { assertCountersOff, clearCountersBeforeScripts } from './lib/counters-off.mjs';

const OUT = process.env.OUT_DIR ?? '/opt/cursor/artifacts/screenshots';
const URL = process.env.URL ?? 'http://127.0.0.1:5199';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find((p) => existsSync(p));
}

function lumaOf(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sampleRegion(png, x0, y0, x1, y1) {
  let lSum = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let veil = 0;
  let khaki = 0;
  let ochre = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (png.width * y + x) << 2;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      const l = lumaOf(r, g, b);
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      lSum += l;
      rSum += r;
      gSum += g;
      bSum += b;
      if (l < 72 && sat < 18) veil += 1;
      // Highlighter khaki: bright yellow-beige, the painted-steppe slab.
      if (r > 198 && g > 168 && b < 140 && l > 172) khaki += 1;
      // Leftover mustard / ochre plate: yellow-dominant mid soil.
      if (l > 96 && g > r * 0.78 && r - b > 40 && r > 110) ochre += 1;
      n += 1;
    }
  }
  return {
    luma: lSum / n,
    r: rSum / n,
    g: gSum / n,
    b: bSum / n,
    veil: veil / n,
    khaki: khaki / n,
    ochre: ochre / n,
  };
}

function assertNorthSoil(path) {
  const png = PNG.sync.read(readFileSync(path));
  const north = sampleRegion(png, 280, 70, 1480, 240);
  const mid = sampleRegion(png, 280, 400, 1480, 680);
  console.log('north luma/veil', north.luma.toFixed(1), north.veil.toFixed(3));
  console.log('mid luma/veil', mid.luma.toFixed(1), mid.veil.toFixed(3));
  if (north.luma < 88) {
    console.error('FAIL: north rain veil — luma below soil floor');
    process.exitCode = 1;
  }
  if (north.luma < mid.luma * 0.74) {
    console.error('FAIL: north rain veil — north much darker than mid');
    process.exitCode = 1;
  }
  if (north.veil > 0.14) {
    console.error('FAIL: north rain veil — charcoal fraction too high');
    process.exitCode = 1;
  }
  // Cooler-grey north: blue channel catching the mid, or sat collapsing.
  if (north.b > north.r * 0.88) {
    console.error('FAIL: north cooler-grey mismatch vs mid soil');
    process.exitCode = 1;
  }
  if (north.r < north.g * 0.92 && north.luma < mid.luma * 0.96) {
    console.error('FAIL: north still a cool olive lobe vs mid soil');
    process.exitCode = 1;
  }
}

function assertStripVolume(path) {
  const png = PNG.sync.read(readFileSync(path));
  const cell = 18;
  const x0 = 300, y0 = 420, x1 = 1260, y1 = 700;
  let diffs = 0;
  let n = 0;
  for (let y = y0; y < y1 - cell; y += cell) {
    for (let x = x0; x < x1 - cell; x += cell) {
      const a = sampleRegion(png, x, y, x + cell, y + cell);
      const b = sampleRegion(png, x + cell, y, x + cell * 2, y + cell);
      diffs += Math.abs(a.luma - b.luma);
      n += 1;
    }
  }
  const contrast = diffs / Math.max(1, n);
  console.log('strip contrast', contrast.toFixed(2));
  if (contrast < 2.4) {
    console.error('FAIL: rest is a quiet khaki slab — strip/parcel contrast too low');
    process.exitCode = 1;
  }
}

function assertNotPaintedKhaki(path, label) {
  const png = PNG.sync.read(readFileSync(path));
  const mid = sampleRegion(png, 280, 400, 1480, 680);
  console.log(
    `${label} soil`,
    `luma=${mid.luma.toFixed(1)}`,
    `rgb=${mid.r.toFixed(0)},${mid.g.toFixed(0)},${mid.b.toFixed(0)}`,
    `khaki=${mid.khaki.toFixed(3)}`,
    `ochre=${mid.ochre.toFixed(3)}`,
  );
  if (mid.khaki > 0.28) {
    console.error(`FAIL: ${label} painted khaki flood — highlighter fraction too high`);
    process.exitCode = 1;
  }
  if (mid.ochre > 0.22) {
    console.error(`FAIL: ${label} leftover mustard ochre plate — ochre fraction too high`);
    process.exitCode = 1;
  }
  if (mid.luma > 168 && mid.r > mid.b + 55 && mid.g > mid.b + 40) {
    console.error(`FAIL: ${label} still reads as painted beige steppe`);
    process.exitCode = 1;
  }
  // Mustard / ochre plate: yellow-dominant midground at campaign zoom.
  // Highlighter straw is already gone; this is the leftover khaki field.
  if (mid.luma > 100 && mid.g > mid.r * 0.80 && mid.r - mid.b > 48) {
    console.error(`FAIL: ${label} still reads as mustard ochre plate`);
    process.exitCode = 1;
  }
  // Soil, not cool concrete: mid must stay earth-warm.
  if (mid.r < mid.b || mid.g < mid.b * 0.92) {
    console.error(`FAIL: ${label} midground went cool-grey`);
    process.exitCode = 1;
  }
}

const executablePath = chromePath();
if (!executablePath) {
  console.error('FAIL: no Chrome/Chromium. Set CHROME_PATH.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1000'],
  defaultViewport: { width: 1600, height: 1000 },
});

const page = await browser.newPage();
page.on('pageerror', (err) => console.error('PAGE', err));
await clearCountersBeforeScripts(page);

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__TBE_DEBUG__, { timeout: 20000 });
await assertCountersOff(page, 'boot counters');
await page.evaluate(() => window.__TBE_DEBUG__.newGame('UA', 42));
await assertCountersOff(page, 'newGame counters');
await sleep(2800);
await page.evaluate(() => {
  window.__TBE_DEBUG__.setWeather('rain');
  window.__TBE_DEBUG__.setMapMode('terrain');
});
await sleep(400);

const skip = await page.$$eval('.tutorial-prompt a', (as) => {
  const el = as.find((a) => a.textContent.includes('Skip all'));
  if (el) { el.click(); return true; }
  return false;
});
console.log('tutorial skipped:', skip);
await sleep(300);

const boot = await page.evaluate(() => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(67.3, 10.4, 24.7, 67.55, 18);
  const s = window.__TBE_DEBUG__.summary();
  return {
    tile: s.selectedTile,
    selected: s.selected,
    strip: Boolean(document.querySelector('.top-bar')),
    rail: Boolean(document.querySelector('.outliner')),
    bench: Boolean(document.querySelector('.command-bench')),
  };
});
console.log('boot rest:', JSON.stringify(boot));
if (!boot.strip || !boot.rail) {
  console.error('FAIL: strip or sector rail missing at rest');
  process.exitCode = 1;
}
if (boot.bench) {
  console.error('FAIL: bench mounted at rest');
  process.exitCode = 1;
}
await sleep(700);
const restPath = join(OUT, 'ground-01-rest-rain.png');
await page.screenshot({ path: restPath });
assertNorthSoil(restPath);
assertStripVolume(restPath);
assertNotPaintedKhaki(restPath, 'rest-rain');

const mid = await page.evaluate(() => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(67.3, 13.2, 27.2, 67.55, 18);
  return true;
});
console.log('midzoom set:', mid);
await assertCountersOff(page, 'midzoom counters');
await sleep(700);
const midPath = join(OUT, 'ground-02-midzoom-rain.png');
await page.screenshot({ path: midPath });
assertNotPaintedKhaki(midPath, 'mid-zoom');
assertStripVolume(midPath);

const close = await page.evaluate(() => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(67.4, 7.6, 21.8, 67.55, 18);
  return true;
});
console.log('parcel close set:', close);
await sleep(700);
const closePath = join(OUT, 'ground-03-parcel-close.png');
await page.screenshot({ path: closePath });
assertStripVolume(closePath);
assertNotPaintedKhaki(closePath, 'parcel-close');

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('shot-ground ok', OUT);
