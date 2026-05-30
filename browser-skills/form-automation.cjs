const { chromium } = require('playwright');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const [url, ...formFields] = process.argv.slice(2);

if (!url || formFields.length < 2) {
  console.error('Usage: node browser-skills/form-automation.cjs <url> <selector1>=<value1> <selector2>=<value2> ... [::submit <selector>] [::screenshot <file>]');
  console.error('Example: node browser-skills/form-automation.cjs https://example.com/form input#name=John input#email=john@test.com :: submit button[type=submit] :: screenshot done.png');
  process.exit(1);
}

// Parse args into steps
const fullCmd = formFields.join(' ');
const steps = fullCmd.split(' :: ').map(s => s.trim());

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    console.log(`Opening ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

    for (const step of steps) {
      const parts = step.split(' ');
      const action = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      switch (action) {
        case 'submit': {
          const sel = args;
          await page.waitForSelector(sel, { timeout: 10000 });
          await page.click(sel);
          console.log(`   Submitted via ${sel}`);
          await page.waitForTimeout(2000);
          break;
        }
        case 'screenshot': {
          const file = args || 'form.png';
          await page.screenshot({ path: file, fullPage: true });
          console.log(`   Screenshot saved: ${file}`);
          break;
        }
        case 'wait': {
          await page.waitForSelector(args, { timeout: 10000 });
          console.log(`   Element visible: ${args}`);
          break;
        }
        case 'select': {
          const [sel, val] = args.split('=');
          await page.selectOption(sel.trim(), val.trim());
          console.log(`   Selected ${sel} = ${val}`);
          break;
        }
        default: {
          // selector=value format
          const eqIdx = step.indexOf('=');
          if (eqIdx === -1) throw new Error(`Invalid field format: ${step}`);
          const sel = step.substring(0, eqIdx).trim();
          const val = step.substring(eqIdx + 1).trim();
          await page.waitForSelector(sel, { timeout: 5000 });

          const tag = await page.evaluate(s => {
            const el = document.querySelector(s);
            if (!el) return '';
            const tag = el.tagName.toLowerCase();
            const type = (el.getAttribute('type') || '').toLowerCase();
            return tag + (type ? `:${type}` : '');
          }, sel);

          if (tag.includes('select')) {
            await page.selectOption(sel, val);
          } else {
            await page.fill(sel, val);
          }
          console.log(`   Filled ${sel} = ${val}`);
        }
      }
    }

    console.log(`✅ Form automation complete.`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
