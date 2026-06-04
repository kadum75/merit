const puppeteer = require('puppeteer-core');
const http = require('http');
const CDP_PORT = 9225;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}${path}`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const info = await httpGet('/json/version');
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  console.log('Connected to browser');

  // Use targets() instead of pages() to avoid hang
  const targets = browser.targets();
  const stripeTarget = targets.find(t => t.url()?.includes('acct_') && t.url()?.includes('apikeys'));
  if (!stripeTarget) {
    console.log('No Stripe API keys target found');
    const allUrls = targets.map(t => t.url()?.substring(0, 80));
    console.log('Targets:', allUrls);
    await browser.disconnect();
    return;
  }

  const page = await stripeTarget.page();
  console.log('Got page:', page.url()?.substring(0, 80));

  // Ensure focused
  await page.bringToFront();
  await sleep(1000);

  await page.mouse.click(1189, 615);
  await sleep(2000);
  console.log('Clicked More options');

  // Check for menu
  const menuText = await page.evaluate(() => {
    const menus = document.querySelectorAll('[role="menu"]');
    const visible = Array.from(menus).filter(m => m.offsetParent !== null);
    return visible.map(m => m.innerText?.substring(0, 200));
  });
  console.log('Visible menus:', JSON.stringify(menuText));

  if (menuText.length > 0) {
    // Find Rotate
    const rotOpt = await page.evaluate(() => {
      const items = document.querySelectorAll('button, [role="menuitem"], a');
      for (const item of items) {
        if (item.offsetParent !== null && item.textContent?.trim().toLowerCase().includes('rotate')) {
          const rect = item.getBoundingClientRect();
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
        }
      }
      return null;
    });

    if (rotOpt) {
      console.log('Rotate option at:', rotOpt);
      await page.mouse.click(rotOpt.x, rotOpt.y);
      await sleep(3000);
      console.log('Clicked Rotate');

      // Check dialog
      const dialogText = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
        return d?.innerText?.substring(0, 500);
      });
      console.log('Dialog:', dialogText);

      if (dialogText) {
        // Find expiration and "now" option
        const nowPos = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (!d) return null;
          const now = d.querySelector('*');
          const all = d.querySelectorAll('*');
          for (const el of all) {
            if (el.offsetParent !== null && el.textContent?.trim() === 'now') {
              const rect = el.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          // Try clicking "Select an expiration date" first
          for (const el of all) {
            if (el.offsetParent !== null && el.textContent?.includes('Select an expiration')) {
              const rect = el.getBoundingClientRect();
              return { tag: 'select', x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          // Check for radio buttons
          for (const el of all) {
            if (el.offsetParent !== null && el.textContent?.trim() === 'now') {
              const rect = el.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          return null;
        });
        console.log('Now position:', JSON.stringify(nowPos));

        if (nowPos) {
          await page.mouse.click(nowPos.x, nowPos.y);
          await sleep(1000);
          console.log('Clicked now');
        }

        // Click Rotate API key
        const confirmPos = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (!d) return null;
          const btns = d.querySelectorAll('button');
          for (const btn of btns) {
            if (btn.textContent?.trim() === 'Rotate API key' && !btn.disabled) {
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          return null;
        });
        console.log('Confirm position:', JSON.stringify(confirmPos));

        if (confirmPos) {
          await page.mouse.click(confirmPos.x, confirmPos.y);
          await sleep(8000);

          const body = await page.evaluate(() => document.body?.innerText || '');
          console.log('OSkX present:', body.includes('OSkX'));
          if (!body.includes('OSkX')) {
            console.log('*** ROTATION SUCCEEDED ***');
            const keys = body.match(/sk_live_[A-Za-z0-9_.]+/g);
            console.log('Keys:', JSON.stringify(keys));
          } else {
            // Check for verification
            console.log('Verification check:', body.includes('verification') || body.includes('Verification'));
          }
        }
      }
    }
  } else {
    console.log('No menu appeared');
  }

  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message, e.stack?.split('\n')[1]); process.exit(1); });
