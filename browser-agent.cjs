const { chromium } = require('playwright');

const args = process.argv.slice(2);
const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

async function connectBrowser() {
  // If CDP env var is set, connect to a running browser
  if (process.env.CDP_ENDPOINT) {
    const browser = await chromium.connectOverCDP(process.env.CDP_ENDPOINT);
    const pages = browser.contexts()[0]?.pages() || [];
    const page = pages[0] || await (browser.contexts()[0] || await browser.newContext()).newPage();
    return { browser, page, isCDP: true };
  }

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  return { browser, page, isCDP: false };
}

async function run() {
  const { browser, page, isCDP } = await connectBrowser();
  console.log(`[INFO] Mode: ${isCDP ? 'CDP (connected to running browser)' : 'headless'}`);

  try {
    const commands = args.join(' ').split(' :: ').map(c => c.trim());

    for (const cmdStr of commands) {
      const parts = cmdStr.split(' ');
      const cmd = parts[0];
      const cmdArgs = parts.slice(1);

      switch (cmd) {
        case 'goto': {
          await page.goto(cmdArgs[0], { waitUntil: 'networkidle', timeout: 30000 });
          console.log(`[OK] Navigated to: ${page.url()}`);
          break;
        }

        case 'click': {
          const sel = cmdArgs.join(' ');
          await page.waitForSelector(sel, { timeout: 10000 });
          await page.click(sel);
          console.log(`[OK] Clicked: ${sel}`);
          break;
        }

        case 'type': {
          const sel = cmdArgs[0];
          const text = cmdArgs.slice(1).join(' ');
          await page.waitForSelector(sel, { timeout: 10000 });
          await page.type(sel, text, { delay: 30 });
          console.log(`[OK] Typed "${text}" into ${sel}`);
          break;
        }

        case 'fill': {
          const sel = cmdArgs[0];
          const val = cmdArgs.slice(1).join(' ');
          await page.waitForSelector(sel, { timeout: 10000 });
          await page.fill(sel, val);
          console.log(`[OK] Filled ${sel} with "${val}"`);
          break;
        }

        case 'screenshot': {
          const filename = cmdArgs[0] || 'screenshot.png';
          await page.screenshot({ path: filename, fullPage: true });
          console.log(`[OK] Screenshot saved: ${filename}`);
          break;
        }

        case 'extract': {
          const text = await page.evaluate(() => document.body.innerText);
          console.log(text.substring(0, 8000));
          break;
        }

        case 'wait': {
          const sel = cmdArgs.join(' ');
          await page.waitForSelector(sel, { timeout: 15000 });
          console.log(`[OK] Element visible: ${sel}`);
          break;
        }

        case 'eval': {
          const js = cmdArgs.join(' ');
          const result = await page.evaluate((code) => eval(code), js);
          const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
          console.log(output);
          break;
        }

        case 'press': {
          const key = cmdArgs.join(' ');
          await page.keyboard.press(key);
          console.log(`[OK] Pressed: ${key}`);
          break;
        }

        case 'select': {
          const sel = cmdArgs[0];
          const val = cmdArgs.slice(1).join(' ');
          await page.selectOption(sel, val);
          console.log(`[OK] Selected "${val}" from ${sel}`);
          break;
        }

        case 'title': {
          console.log(`Title: ${await page.title()}`);
          break;
        }

        case 'sleep': {
          const ms = parseInt(cmdArgs[0]) || 1000;
          await new Promise(r => setTimeout(r, ms));
          break;
        }

        case 'html': {
          const html = await page.content();
          console.log(html.substring(0, 8000));
          break;
        }

        case 'pdf': {
          const filename = cmdArgs[0] || 'page.pdf';
          await page.pdf({ path: filename, format: 'A4', printBackground: true });
          console.log(`[OK] PDF saved: ${filename}`);
          break;
        }

        case 'network': {
          const requests = [];
          page.on('request', req => requests.push({ url: req.url(), method: req.method(), type: req.resourceType() }));
          page.on('response', res => {
            const entry = requests.find(r => r.url === res.url());
            if (entry) entry.status = res.status();
          });
          await page.waitForTimeout(2000);
          console.log(JSON.stringify(requests, null, 2));
          break;
        }

        case 'tabs': {
          const contexts = browser.contexts();
          for (let i = 0; i < contexts.length; i++) {
            const pages = contexts[i].pages();
            console.log(`Context ${i}: ${pages.length} tabs`);
            for (let j = 0; j < pages.length; j++) {
              console.log(`  [${j}] ${pages[j].url()} — "${await pages[j].title()}"`);
            }
          }
          break;
        }

        case 'switch': {
          const tabIdx = parseInt(cmdArgs[0]);
          if (isNaN(tabIdx)) {
            // switch by URL/title match
            const match = cmdArgs.join(' ');
            const contexts = browser.contexts();
            let found = false;
            for (const ctx of contexts) {
              for (const p of ctx.pages()) {
                const url = p.url();
                const title = await p.title();
                if (url.includes(match) || title.includes(match)) {
                  page = p;
                  console.log(`[OK] Switched to tab: ${title}`);
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
            if (!found) console.log(`[ERROR] No tab matching: ${match}`);
          } else {
            const contexts = browser.contexts();
            let idx = 0;
            let found = false;
            for (const ctx of contexts) {
              const pages = ctx.pages();
              for (let j = 0; j < pages.length; j++) {
                if (idx === tabIdx) {
                  page = pages[j];
                  console.log(`[OK] Switched to tab [${tabIdx}]: ${await page.title()}`);
                  found = true;
                  break;
                }
                idx++;
              }
              if (found) break;
            }
            if (!found) console.log(`[ERROR] Tab index ${tabIdx} not found`);
          }
          break;
        }

        case 'newtab': {
          const url = cmdArgs[0];
          const ctx = browser.contexts()[0] || await browser.newContext();
          page = await ctx.newPage();
          if (url) {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            console.log(`[OK] New tab: ${page.url()}`);
          } else {
            console.log(`[OK] New blank tab opened`);
          }
          break;
        }

        case 'closetab': {
          await page.close();
          const contexts = browser.contexts();
          let remaining = 0;
          for (const ctx of contexts) remaining += ctx.pages().length;
          console.log(`[OK] Tab closed. ${remaining} tabs remaining`);
          break;
        }

        default:
          console.log(`[ERROR] Unknown command: ${cmd}`);
      }
    }
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  } finally {
    if (!isCDP) await browser.close();
  }
}

run();
