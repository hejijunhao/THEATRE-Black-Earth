// Same camera, wash on vs wash off — proves the stain is a blob, not a necklace.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import puppeteer from 'puppeteer-core';
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

const executablePath = chromePath();
if (!executablePath) {
  console.error('FAIL: no Chrome/Chromium.');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1000'],
  defaultViewport: { width: 1600, height: 1000 },
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
await clearCountersBeforeScripts(page);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__TBE_DEBUG__, { timeout: 20000 });
await assertCountersOff(page, 'boot');
await page.evaluate(() => window.__TBE_DEBUG__.newGame('UA', 42));
await sleep(2800);
await page.evaluate(() => {
  window.__TBE_DEBUG__.setWeather('rain');
  window.__TBE_DEBUG__.setMapMode('terrain');
});
await page.$$eval('.tutorial-prompt a', (as) => {
  const el = as.find((a) => a.textContent.includes('Skip all'));
  if (el) el.click();
});
await sleep(300);

const frame = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  const cam = window.__TBE_CAMERA__;
  hook.selectUnit('u1');
  const unit = hook.units().find((u) => u.id === 'u1');
  // Wider mid-zoom so the blob sits in frame, not a single hex.
  if (cam && unit) cam.set(unit.wx, 16.5, unit.wz + 11.2, unit.wx, unit.wz);
  return { tile: unit?.tile, dests: hook.reachable().length, wx: unit?.wx, wz: unit?.wz };
});
console.log('frame', JSON.stringify(frame));
await sleep(800);
const onPath = join(OUT, 'slice5_reach_wash_on.png');
await page.screenshot({ path: onPath });

await page.evaluate(() => {
  window.__TBE_DEBUG__.selectUnit(null);
  window.__TBE_DEBUG__.selectTile(null);
});
await sleep(500);
const offPath = join(OUT, 'slice5_reach_wash_off.png');
await page.screenshot({ path: offPath });

const on = PNG.sync.read(await (await import('node:fs')).promises.readFile(onPath));
const off = PNG.sync.read(await (await import('node:fs')).promises.readFile(offPath));
const diff = new PNG({ width: on.width, height: on.height });
let changed = 0;
let brownish = 0;
for (let i = 0; i < on.data.length; i += 4) {
  const dr = on.data[i] - off.data[i];
  const dg = on.data[i + 1] - off.data[i + 1];
  const db = on.data[i + 2] - off.data[i + 2];
  const mag = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
  if (mag > 12) {
    changed++;
    // amplify delta onto dark field so the blob silhouette is reviewable
    diff.data[i] = Math.max(0, Math.min(255, 40 + dr * 4 + 180));
    diff.data[i + 1] = Math.max(0, Math.min(255, 30 + dg * 4 + 120));
    diff.data[i + 2] = Math.max(0, Math.min(255, 16 + db * 4 + 40));
    if (dr < 0 && dg < 0) brownish++;
  } else {
    diff.data[i] = 18;
    diff.data[i + 1] = 16;
    diff.data[i + 2] = 14;
  }
  diff.data[i + 3] = 255;
}
const diffPath = join(OUT, 'slice5_reach_wash_diff.png');
writeFileSync(diffPath, PNG.sync.write(diff));
console.log(JSON.stringify({
  dests: frame.dests,
  changed,
  brownish,
  pct: Number((changed / (on.width * on.height) * 100).toFixed(2)),
}));
console.log('PAGE ERRORS:', JSON.stringify(errors));
await browser.close();
if (errors.length) process.exit(1);
console.log('shot-reach-diff ok', OUT);
