const puppeteer = require('puppeteer-core');
const fs = require('fs');
const http = require('http');

const CDP_PORT = 9225;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const info = await httpGet('/json/version');
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('stripe.com'));
  if (!page) {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
  }

  console.log('Current URL:', page.url().substring(0, 120));

  // Wait for the dialog to be visible
  await sleep(2000);

  // Check dialog text
  const dialogText = await page.evaluate(() => document.body?.innerText || '');
  if (dialogText.includes('Rotate API key') && dialogText.includes('Cancel')) {
    console.log('Rotation dialog is open!');
    
    // Click the "Rotate API key" button
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent?.trim() === 'Rotate API key' && btn.offsetParent !== null) {
          console.log('Found rotate button');
          btn.click();
          return;
        }
      }
    });
    console.log('Clicked Rotate API key');
    await sleep(8000);
    await page.screenshot({ path: '/tmp/stripe-rotated.png' });

    const body = await page.evaluate(() => document.body?.innerText || '');
    console.log('After rotation:', body.substring(0, 1000));

    // Extract new key
    const newKey = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      // Look for new key in the success/show dialog
      const match = text.match(/sk_live_[A-Za-z0-9]+[A-Za-z0-9]/);
      return match ? match[0] : null;
    });
    console.log('\nNEW STRIPE KEY:', newKey);

    // Also try extracting from any visible text elements
    const newKey2 = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="key"], [class*="token"], code, pre, input[type="text"]');
      for (const el of elements) {
        if (el.textContent?.includes('sk_live')) {
          return el.textContent.trim();
        }
      }
      return null;
    });
    console.log('KEY from elements:', newKey2);

    // Try getting from the new key reveal area (might be a modal/section that shows new key)
    const pageContent = await page.evaluate(() => {
      // Get all visible text
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const texts = [];
      let node;
      while (node = walker.nextNode()) {
        const t = node.textContent?.trim();
        if (t && t.includes('sk_live')) texts.push(t);
      }
      return texts;
    });
    console.log('All key texts:', JSON.stringify(pageContent));

    if (newKey) {
      const envPath = '/home/kadum/AI/primecv-master/.env.local';
      let env = fs.readFileSync(envPath, 'utf8');
      env = env.replace(/sk_live_[A-Za-z0-9]+/g, newKey);
      fs.writeFileSync(envPath, env);
      console.log('Updated .env.local with', newKey);
    } else {
      console.log('New key not found - trying to look up via page...');
      // Wait more for the key to appear
      await sleep(5000);
      const body2 = await page.evaluate(() => document.body?.innerText || '');
      console.log('Body after more wait:', body2.substring(0, 1000));
      
      const newKey3 = await page.evaluate(() => {
        const text = document.body?.innerText || '';
        const match = text.match(/sk_live_[A-Za-z0-9]+/);
        return match ? match[0] : null;
      });
      console.log('New key after wait:', newKey3);
    }
  } else {
    console.log('Rotation dialog not found. Reloading page...');
    await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await sleep(5000);
    console.log('Page loaded. You may need to re-trigger the rotation.');
  }

  await browser.disconnect();
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
