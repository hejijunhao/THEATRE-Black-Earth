// PR screenshots for UI cut #6: world-anchored briefing, AAR, bench/rail
// during AAR, encyclopedia index.
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
  ].find((p) => existsSync(p));
}

const browser = await puppeteer.launch({
  executablePath: chromePath(),
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

const u3 = await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  hook.selectUnit('u3');
  const units = hook.units();
  const me = units.find((u) => u.id === 'u3');
  hook.focusCamera(me.tile);
  return me;
});
await sleep(800);
await page.evaluate((u) => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(u.wx, 22, u.wz + 14, u.wx, u.wz);
}, u3);
await sleep(600);

const targets = await page.evaluate(() => window.__TBE_DEBUG__.attackTargets());
if (!targets?.[0]) {
  console.error('FAIL: no attack targets on u3');
  process.exit(1);
}
await page.evaluate((id) => window.__TBE_DEBUG__.pendingAttack(id), targets[0]);
await sleep(700);
await page.screenshot({ path: join(OUT, '01-anchored-briefing.png') });

await page.evaluate((id) => window.__TBE_DEBUG__.attack(id), targets[0]);
await sleep(800);
await page.screenshot({ path: join(OUT, '02-aar-anchored.png') });
await page.screenshot({ path: join(OUT, '03-rail-bench-during-aar.png') });

await page.keyboard.press('e');
await sleep(400);
await page.screenshot({ path: join(OUT, '04-encyclopedia-index.png') });

const bench = await page.$('.command-bench');
const rail = await page.$('.outliner');
const paper = await page.$('.brief-sheet');
const index = await page.$('.lex-index');
console.log(JSON.stringify({
  bench: Boolean(bench),
  rail: Boolean(rail),
  paper: Boolean(paper),
  index: Boolean(index),
  benchClass: bench ? await page.evaluate((el) => el.className, bench) : null,
}));

console.log('wrote', OUT);
await browser.close();
