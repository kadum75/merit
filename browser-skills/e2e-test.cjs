const { chromium } = require('playwright');
const fs = require('fs');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const configFile = process.argv[2];

if (!configFile) {
  console.error('Usage: node browser-skills/e2e-test.cjs <config.json>');
  console.error('Config format: [{ name, url, steps: [{ action: "goto|click|type|fill|wait|assertText|assertUrl|screenshot", args }] }]');
  process.exit(1);
}

const tests = JSON.parse(fs.readFileSync(configFile, 'utf-8'));

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  let passed = 0, failed = 0;

  for (const test of tests) {
    console.log(`\n=== ${test.name} ===`);
    const page = await context.newPage();
    let ok = true;

    try {
      for (const step of test.steps) {
        switch (step.action) {
          case 'goto':
            await page.goto(step.args, { waitUntil: 'networkidle', timeout: 15000 });
            console.log(`  ✓ goto ${step.args}`);
            break;
          case 'click':
            await page.waitForSelector(step.args, { timeout: 5000 });
            await page.click(step.args);
            console.log(`  ✓ click ${step.args}`);
            break;
          case 'type':
            await page.waitForSelector(step.args[0], { timeout: 5000 });
            await page.type(step.args[0], step.args[1], { delay: 20 });
            console.log(`  ✓ type into ${step.args[0]}`);
            break;
          case 'fill':
            await page.waitForSelector(step.args[0], { timeout: 5000 });
            await page.fill(step.args[0], step.args[1]);
            console.log(`  ✓ fill ${step.args[0]}`);
            break;
          case 'wait':
            await page.waitForSelector(step.args, { timeout: step.timeout || 10000 });
            console.log(`  ✓ wait ${step.args}`);
            break;
          case 'assertText':
            const body = await page.evaluate(() => document.body.innerText);
            if (body.includes(step.args)) {
              console.log(`  ✓ assertText found "${step.args.substring(0, 50)}"`);
            } else {
              throw new Error(`Text not found: "${step.args.substring(0, 50)}"`);
            }
            break;
          case 'assertUrl':
            const url = page.url();
            if (url.includes(step.args)) {
              console.log(`  ✓ assertUrl matches "${step.args}"`);
            } else {
              throw new Error(`URL "${url}" doesn't contain "${step.args}"`);
            }
            break;
          case 'screenshot':
            await page.screenshot({ path: step.args || `e2e-${test.name}.png`, fullPage: true });
            console.log(`  ✓ screenshot saved`);
            break;
          default:
            console.log(`  ? unknown action: ${step.action}`);
        }
      }
      passed++;
      console.log(`  ✅ PASS: ${test.name}`);
    } catch (err) {
      failed++;
      console.log(`  ❌ FAIL: ${test.name} — ${err.message}`);
    } finally {
      await page.close();
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
