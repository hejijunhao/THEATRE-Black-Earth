// Slice 3 armor-stamp gate. Counters OFF is binding — earlier tips
// failed when NATO plates stayed on. Rest / select / mid-zoom armor
// only; INF/MECH/ARTY and ground are not judged here.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { assertCountersOff, clearCountersBeforeScripts } from './lib/counters-off.mjs';

const OUT = process.env.OUT_DIR ?? 'scripts/out/theatre';
const URL = process.env.URL ?? 'http://localhost:5199';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
  args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [] )],
  defaultViewport: { width: 1600, height: 1000 },
});

const page = await browser.newPage();
page.on('pageerror', (err) => console.error('PAGE', err));
await clearCountersBeforeScripts(page);
page.on('console', msg => { if (msg.type() === 'error') console.error(msg.text()); });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__TBE_DEBUG__, { timeout: 20000 });
const glInfo = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { ok: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    ok: true,
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    quality: localStorage.getItem('tbe-quality'),
  };
});
console.log('gl:', JSON.stringify(glInfo));
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

await page.evaluate(() => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(67.3, 10.4, 24.7, 67.55, 18);
});
await sleep(700);
await page.screenshot({ path: join(OUT, 'armor-01-rest.png') });

const selected = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  const cam = window.__TBE_CAMERA__;
  const armored = hook.units()
    .filter((u) => u.faction === 'UA' && u.type === 'armored')
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id))[0];
  if (armored) {
    hook.selectUnit(armored.id);
    if (cam) cam.set(armored.wx - 0.15, 10.4, armored.wz + 6.7, armored.wx, armored.wz);
  }
  return { id: armored?.id, type: armored?.type, tile: armored?.tile };
});
console.log('select:', JSON.stringify(selected));
if (!selected.id) {
  console.error('FAIL: no UA armored formation to frame');
  process.exitCode = 1;
}
await assertCountersOff(page, 'select counters');
await sleep(800);
await page.screenshot({ path: join(OUT, 'armor-02-select.png') });

await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  const cam = window.__TBE_CAMERA__;
  const armored = hook.units().find((u) => u.id === hook.summary()?.selected);
  if (cam && armored) cam.set(armored.wx - 0.1, 13.2, armored.wz + 8.2, armored.wx, armored.wz);
});
await assertCountersOff(page, 'midzoom counters');
await sleep(800);
await page.screenshot({ path: join(OUT, 'armor-03-midzoom.png') });

await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  const cam = window.__TBE_CAMERA__;
  const armored = hook.units().find((u) => u.id === hook.summary()?.selected);
  if (cam && armored) cam.set(armored.wx - 0.08, 5.4, armored.wz + 3.6, armored.wx, armored.wz);
});
await assertCountersOff(page, 'close counters');
await sleep(800);
await page.screenshot({ path: join(OUT, 'armor-04-close.png') });

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('shot-armor ok', OUT);
