// Redesign acceptance: native rendering, full postprocessing, counters OFF.
// OUT_DIR and CHROME_PATH can be overridden. No golden re-blessing here.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { assertCountersOff, clearCountersBeforeScripts } from './lib/counters-off.mjs';

const out = process.env.OUT_DIR ?? 'scripts/out/theatre';
mkdirSync(out, { recursive: true });
const executablePath = process.env.CHROME_PATH ?? [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
assert(executablePath, 'Set CHROME_PATH to a local Chrome binary');
const browser = await puppeteer.launch({
  executablePath, headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])],
  defaultViewport: { width: 1600, height: 1000 },
});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', err => errors.push(String(err)));
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('404')) errors.push(msg.text()); });
  await clearCountersBeforeScripts(page);
  await page.goto(process.env.URL ?? 'http://localhost:5199', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__TBE_DEBUG__);
  await page.evaluate(() => {
    window.__TBE_DEBUG__.newGame('UA', 42);
    window.__TBE_DEBUG__.setWeather('rain');
    window.__TBE_DEBUG__.setMapMode('terrain');
  });
  await sleep(2500);
  const shot = async name => { await sleep(650); await page.screenshot({ path: join(out, name + '.png') }); };
  await assertCountersOff(page, 'rest');
  assert.equal(await page.$('.outliner-list'), null, 'Rest must not mount a formation wall');
  assert.equal(await page.$eval('.top-bar', el => el.getBoundingClientRect().height), 32);
  await shot('01-rest-rain');

  await page.click('[aria-label="Open formations"]');
  assert(await page.$('.outliner-list'));
  await shot('02-outliner');
  await page.click('[aria-label="Collapse formations"]');
  await page.evaluate(() => window.__TBE_DEBUG__.selectUnit('u3'));
  assert.equal(await page.$('.outliner-list'), null, 'Selecting a formation must leave the list closed');
  await shot('03-selection-reach');
  const target = await page.evaluate(() => window.__TBE_DEBUG__.attackTargets()[0]);
  assert(target, 'Selected formation needs a legal assault for the paper test');
  await page.evaluate(id => window.__TBE_DEBUG__.pendingAttack(id), target);
  await page.waitForSelector('.paper-confirm');
  assert.equal(await page.$('.command-bench'), null, 'Paper owns the order controls');
  assert.equal(await page.$('.outliner-list'), null, 'Paper must not mount an OOB rail');
  const order = await page.evaluate(() => ({
    numbers: document.querySelector('.paper-numbers').getBoundingClientRect().top,
    verdict: document.querySelector('.aar-head').getBoundingClientRect().top,
    actions: document.querySelectorAll('.paper-actions button').length,
  }));
  assert(order.numbers < order.verdict);
  assert.equal(order.actions, 2);
  await shot('04-assault-paper');
  await page.setViewport({ width: 1024, height: 768 });
  await shot('05-assault-compact');
  const fits = await page.$eval('.brief-sheet', el => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.top >= 32 && r.bottom <= innerHeight;
  });
  assert(fits, 'Combat paper must fit the compact desktop viewport');
  await page.setViewport({ width: 1600, height: 1000 });
  await page.click('.paper-confirm');
  await page.waitForSelector('#aar-title');
  assert.equal(await page.$$eval('.paper-actions button', els => els.length), 1);
  await shot('06-dispatch');
  await page.click('.paper-actions button');
  await page.keyboard.press('Escape');

  const armor = await page.evaluate(() => window.__TBE_DEBUG__.units().find(u => u.faction === 'UA' && u.type === 'armored'));
  for (const [name, height, dz] of [['07-machines-operational', 13.2, 8.2], ['08-machines-campaign', 24, 14], ['09-machines-close', 5.4, 3.6]]) {
    await page.evaluate(({ u, y, dz }) => window.__TBE_CAMERA__.set(u.wx, y, u.wz + dz, u.wx, u.wz), { u: armor, y: height, dz });
    await assertCountersOff(page, name);
    await shot(name);
  }
  for (const weather of ['clear', 'snow']) {
    await page.evaluate(({ u, weather }) => {
      window.__TBE_DEBUG__.setWeather(weather);
      window.__TBE_CAMERA__.set(u.wx, 13.2, u.wz + 8.2, u.wx, u.wz);
    }, { u: armor, weather });
    await sleep(1800);
    await shot('10-weather-' + weather);
  }
  await page.evaluate(() => window.__TBE_DEBUG__.setCounterMode(true));
  await shot('11-counter-alternate');
  await page.evaluate(() => window.__TBE_DEBUG__.setCounterMode(false));
  await assertCountersOff(page, 'restored machines');
  assert.deepEqual(errors, [], 'No browser or WebGL errors');
  console.log('Theatre acceptance passed:', out);
} finally {
  await browser.close();
}
