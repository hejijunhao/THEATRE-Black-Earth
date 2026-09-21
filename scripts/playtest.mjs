// Headless playtest: drives a real browser through unit selection, movement,
// an attack with preview, operations and a full AI turn, capturing
// screenshots and console errors along the way.
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { assertCountersOff, clearCountersBeforeScripts } from './lib/counters-off.mjs';

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
await clearCountersBeforeScripts(page);
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
if (hasHook) await assertCountersOff(page, 'playtest counters');
await sleep(600);
await page.screenshot({ path: `${OUT}/10-selected-unit.png` });
const bench = await page.$eval('.command-bench', (el) => el.innerText).catch(() => '');
console.log('command bench:\n', bench.slice(0, 300));
if (!bench || !/Assault|Fires|Entrench|March/i.test(bench)) {
  console.error('FAIL: command bench missing legal-order plates');
  process.exitCode = 1;
}
const outliner = await page.$eval('.outliner', (el) => el.innerText).catch(() => '');
console.log('outliner:\n', outliner.slice(0, 220));
if (!outliner || !/next/i.test(outliner) || !/(INF|MECH|ARTY|TK|RECON)/.test(outliner)) {
  console.error('FAIL: outliner missing or empty');
  process.exitCode = 1;
}

if (hasHook) {
  // Hex-click path: pick plane → selectTile, not the debug move() hook.
  // Snap the camera onto a rear formation so a highlighted dest is on-screen.
  const framed = await page.evaluate(() => {
    const hook = window.__TBE_DEBUG__;
    const cam = window.__TBE_CAMERA__;
    hook.selectUnit('u1');
    const unit = hook.units().find((u) => u.id === 'u1');
    if (!unit || !cam) return { ok: false, dests: 0, hasCam: Boolean(cam) };
    cam.set(unit.wx, 18, unit.wz + 12, unit.wx, unit.wz);
    return { ok: true, dests: hook.reachable().length, hasCam: true, tile: unit.tile };
  });
  console.log('hex-click frame:', JSON.stringify(framed));
  await sleep(250);
  const clickPt = await page.evaluate(() => {
    const hook = window.__TBE_DEBUG__;
    const cam = window.__TBE_CAMERA__;
    const dests = hook.reachable();
    if (!dests.length || !cam) return { reason: !cam ? 'no camera' : 'no dests', dests: dests.length };
    const mid = { x: 800, y: 500 };
    let best = null;
    const rejected = [];
    for (const dest of dests) {
      const pt = cam.projectTile(dest);
      if (!pt || !pt.visible) { rejected.push({ dest, why: 'hidden' }); continue; }
      if (pt.y < 80 || pt.y > 820 || pt.x < 240 || pt.x > 1280) {
        rejected.push({ dest, why: 'hud', x: Math.round(pt.x), y: Math.round(pt.y) });
        continue;
      }
      const dist = Math.hypot(pt.x - mid.x, pt.y - mid.y);
      if (!best || dist < best.dist) best = { x: pt.x, y: pt.y, dest, dist };
    }
    return best ?? { reason: 'none in view', dests: dests.length, rejected };
  });
  console.log('hex-click target:', JSON.stringify(clickPt));
  if (!clickPt || !clickPt.dest) {
    console.error('FAIL: no on-screen reachable hex to click');
    process.exitCode = 1;
  } else {
    const beforeTile = await page.evaluate(() =>
      window.__TBE_DEBUG__.units().find((u) => u.id === 'u1')?.tile);
    await page.mouse.click(clickPt.x, clickPt.y);
    await sleep(400);
    const afterTile = await page.evaluate(() =>
      window.__TBE_DEBUG__.units().find((u) => u.id === 'u1')?.tile);
    const marched = { ok: afterTile === clickPt.dest && afterTile !== beforeTile, from: beforeTile, to: afterTile, dest: clickPt.dest };
    console.log('hex-click march:', JSON.stringify(marched));
    if (!marched.ok) {
      console.error('FAIL: clicking a highlighted hex did not move the unit');
      process.exitCode = 1;
    }
  }
  await page.evaluate(() => window.__TBE_DEBUG__.selectUnit('u3'));

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
    const previewOdds = await page.$eval('.brief-sheet', (el) => el.innerText).catch(() => '');
    console.log('assault briefing:\n', previewOdds.slice(0, 400));
    const estimateStamp = await page.$eval('.brief-sheet .stamp-strip', (el) => el.innerText).catch(() => '');
    const estimateRubber = await page.$('.brief-sheet .stamp');
    console.log('estimate stamp strip:', JSON.stringify(estimateStamp.trim()));
    if (!previewOdds) {
      console.error('FAIL: assault briefing not in the DOM');
      process.exitCode = 1;
    } else if (!estimateStamp || !/Assault|Fires/i.test(estimateStamp) || estimateRubber) {
      console.error('FAIL: estimate missing subtractive stamp strip or still has rubber badge');
      process.exitCode = 1;
    } else {
      if (/2d6|d6 showing/i.test(previewOdds)) {
        console.error('FAIL: estimate still talks dice / 2d6');
        process.exitCode = 1;
      }
      if (!/odds/i.test(previewOdds) || !previewOdds.includes('→')) {
        console.error('FAIL: estimate missing odds or strength delta');
        process.exitCode = 1;
      }
      if (!/Confirm assault|Confirm fires/i.test(previewOdds) || !/Dismiss/i.test(previewOdds)) {
        console.error('FAIL: estimate missing confirm or dismiss');
        process.exitCode = 1;
      }
    }
    const estimateDice = await page.$('.die-face, .aar-dice, .aar-fortune');
    if (estimateDice) {
      console.error('FAIL: die-face / fortune chrome still on the estimate');
      process.exitCode = 1;
    }
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
      } else {
        const aarText = await page.$eval('.aar', (el) => el.innerText);
        console.log('after-action report:\n', aarText.slice(0, 400));
        const aarStamp = await page.$eval('.aar .stamp-strip', (el) => el.innerText).catch(() => '');
        const aarRubber = await page.$('.aar .stamp');
        console.log('AAR stamp strip:', JSON.stringify(aarStamp.trim()));
        if (!aarStamp || !/Dispatch|Fires/i.test(aarStamp) || aarRubber) {
          console.error('FAIL: AAR missing subtractive stamp strip or still has rubber badge');
          process.exitCode = 1;
        }
        if (/2d6|d6 showing/i.test(aarText)) {
          console.error('FAIL: AAR still talks dice / 2d6');
          process.exitCode = 1;
        }
        if (!aarText.includes('→') || !/staff odds|odds/i.test(aarText)) {
          console.error('FAIL: AAR missing odds or strength delta');
          process.exitCode = 1;
        }
        if (!/Dismiss/i.test(aarText)) {
          console.error('FAIL: AAR missing dismiss');
          process.exitCode = 1;
        }
        const aarDice = await page.$('.die-face, .aar-dice, .aar-fortune');
        if (aarDice) {
          console.error('FAIL: die-face / fortune chrome still on the AAR');
          process.exitCode = 1;
        }
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
