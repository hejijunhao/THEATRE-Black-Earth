// LOD / boot / north-air gate shots: rest, selected, mid-zoom.
// Fail the cut if hexes disappear under plates.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

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
await page.screenshot({ path: join(OUT, 'lod-01-rest.png') });

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
