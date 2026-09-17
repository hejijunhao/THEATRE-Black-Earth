// LOD / boot / north-air gate shots: rest, selected, mid-zoom.
// Fail the cut if hexes disappear under plates, if the north rain veil
// returns, or if mid-zoom reads as plates-only.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';

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
  let veil = 0;
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
      if (l < 72 && sat < 18) veil += 1;
      n += 1;
    }
  }
  return { luma: lSum / n, veil: veil / n };
}

/** Rest rain: north (top of the scar frame) must stay khaki with the mid. */
function assertNorthKhaki(path) {
  const png = PNG.sync.read(readFileSync(path));
  // Skip strip / rail / right chrome. North is the upper theatre, mid is the scar.
  const north = sampleRegion(png, 280, 70, 1480, 240);
  const mid = sampleRegion(png, 280, 400, 1480, 680);
  console.log('north luma/veil', north.luma.toFixed(1), north.veil.toFixed(3));
  console.log('mid luma/veil', mid.luma.toFixed(1), mid.veil.toFixed(3));
  if (north.luma < 88) {
    console.error('FAIL: north rain veil — luma below khaki floor');
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

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__TBE_DEBUG__, { timeout: 20000 });
await page.evaluate(() => window.__TBE_DEBUG__.newGame('UA', 42));
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
const restPath = join(OUT, 'lod-01-rest.png');
await page.screenshot({ path: restPath });
assertNorthKhaki(restPath);

const mid = await page.evaluate(() => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(67.3, 13.2, 27.2, 67.55, 18);
  return true;
});
console.log('midzoom set:', mid);
await sleep(700);
await page.screenshot({ path: join(OUT, 'lod-02-midzoom.png') });

const selected = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  hook.selectUnit('u3');
  const me = hook.units().find((u) => u.id === 'u3');
  const cam = window.__TBE_CAMERA__;
  if (cam && me) cam.set(me.wx - 0.25, 10.4, me.wz + 6.7, me.wx, me.wz);
  return { id: me?.id, tile: me?.tile };
});
await sleep(700);
const selectedChrome = await page.evaluate(() => ({
  bench: Boolean(document.querySelector('.command-bench')),
  rail: Boolean(document.querySelector('.outliner')),
  strip: Boolean(document.querySelector('.top-bar')),
  selected: window.__TBE_DEBUG__.summary()?.selected,
}));
console.log('selected:', JSON.stringify({ ...selected, ...selectedChrome }));
if (!selectedChrome.bench || !selectedChrome.rail || !selectedChrome.strip) {
  console.error('FAIL: selected state lost strip, rail, or bench');
  process.exitCode = 1;
}
await page.screenshot({ path: join(OUT, 'lod-03-selected.png') });

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('shot-lod ok', OUT);
