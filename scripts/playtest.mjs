// Headless playtest: drives a real browser through unit selection, movement,
// an attack with preview, operations and a full AI turn, capturing
// screenshots and console errors along the way.
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT = process.env.OUT_DIR ?? 'scripts/out';
const URL = 'http://localhost:5199';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  return candidates.find((p) => existsSync(p));
}

const executablePath = chromePath();
if (!executablePath) {
  console.error('FAIL: no Chrome/Chromium found. Set CHROME_PATH.');
  process.exit(1);
}

const chromeArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1000'];
if (process.platform === 'darwin') chromeArgs.push('--use-angle=metal');

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: chromeArgs,
  defaultViewport: { width: 1600, height: 1000 },
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('404')) errors.push(msg.text());
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('button.menu-btn-large', { timeout: 20000 });
await sleep(400);

// New campaign as Ukraine.
const btns = await page.$$('button.menu-btn-large');
if (!btns[0]) {
  console.error('FAIL: New Campaign button not found');
  process.exit(1);
}
await btns[0].click();
await sleep(3500);

// Skip the tutorial to test the raw flow.
const skip = await page.$$eval('.tutorial-prompt a', (as) => {
  const el = as.find((a) => a.textContent.includes('Skip all'));
  if (el) { el.click(); return true; }
  return false;
});
console.log('tutorial skipped:', skip);
await sleep(400);

// Terrain picking: click the map centre and assert a tile got selected
// (world-position -> hex math replaced per-prism raycasting in v2 Phase B).
await page.mouse.click(800, 500);
await sleep(300);
const picked = await page.evaluate(() => window.__TBE_DEBUG__?.summary()?.selectedTile);
console.log('terrain click picked tile:', picked);
if (!picked) {
  console.error('FAIL: terrain click selected no tile');
  process.exitCode = 1;
}
// Clear the selection again before the scripted flow.
await page.keyboard.press('Escape');
await sleep(200);

// 57th Motorised (u3) starts adjacent to 20th MRD (r1) — the first fight.
await page.evaluate(() => {
  const hook = window.__TBE_DEBUG__;
  if (hook) hook.selectUnit('u3');
});
const hasHook = await page.evaluate(() => Boolean(window.__TBE_DEBUG__));
console.log('debug hook available:', hasHook);
await sleep(600);
await page.screenshot({ path: `${OUT}/10-selected-unit.png` });

if (hasHook) {
  const info = await page.evaluate(() => window.__TBE_DEBUG__.summary());
  console.log('before:', JSON.stringify(info.selected));
  const targets = await page.evaluate(() => window.__TBE_DEBUG__.attackTargets());
  console.log('attack targets:', targets);
  if (targets.length === 0) {
    console.error('FAIL: u3 has no adjacent enemy (expected r1)');
    process.exitCode = 1;
  } else {
    await page.evaluate((id) => window.__TBE_DEBUG__.pendingAttack(id), targets[0]);
    await sleep(500);
    await page.screenshot({ path: `${OUT}/11-attack-preview.png` });
    const previewOdds = await page.$eval('.side-panel', (el) => el.innerText).catch(() => '');
    console.log('preview panel:\n', previewOdds.slice(0, 400));
    await page.evaluate((id) => window.__TBE_DEBUG__.attack(id), targets[0]);
    await sleep(700);
    await page.screenshot({ path: `${OUT}/12-attack-result.png` });
    const combat = await page.evaluate(() => window.__TBE_DEBUG__.summary()?.lastCombat);
    console.log('combat result:', JSON.stringify(combat));
    if (!combat) {
      console.error('FAIL: attack produced no lastCombat');
      process.exitCode = 1;
    } else {
      const rollOk = combat.attackerRoll >= 2 && combat.attackerRoll <= 12;
      const defOk = combat.defenderRoll == null
        || (combat.defenderRoll >= 2 && combat.defenderRoll <= 12);
      if (!rollOk || !defOk) {
        console.error('FAIL: combat rolls out of 2d6 range', combat);
        process.exitCode = 1;
      }
      const aar = await page.$('.aar');
      console.log('after-action report visible:', Boolean(aar));
      if (!aar) {
        console.error('FAIL: after-action report not in the DOM');
        process.exitCode = 1;
      }
    }
    await page.keyboard.press('Escape');
    await sleep(200);
  }
}

// End turn (confirm through warnings if shown).
await page.evaluate(() => window.__TBE_DEBUG__?.endTurn());
await sleep(300);
const confirmBtn = await page.$$eval('button', (bs) => {
  const el = bs.find((b) => b.textContent.includes('End turn anyway'));
  if (el) { el.click(); return true; }
  return false;
});
console.log('warning dialog confirmed:', confirmBtn);
await sleep(1500);
await page.screenshot({ path: `${OUT}/13-ai-turn.png` });

// Let the AI finish (speed up) and wait until the player phase returns.
await page.evaluate(() => window.__TBE_DEBUG__?.setAISpeed(60));
for (let i = 0; i < 50; i++) {
  const phase = await page.evaluate(() => window.__TBE_DEBUG__?.summary()?.phase);
  if (phase === 'player' || phase === 'ended') break;
  await sleep(400);
}
const state = await page.evaluate(() => window.__TBE_DEBUG__?.summary());
console.log('after AI:', JSON.stringify(state, null, 2));
await page.screenshot({ path: `${OUT}/14-turn2.png` });

console.log('PAGE ERRORS:', JSON.stringify(errors, null, 2));
await browser.close();
