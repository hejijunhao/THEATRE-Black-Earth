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
  const strip = document.querySelector('.top-bar')?.innerText ?? '';
  return {
    selected: s.selected,
    hud: document.querySelector('.hud')?.className,
    topBar: Boolean(document.querySelector('.top-bar')),
    pulse: Boolean(document.querySelector('.theatre-pulse')),
    beads: document.querySelectorAll('.pulse-beads i').length,
    depot: Boolean(document.querySelector('.depot-chip')),
    delta: Boolean(document.querySelector('.delta-chip')),
    ledger: /Manpower|Equipment|Command/.test(strip),
    clock: Boolean(document.querySelector('.victory-clock')),
    journal: Boolean(document.querySelector('.bound-journal')),
    dossier: Boolean(document.querySelector('.side-panel')),
    bench: Boolean(document.querySelector('.command-bench')),
    orders: Boolean(document.querySelector('.orders-hint')),
    outliner: Boolean(document.querySelector('.outliner')),
    next: Boolean(document.querySelector('.or-run')),
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
if (!chrome.pulse || chrome.beads < 1 || !chrome.depot || chrome.delta || chrome.ledger) {
  console.error('FAIL: strip is still a ledger, not an instrument', chrome);
  process.exitCode = 1;
}
if (!chrome.next) {
  console.error('FAIL: rail missing Next-unspent plate');
  process.exitCode = 1;
}
if (chrome.mapModeButtons !== 1) {
  console.error('FAIL: map modes not collapsed at rest', chrome.mapModeButtons);
  process.exitCode = 1;
}

await page.screenshot({ path: join(OUT, '01-rest-map.png') });

await page.evaluate(() => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(66.8, 19.5, 33.7, 66.8, 19.5);
});
await sleep(600);
await page.screenshot({ path: join(OUT, '01b-campaign-lod.png') });
await page.evaluate(() => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(66.8, 38, 42, 66.8, 19.5);
});
await sleep(700);
await page.screenshot({ path: join(OUT, '01c-counter-lod.png') });

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

const rail = await page.evaluate(() => {
  const el = document.querySelector('.outliner');
  const rows = [...document.querySelectorAll('.outliner-row')].slice(0, 3).map((r) => ({
    cls: r.className,
    text: r.innerText.replace(/\s+/g, ' ').trim(),
    hasGlyph: Boolean(r.querySelector('.or-type')),
    hasStr: Boolean(r.querySelector('.or-str')),
    hasMark: Boolean(r.querySelector('.or-mark')),
  }));
  return {
    cls: el?.className,
    next: document.querySelector('.or-run')?.innerText?.replace(/\s+/g, ' ').trim() ?? '',
    rowCount: document.querySelectorAll('.outliner-row').length,
    sectors: [...document.querySelectorAll('.or-sector')].map((s) => s.textContent?.trim()),
    rows,
  };
});
console.log('rail:', JSON.stringify(rail));
if (!/or-run|Next/i.test(rail.next) || rail.rowCount < 4) {
  console.error('FAIL: week-runner rail empty or Next missing', rail);
  process.exitCode = 1;
}
if (rail.sectors.length < 3 || !rail.sectors.includes('Kharkiv') || !rail.sectors.includes('Donets')) {
  console.error('FAIL: rail is still one sorted list, not sector groups', rail.sectors);
  process.exitCode = 1;
}
if (rail.rows.some((r) => !r.hasGlyph || !r.hasStr || !r.hasMark || !/[A-Z]{2,}/.test(r.text))) {
  console.error('FAIL: rail rows are not glyph + name + strength + agency', rail.rows);
  process.exitCode = 1;
}
await page.screenshot({ path: join(OUT, '03-rail.png') });

await page.keyboard.press('j');
await sleep(400);
const journalOpen = await page.evaluate(() => Boolean(document.querySelector('.bound-journal')));
console.log('journal on J:', journalOpen);
await page.screenshot({ path: join(OUT, '04-journal-on-demand.png') });
await page.keyboard.press('Escape');
await sleep(200);

await page.keyboard.press('i');
await sleep(400);
const dossierOpen = await page.evaluate(() => Boolean(document.querySelector('.side-panel')));
console.log('dossier on I:', dossierOpen);
await page.screenshot({ path: join(OUT, '05-dossier-on-demand.png') });

await browser.close();
if (process.exitCode) process.exit(process.exitCode);
console.log('shot-hud ok', OUT);
