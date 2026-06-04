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

  // Use page.mouse for trusted events
  await page.bringToFront();

  // Navigate fresh to api keys to clear any dialog state
  await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle0', timeout: 30000 }).catch(e => console.log('Nav timeout:', e.message));
  console.log('Page loaded, waiting for content...');
  await sleep(8000);

  await page.screenshot({ path: '/tmp/stripe-after-nav.png' });

  // Find PrimeCV More options button
  const pageInfo = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button'));
    return { total: allBtns.length, visibleMore: allBtns.filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null).length };
  });
  console.log('Page info:', JSON.stringify(pageInfo));

  const btnInfo = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button'));
    for (const btn of allBtns) {
      if (btn.textContent?.trim() === 'More options' && btn.offsetParent !== null) {
        const row = btn.closest('tr, [role="row"], [class*="row"], [class*="Row"], div');
        if (row && (row.textContent?.includes('PrimeCV') || row.textContent?.includes('OSkX'))) {
          const rect = btn.getBoundingClientRect();
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: row.textContent?.substring(0, 80) };
        }
      }
    }
    // Fallback: find the last "More options" button (PrimeCV is usually last)
    const moreBtns = allBtns.filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    console.log(`More options buttons: ${moreBtns.length}`);
    if (moreBtns.length > 0) {
      const btn = moreBtns[moreBtns.length - 1];
      const rect = btn.getBoundingClientRect();
      return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: 'last more options', idx: moreBtns.length - 1 };
    }
    return null;
  });
  console.log('More options for PrimeCV:', JSON.stringify(btnInfo));

  if (btnInfo) {
    await page.mouse.click(btnInfo.x, btnInfo.y);
    console.log('Clicked More options');
    await sleep(2000);

    // Find Rotate option
    const rotateInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, [role="menuitem"], a, [role="option"]'));
      for (const btn of btns) {
        const text = btn.textContent?.trim()?.toLowerCase() || '';
        if ((text.includes('rotate') || text.includes('roll')) && btn.offsetParent !== null) {
          const rect = btn.getBoundingClientRect();
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: btn.textContent?.trim() };
        }
      }
      return null;
    });
    console.log('Rotate option:', JSON.stringify(rotateInfo));

    if (rotateInfo) {
      await page.mouse.click(rotateInfo.x, rotateInfo.y);
      console.log('Clicked Rotate');
      await sleep(3000);

      // Wait for dialog
      await page.screenshot({ path: '/tmp/stripe-dialog2.png' });

      // Find and click Rotate API key confirm
      const confirmInfo = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"], [aria-modal="true"], [class*="modal"]');
        if (dialog) {
          const btns = dialog.querySelectorAll('button');
          for (const btn of btns) {
            const text = btn.textContent?.trim() || '';
            if (text.includes('Rotate') && !btn.disabled) {
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text };
            }
          }
        }
        // Fallback
        const allBtns = Array.from(document.querySelectorAll('button'));
        for (const btn of allBtns) {
          const text = btn.textContent?.trim() || '';
          if (text === 'Rotate API key' && btn.offsetParent !== null && !btn.disabled) {
            const rect = btn.getBoundingClientRect();
            return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text };
          }
        }
        return null;
      });
      console.log('Confirm button:', JSON.stringify(confirmInfo));

      if (confirmInfo) {
        await page.mouse.click(confirmInfo.x, confirmInfo.y);
        console.log('Clicked Confirm');
        await sleep(8000);
        await page.screenshot({ path: '/tmp/stripe-done.png' });

        const body = await page.evaluate(() => document.body?.innerText || '');
        console.log('After rotation:', body.substring(0, 1200));

        // Check for verification requirement
        if (body.toLowerCase().includes('verification') && body.includes('code')) {
          console.log('VERIFICATION REQUIRED - check SMS/email');
          // The page might show a verification code input
        }

        // Find new key
        const keys = [...body.matchAll(/sk_live_[A-Za-z0-9]+/g)].map(m => m[0]);
        console.log('All keys:', JSON.stringify(keys));

        if (!body.includes('OSkX')) {
          console.log('Old key GONE - rotation succeeded!');
          const newKey = keys.find(k => k !== 'sk_live_...RvFO' && !k.includes('...'));
          if (newKey) {
            const envPath = '/home/kadum/AI/primecv-master/.env.local';
            let env = fs.readFileSync(envPath, 'utf8');
            env = env.replace(/sk_live_[A-Za-z0-9]+/g, newKey);
            fs.writeFileSync(envPath, env);
            console.log('Updated .env.local with', newKey);
          }
        } else {
          console.log('OSkX still present - rotation may need verification');
        }
      }
    }
  }

  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
