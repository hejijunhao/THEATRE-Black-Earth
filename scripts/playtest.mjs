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

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=metal', '--window-size=1600,1000'],
  defaultViewport: { width: 1600, height: 1000 },
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('404')) errors.push(msg.text());
});

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await sleep(800);

// New campaign as Ukraine.
const btns = await page.$$('button.menu-btn-large');
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

// Select the 92nd Mechanised (u2) via the store directly for determinism,
// then screenshot the movement overlay.
await page.evaluate(() => {
  // Zustand store is module-scoped; expose via a debug hook if present.
  const hook = window.__TBE_DEBUG__;
  if (hook) hook.selectUnit('u2');
});
// Fallback: click on the map where u2 sits — find its screen position via debug hook.
const hasHook = await page.evaluate(() => Boolean(window.__TBE_DEBUG__));
console.log('debug hook available:', hasHook);
await sleep(600);
await page.screenshot({ path: `${OUT}/10-selected-unit.png` });

if (hasHook) {
  // Move u2 one tile toward the front and attack the adjacent enemy if any.
  const info = await page.evaluate(() => window.__TBE_DEBUG__.summary());
  console.log('before:', JSON.stringify(info.selected));
  await page.evaluate(() => {
    const d = window.__TBE_DEBUG__;
    const targets = d.attackTargets();
    if (targets.length > 0) d.pendingAttack(targets[0]);
  });
  await sleep(500);
  await page.screenshot({ path: `${OUT}/11-attack-preview.png` });
  await page.evaluate(() => {
    const d = window.__TBE_DEBUG__;
    const targets = d.attackTargets();
    if (targets.length > 0) d.attack(targets[0]);
  });
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

// Let the AI finish (speed up).
await page.evaluate(() => window.__TBE_DEBUG__?.setAISpeed(60));
await sleep(6000);
const state = await page.evaluate(() => window.__TBE_DEBUG__?.summary());
console.log('after AI:', JSON.stringify(state, null, 2));
await page.screenshot({ path: `${OUT}/14-turn2.png` });

console.log('PAGE ERRORS:', JSON.stringify(errors, null, 2));
await browser.close();
