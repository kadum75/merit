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

  await page.bringToFront();
  await sleep(1000);

  // Press Escape to close any existing dialog, then reload
  await page.keyboard.press('Escape');
  await sleep(2000);
  await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await sleep(8000);

  // Step 1: Click "More options" on PrimeCV row
  const moreBtn = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const moreBtns = allBtns.filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    const btn = moreBtns[moreBtns.length - 1]; // PrimeCV is last
    const rect = btn.getBoundingClientRect();
    return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
  });
  console.log('More options:', JSON.stringify(moreBtn));
  await page.mouse.click(moreBtn.x, moreBtn.y);
  await sleep(2000);

  // Step 2: Click "Rotate key"
  const rotateOpt = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="menuitem"], a'));
    for (const btn of btns) {
      if ((btn.textContent?.trim()?.toLowerCase() || '').includes('rotate') && btn.offsetParent !== null) {
        const rect = btn.getBoundingClientRect();
        return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
      }
    }
    return null;
  });
  console.log('Rotate option:', JSON.stringify(rotateOpt));
  if (rotateOpt) {
    await page.mouse.click(rotateOpt.x, rotateOpt.y);
    await sleep(3000);
  }

  // Step 3: Click on "Expiration" dropdown/selector
  await page.screenshot({ path: '/tmp/stripe-dialog3.png' });

  // Find the expiration dropdown trigger
  const expBox = await page.evaluate(() => {
    // Look for the element that says "Select an expiration date..." or "Expiration"
    const allEls = document.querySelectorAll('div, span, button, [role="combobox"], [role="listbox"]');
    for (const el of allEls) {
      const text = el.textContent?.trim() || '';
      if ((text.includes('Select an expiration') || text.includes('Expiration') || text.includes('now') || text.includes('expire')) && el.offsetParent !== null) {
        const rect = el.getBoundingClientRect();
        // Prefer the one that's inside the dialog
        const closestDialog = el.closest('[role="dialog"], [aria-modal="true"]');
        if (closestDialog || text === 'Expiration' || text.includes('Select an expiration')) {
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: text.substring(0, 60) };
        }
      }
    }
    return null;
  });
  console.log('Expiration box:', JSON.stringify(expBox));

  if (expBox) {
    await page.mouse.click(expBox.x, expBox.y);
    await sleep(2000);

    // Step 4: Select "now" from the dropdown
    const nowOpt = await page.evaluate(() => {
      const allEls = document.querySelectorAll('div, span, button, [role="option"]');
      for (const el of allEls) {
        const text = el.textContent?.trim() || '';
        if (text === 'now' && el.offsetParent !== null) {
          const rect = el.getBoundingClientRect();
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
        }
      }
      return null;
    });
    console.log('now option:', JSON.stringify(nowOpt));

    if (nowOpt) {
      await page.mouse.click(nowOpt.x, nowOpt.y);
      await sleep(2000);
    } else {
      // Maybe it's a radio button style - try clicking on "now" text
      await page.evaluate(() => {
        const all = document.querySelectorAll('*');
        for (const el of all) {
          if (el.textContent?.trim() === 'now' && el.offsetParent !== null) {
            el.click();
            return;
          }
        }
      });
      await sleep(1000);
    }
  }

  // Step 5: Click "Rotate API key" confirm button
  const confirmBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Rotate API key' && b.offsetParent !== null && !b.disabled);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
    }
    return null;
  });
  console.log('Confirm button:', JSON.stringify(confirmBtn));

  if (confirmBtn) {
    await page.mouse.click(confirmBtn.x, confirmBtn.y);
    console.log('Clicked confirm');
    await sleep(8000);
    await page.screenshot({ path: '/tmp/stripe-rotated4.png' });

    const body = await page.evaluate(() => document.body?.innerText || '');
    console.log('After rotation:', body.substring(0, 1200));
    
    // Check if verification needed
    if (body.toLowerCase().includes('verification') && body.includes('code')) {
      console.log('VERIFICATION REQUIRED - check email');
    }

    // Check if key changed
    if (!body.includes('OSkX')) {
      console.log('OLD KEY GONE - rotation succeeded!');
    }
  }

  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
