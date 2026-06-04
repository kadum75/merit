const puppeteer = require('puppeteer-core');
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
  let page = pages.find(p => p.url().includes('stripe.com') && !p.url().includes('login'));
  if (!page) page = pages[0];
  console.log('URL:', page.url().substring(0, 100));

  await page.screenshot({ path: '/tmp/stripe-state.png' });
  console.log('Screenshot saved');

  // Check for any dialog/modal
  const hasDialog = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"], [class*="modal"], [class*="overlay"]');
    return dialogs.length;
  });
  console.log('Dialogs open:', hasDialog);

  // Dump all buttons
  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null).map(b => ({
      text: b.textContent?.trim()?.substring(0, 50),
      disabled: b.disabled,
      x: b.getBoundingClientRect().x,
      y: b.getBoundingClientRect().y
    }));
  });
  console.log('Visible buttons:', JSON.stringify(btns, null, 2));

  await browser.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
