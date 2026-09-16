// PR screenshots for the UI authority cut: campaign-zoom counters,
// command bench, victory clock, bound journal, encyclopedia, briefing.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
console.log('u3', u3);
await sleep(800);

// Campaign zoom + Tab counters: parchment annulus + amber chevron must squint.
await page.evaluate((u) => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(u.wx, 38, u.wz + 18, u.wx, u.wz);
}, u3);
await page.keyboard.press('Tab');
await sleep(900);
await page.screenshot({ path: join(OUT, '01-campaign-zoom-agency.png') });

// Counter-LOD close enough to judge silhouette, still past COUNTER_ZOOM_IN.
await page.evaluate((u) => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(u.wx, 24, u.wz + 12, u.wx, u.wz);
}, u3);
await sleep(700);
await page.screenshot({ path: join(OUT, '01b-counter-lod-chrome.png') });

await page.evaluate((u) => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(u.wx, 38, u.wz + 18, u.wx, u.wz);
}, u3);
await sleep(400);

// Hover Strength for the encyclopedia card.
const str = await page.$('.side-panel .k');
if (str) {
  const box = await str.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(400);
    await page.screenshot({ path: join(OUT, '02-encyclopedia-strength.png') });
  }
}

await page.mouse.move(10, 10);
await sleep(200);

const targets = await page.evaluate(() => window.__TBE_DEBUG__.attackTargets());
await page.evaluate((id) => window.__TBE_DEBUG__.pendingAttack(id), targets[0]);
await sleep(500);
await page.screenshot({ path: join(OUT, '03-assault-briefing.png') });

// Doctrine card from a briefing chip (terrain / supply).
const chip = await page.$('.brief-chip');
if (chip) {
  const box = await chip.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(400);
    await page.screenshot({ path: join(OUT, '03b-briefing-doctrine.png') });
  }
}
await page.mouse.move(10, 10);
await sleep(200);

// Thin ops rail stays present beside the paper.
await page.screenshot({ path: join(OUT, '03c-ops-rail-during-brief.png') });

await page.evaluate((id) => window.__TBE_DEBUG__.attack(id), targets[0]);
await sleep(700);
await page.screenshot({ path: join(OUT, '04-after-action.png') });
await page.keyboard.press('Escape');
await sleep(300);

// Close-up of the bench + clock + journal after the fight (u3 now spent).
await page.evaluate(() => window.__TBE_DEBUG__.selectUnit('u3'));
await sleep(400);
await page.screenshot({ path: join(OUT, '05-spent-plate-journal.png') });

// Clock + rail after the fight (u3 spent; decisive track still live).
await page.evaluate(() => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(0, 42, 18, 0, 0);
});
await sleep(400);
await page.screenshot({ path: join(OUT, '05b-clock-rail-journal.png') });

// Near-camera miniatures still carry the tab/blade.
await page.keyboard.press('Tab');
await page.evaluate((u) => {
  const cam = window.__TBE_CAMERA__;
  if (cam) cam.set(u.wx + 1.2, 8, u.wz + 6.5, u.wx, u.wz);
}, u3);
await sleep(700);
await page.screenshot({ path: join(OUT, '06-near-agency-marks.png') });

console.log('wrote', OUT);
await browser.close();
