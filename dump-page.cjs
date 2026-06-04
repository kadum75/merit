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
  let page = pages.find(p => p.url().includes('dashboard.stripe.com'));
  if (!page) page = pages[0];
  console.log('URL:', page.url().substring(0, 100));

  // Don't navigate - just log all visible text in the current page
  const text = await page.evaluate(() => document.body?.innerText || '');
  console.log('=== FULL PAGE TEXT ===');
  console.log(text);

  // Check if there's a dialog open
  const hasDialog = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');
    console.log('Dialogs found:', dialogs.length);
    dialogs.forEach((d, i) => {
      console.log(`Dialog ${i}:`, d.querySelector('h1, h2, h3, h4')?.textContent || d.className?.substring(0, 60));
    });
    return dialogs.length;
  });
  console.log('Has dialog:', hasDialog);

  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
