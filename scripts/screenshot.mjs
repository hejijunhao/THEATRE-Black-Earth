// Headless visual smoke test: menu screenshot, start campaign, map screenshot,
// basic interactions, console error capture.
import puppeteer from 'puppeteer-core';

const OUT = process.env.OUT_DIR;
const URL = 'http://localhost:5199';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-angle=metal', '--window-size=1600,1000'],
  defaultViewport: { width: 1600, height: 1000 },
});

const page = await browser.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${OUT}/01-menu.png` });

// Start a new campaign (Ukraine, tutorial on).
const buttons = await page.$$('button.menu-btn-large');
await buttons[0].click();
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: `${OUT}/02-map.png` });

// Click roughly where a UA frontline unit should be (Donbas area, mid-right).
await page.mouse.click(1050, 420);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/03-selected.png` });

// Supply map mode.
const modeButtons = await page.$$('button.map-mode-btn');
if (modeButtons[1]) await modeButtons[1].click();
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/04-supply.png` });

console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 2));
await browser.close();
