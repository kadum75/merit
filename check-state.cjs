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

  // Get full HTML to find any hidden dialogs, toasts, or verification UI
  const html = await page.evaluate(() => {
    // Find any overlay/modal/dialog
    const dialogs = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.offsetParent !== null || el.classList?.contains?.('Toast') || el.getAttribute?.('role') === 'dialog' || el.getAttribute?.('aria-modal') === 'true') {
        const text = el.textContent?.trim()?.substring(0, 100);
        if (text && (text.includes('code') || text.includes('verif') || text.includes('email') || text.includes('send') || text.includes('toast') || text.includes('success') || text.includes('error') || text.includes('alert'))) {
          dialogs.push({
            tag: el.tagName,
            class: el.className?.substring(0, 80),
            text: text,
            visible: el.offsetParent !== null
          });
        }
      }
    }
    return dialogs;
  });
  console.log('Dialog elements:', JSON.stringify(html, null, 2));

  // Also check for any input fields (verification code inputs)
  const inputs = await page.evaluate(() => {
    const allInputs = Array.from(document.querySelectorAll('input'));
    return allInputs.map(i => ({
      type: i.type,
      placeholder: i.placeholder,
      visible: i.offsetParent !== null
    }));
  });
  console.log('Inputs:', JSON.stringify(inputs));

  // Check for toasts/notifications
  const toasts = await page.evaluate(() => {
    const all = document.querySelectorAll('[class*="Toast"], [class*="toast"], [role="alert"], [class*="notification"]');
    return Array.from(all).map(t => t.textContent?.substring(0, 200));
  });
  console.log('Toasts:', JSON.stringify(toasts));

  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
