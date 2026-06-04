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
  const [page] = await browser.pages();
  console.log('P0');

  // Close any existing dialog and reload
  await page.keyboard.press('Escape');
  await sleep(1000);
  await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle0' }).catch(() => {});
  await sleep(5000);
  console.log('P1');

  // Open menu for PrimeCV
  await page.mouse.click(1189, 615);
  await sleep(2000);
  console.log('P2');

  // Click Rotate key
  await page.mouse.click(1123, 687);
  await sleep(3000);
  console.log('P3');

  // Dump dialog HTML to find expiration options
  const diag = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
    const els = d ? Array.from(d.querySelectorAll('*')).filter(el => el.offsetParent !== null && el.textContent?.trim() && el.textContent.trim().length < 20).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim(),
      role: el.getAttribute('role') || '',
      x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2),
      y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2)
    })) : [];
    return { hasDialog: !!d, text: d?.innerText?.substring(0, 500), smallEls: els };
  });
  console.log('P4:', JSON.stringify(diag, null, 2));

  if (diag.hasDialog) {
    // Look for "now" option in dialog
    const now = diag.smallEls.find(e => e.text === 'now');
    if (now) {
      console.log('Found "now" at', now.x, now.y);
      await page.mouse.click(now.x, now.y);
      await sleep(2000);
    } else {
      // Try clicking on "Select an expiration date" to open dropdown
      const expTrigger = diag.smallEls.find(e => e.text.includes('Select'));
      if (expTrigger) {
        console.log('Found expiration trigger at', expTrigger.x, expTrigger.y);
        await page.mouse.click(expTrigger.x, expTrigger.y);
        await sleep(2000);

        // Now "now" should appear
        const now2 = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('*'));
          for (const el of els) {
            if (el.offsetParent !== null && el.textContent?.trim() === 'now') {
              return { x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2), y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2) };
            }
          }
          return null;
        });
        if (now2) {
          console.log('Found "now" after dropdown open at', now2.x, now2.y);
          await page.mouse.click(now2.x, now2.y);
          await sleep(2000);
        }
      }
    }

    // Click Rotate API key
    await page.mouse.click(787, 618);
    console.log('P5: Clicked confirm');
    await sleep(8000);

    const body = await page.evaluate(() => document.body?.innerText || '');
    console.log('P6:', body.includes('OSkX') ? 'OSkX still present' : 'OSkX GONE!');

    // Look for new key in page
    if (!body.includes('OSkX')) {
      const keys = body.match(/sk_live_[A-Za-z0-9_.]+/g);
      console.log('Keys:', JSON.stringify(keys));
    }
  }

  await browser.disconnect();
}

main().catch(e => { console.error('ERR:', e.message, e.stack?.split('\n')[0]); process.exit(1); });
