// Golden-image visual regression harness (v2-vision §8).
//
//   node scripts/golden.mjs            compare current render against baseline
//   node scripts/golden.mjs --update   re-bless the baseline
//
// A fixed-seed campaign is started through window.__TBE_DEBUG__, one shot is
// taken per map mode plus a zoomed close-up of the front. The deterministic
// RNG-in-state design makes these reproducible; the comparison uses mean
// per-channel error with a small threshold to absorb GPU rasteriser noise.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE_DIR = path.join(ROOT, 'scripts/golden/baseline');
const CUR_DIR = path.join(ROOT, 'scripts/golden/current');
const UPDATE = process.argv.includes('--update');
const APP_URL = 'http://localhost:5199';
const SEED = 424242;
const MODES = ['terrain', 'political', 'supply', 'objectives', 'intel'];
const THRESHOLD = 0.015; // mean absolute channel error (0..1)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(BASE_DIR, { recursive: true });
fs.mkdirSync(CUR_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=metal', '--window-size=1600,1000', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1600, height: 1000 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
await sleep(800);
await page.evaluate((seed) => window.__TBE_DEBUG__.newGame('UA', seed), SEED);
await sleep(3500);

const shots = [];
for (const mode of MODES) {
  await page.evaluate((m) => window.__TBE_DEBUG__.setMapMode(m), mode);
  await sleep(700);
  const file = `mode-${mode}.png`;
  await page.screenshot({ path: path.join(CUR_DIR, file) });
  shots.push(file);
}

// Close-up of the front (zoom in deterministically, then settle).
await page.evaluate(() => window.__TBE_DEBUG__.setMapMode('terrain'));
for (let i = 0; i < 6; i++) {
  await page.mouse.move(1100, 500);
  await page.mouse.wheel({ deltaY: -400 });
  await sleep(150);
}
await sleep(1200);
const closeFile = 'closeup-front.png';
await page.screenshot({ path: path.join(CUR_DIR, closeFile) });
shots.push(closeFile);

// Close-up of an actual formation. `closeup-front.png` above happens to land
// on empty ground, so until this shot the miniatures — the most detailed art
// in the game — had no golden coverage at all. The roster is deterministic
// for a fixed seed; sort by strength with an id tiebreak so the subject never
// depends on object key order.
const roster = await page.evaluate(() => window.__TBE_DEBUG__.units());
const subject = roster
  .filter((u) => u.faction === 'UA' && u.type === 'armored')
  .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id))[0];
if (subject) {
  await page.evaluate(
    (u) => window.__TBE_CAMERA__.set(u.wx, 4.6, u.wz + 6.2, u.wx, u.wz),
    subject,
  );
  await sleep(1500);
  const formationFile = 'closeup-formation.png';
  await page.screenshot({ path: path.join(CUR_DIR, formationFile) });
  shots.push(formationFile);
} else {
  console.error('no UA armored formation in roster — closeup-formation skipped');
  errors.push('closeup-formation subject missing');
}

await browser.close();

if (errors.length) {
  console.error('PAGE ERRORS:', errors);
  process.exit(1);
}

function meanDiff(aPath, bPath) {
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) return 1;
  let sum = 0;
  for (let i = 0; i < a.data.length; i++) sum += Math.abs(a.data[i] - b.data[i]);
  return sum / a.data.length / 255;
}

if (UPDATE) {
  for (const f of shots) fs.copyFileSync(path.join(CUR_DIR, f), path.join(BASE_DIR, f));
  console.log(`baseline updated (${shots.length} images)`);
  process.exit(0);
}

let failed = 0;
for (const f of shots) {
  const basePath = path.join(BASE_DIR, f);
  if (!fs.existsSync(basePath)) {
    console.log(`~ ${f}: no baseline (run with --update to bless)`);
    continue;
  }
  const d = meanDiff(basePath, path.join(CUR_DIR, f));
  const ok = d <= THRESHOLD;
  console.log(`${ok ? '✓' : '✗'} ${f}: mean diff ${(d * 100).toFixed(2)}%`);
  if (!ok) failed += 1;
}
process.exit(failed > 0 ? 1 : 0);
