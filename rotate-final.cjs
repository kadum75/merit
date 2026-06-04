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
  let page = pages.find(p => p.url().includes('dashboard.stripe.com'));
  if (!page) page = pages[0];
  console.log('URL:', page.url().substring(0, 100));

  const cdp = await page.target.createCDPSession();

  // Click "Rotate API key" at coordinates (734, 618)
  const click = async (x, y) => {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };

  await click(734, 618);
  console.log('Clicked Rotate API key');
  await sleep(8000);
  await page.screenshot({ path: '/tmp/stripe-rotated3.png' });

  // Check for new key
  const body = await page.evaluate(() => document.body?.innerText || '');
  console.log('Body:', body.substring(0, 1200));

  // Find all keys
  const keys = [...body.matchAll(/sk_live_[A-Za-z0-9]+/g)].map(m => m[0]);
  console.log('Keys found:', JSON.stringify(keys));

  // Look for the success/new key reveal
  const newKeySection = body.substring(body.indexOf('PrimeCV'), body.indexOf('PrimeCV') + 500);
  console.log('PrimeCV section:', newKeySection);

  // If the key changed (OSkX not there), we need to find the new key
  if (!body.includes('OSkX')) {
    console.log('Old key (OSkX) is GONE - rotation succeeded!');
    const newKey = keys.find(k => k !== 'sk_live_...RvFO');
    console.log('Likely new key:', newKey);

    if (newKey && !newKey.includes('...')) {
      const envPath = '/home/kadum/AI/primecv-master/.env.local';
      let env = fs.readFileSync(envPath, 'utf8');
      env = env.replace(/sk_live_[A-Za-z0-9]+/g, newKey);
      fs.writeFileSync(envPath, env);
      console.log('Updated .env.local with', newKey);
    }
  } else {
    console.log('Old key still present - rotation may have failed or is pending');
    // The dialog might be closed, but key might be in a "key just rotated" state
    // Sometimes Stripe shows a toast + changes the table immediately
    // Let's check again after more time
    await sleep(5000);
    const body2 = await page.evaluate(() => document.body?.innerText || '');
    console.log('Body after extra wait:', body2.substring(0, 800));
    const keys2 = [...body2.matchAll(/sk_live_[A-Za-z0-9]+/g)].map(m => m[0]);
    console.log('Keys after wait:', JSON.stringify(keys2));
  }

  await cdp.detach();
  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
