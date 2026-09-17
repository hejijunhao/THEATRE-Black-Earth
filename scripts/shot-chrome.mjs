// Slice 5 board-chrome shots: boot frontline, reach wash, selected hex,
// and a hex-click march through the wash. tbe-counters stays off.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
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
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
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
await page.screenshot({ path: join(OUT, 'chrome-01-frontline-boot.png') });

const reach = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  const cam = window.__TBE_CAMERA__;
  hook.selectUnit('u1');
  const unit = hook.units().find((u) => u.id === 'u1');
  if (cam && unit) cam.set(unit.wx - 0.4, 12.2, unit.wz + 8.4, unit.wx, unit.wz);
  return { id: unit?.id, tile: unit?.tile, dests: hook.reachable().length };
});
console.log('reach frame:', JSON.stringify(reach));
if (!reach.dests) {
  console.error('FAIL: selected rear unit has no reachable hexes');
  process.exitCode = 1;
}
await assertCountersOff(page, 'reach counters');
await sleep(700);
await page.screenshot({ path: join(OUT, 'chrome-02-reach-wash.png') });

const selected = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  const cam = window.__TBE_CAMERA__;
  hook.selectUnit('u3');
  const me = hook.units().find((u) => u.id === 'u3');
  if (cam && me) cam.set(me.wx - 0.25, 10.4, me.wz + 6.7, me.wx, me.wz);
  return { id: me?.id, tile: me?.tile, selectedTile: hook.summary()?.selectedTile };
});
console.log('selected hex:', JSON.stringify(selected));
await assertCountersOff(page, 'selected counters');
await sleep(700);
await page.screenshot({ path: join(OUT, 'chrome-03-selected-hex.png') });

const marched = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  const cam = window.__TBE_CAMERA__;
  hook.selectUnit('u1');
  const unit = hook.units().find((u) => u.id === 'u1');
  if (cam && unit) cam.set(unit.wx, 18, unit.wz + 12, unit.wx, unit.wz);
  return { tile: unit?.tile, dests: hook.reachable() };
});
await sleep(250);
const clickPt = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  const cam = window.__TBE_CAMERA__;
  const dests = hook.reachable();
  if (!dests.length || !cam) return { reason: !cam ? 'no camera' : 'no dests', dests: dests.length };
  const mid = { x: 800, y: 500 };
  let best = null;
  for (const dest of dests) {
    const pt = cam.projectTile(dest);
    if (!pt || !pt.visible) continue;
    if (pt.y < 80 || pt.y > 820 || pt.x < 240 || pt.x > 1280) continue;
    const dist = Math.hypot(pt.x - mid.x, pt.y - mid.y);
    if (!best || dist < best.dist) best = { x: pt.x, y: pt.y, dest, dist };
  }
  return best ?? { reason: 'none in view', dests: dests.length };
});
console.log('hex-click target:', JSON.stringify(clickPt));
if (!clickPt || !clickPt.dest) {
  console.error('FAIL: no on-screen reachable hex to click');
  process.exitCode = 1;
} else {
  const beforeTile = await page.evaluate(() =>
    window.__TBE_DEBUG__.units().find((u) => u.id === 'u1')?.tile);
  await page.mouse.click(clickPt.x, clickPt.y);
  await sleep(450);
  const afterTile = await page.evaluate(() =>
    window.__TBE_DEBUG__.units().find((u) => u.id === 'u1')?.tile);
  const ok = afterTile === clickPt.dest && afterTile !== beforeTile;
  console.log('hex-click march:', JSON.stringify({ ok, from: beforeTile, to: afterTile, dest: clickPt.dest }));
  if (!ok) {
    console.error('FAIL: clicking a highlighted hex did not move the unit');
    process.exitCode = 1;
  }
}
await assertCountersOff(page, 'pick counters');
await sleep(400);
await page.screenshot({ path: join(OUT, 'chrome-04-pick-through-wash.png') });

console.log('PAGE ERRORS:', JSON.stringify(errors, null, 2));
if (errors.length) process.exitCode = 1;
await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('shot-chrome ok', OUT);
