// Subtractive HUD proof: rest map vs selected-unit bench.
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

const chrome = await page.evaluate(() => {
  const s = window.__TBE_DEBUG__.summary();
  return {
    selected: s.selected,
    hud: document.querySelector('.hud')?.className,
    topBar: Boolean(document.querySelector('.top-bar')),
    clock: Boolean(document.querySelector('.victory-clock')),
    journal: Boolean(document.querySelector('.bound-journal')),
    dossier: Boolean(document.querySelector('.side-panel')),
    bench: Boolean(document.querySelector('.command-bench')),
    orders: Boolean(document.querySelector('.orders-hint')),
    outliner: Boolean(document.querySelector('.outliner')),
    mapModes: document.querySelector('.map-modes')?.className,
    mapModeButtons: document.querySelectorAll('.map-mode-btn').length,
  };
});
console.log('rest chrome:', JSON.stringify(chrome));
if (chrome.clock || chrome.journal || chrome.dossier || chrome.bench || chrome.orders) {
  console.error('FAIL: rest state still has on-demand chrome mounted');
  process.exitCode = 1;
}
if (!chrome.topBar || !chrome.outliner) {
  console.error('FAIL: rest state missing strip or rail');
  process.exitCode = 1;
}
if (chrome.mapModeButtons !== 1) {
  console.error('FAIL: map modes not collapsed at rest', chrome.mapModeButtons);
  process.exitCode = 1;
}

await page.screenshot({ path: join(OUT, '01-rest-map.png') });

const u3 = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  hook.selectUnit('u3');
  const me = hook.units().find((u) => u.id === 'u3');
  hook.focusCamera(me.tile);
  return me;
});
await page.evaluate((u) => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(u.wx, 34, u.wz + 18, u.wx, u.wz);
}, u3);
await sleep(900);

const selected = await page.evaluate(() => {
  const s = window.__TBE_DEBUG__.summary();
  return {
    selected: s.selected,
    hud: document.querySelector('.hud')?.className,
    bench: document.querySelector('.command-bench')?.innerText?.slice(0, 240) ?? '',
    journal: Boolean(document.querySelector('.bound-journal')),
    dossier: Boolean(document.querySelector('.side-panel')),
    clock: Boolean(document.querySelector('.victory-clock')),
    orders: Boolean(document.querySelector('.orders-hint')),
    outliner: document.querySelector('.outliner')?.className,
  };
});
console.log('selected chrome:', JSON.stringify(selected));
if (!selected.bench || !/Assault|Fires|Entrench|March/i.test(selected.bench)) {
  console.error('FAIL: selected state missing command bench plates');
  process.exitCode = 1;
}
if (selected.journal || selected.dossier || selected.clock || selected.orders) {
  console.error('FAIL: selected state leaked on-demand chrome');
  process.exitCode = 1;
}

await page.screenshot({ path: join(OUT, '02-selected-unit.png') });

await page.keyboard.press('j');
await sleep(400);
const journalOpen = await page.evaluate(() => Boolean(document.querySelector('.bound-journal')));
console.log('journal on J:', journalOpen);
await page.screenshot({ path: join(OUT, '03-journal-on-demand.png') });
await page.keyboard.press('Escape');
await sleep(200);

await page.keyboard.press('i');
await sleep(400);
const dossierOpen = await page.evaluate(() => Boolean(document.querySelector('.side-panel')));
console.log('dossier on I:', dossierOpen);
await page.screenshot({ path: join(OUT, '04-dossier-on-demand.png') });

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('shot-hud ok', OUT);
