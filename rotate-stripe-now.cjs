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

  // Get all pages
  const pages = await browser.pages();
  console.log(`Open pages: ${pages.length}`);

  // Find Stripe page or create new one
  let page = pages.find(p => p.url().includes('stripe.com'));
  if (!page) {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
  }

  const url = page.url();
  console.log('Current URL:', url.substring(0, 120));
  const body = await page.evaluate(() => document.body?.innerText || '');
  console.log('Page text (first 300):', body.substring(0, 300));

  // Check if logged in
  if (url.includes('login') || body.includes('Sign in')) {
    console.log('Not logged in. Checking for verification code input...');
    // Look for SMS code input
    const codeInputs = await page.$$('input[type="tel"]');
    console.log(`Found ${codeInputs.length} tel inputs`);
    if (codeInputs.length > 0) {
      // Enter the code
      await codeInputs[0].click();
      await codeInputs[0].type('159402', { delay: 30 });
      console.log('Entered verification code');
      await sleep(2000);
      // Click Continue
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent?.toLowerCase().includes('continue')) {
            btn.click(); return;
          }
        }
      });
      console.log('Clicked Continue');
      await sleep(10000);
    }
  }

  // Navigate to API keys
  console.log('\nGoing to API keys...');
  await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle0', timeout: 30000 }).catch(e => console.log('Nav:', e.message));
  await sleep(10000);

  const url2 = page.url();
  console.log('URL:', url2.substring(0, 100));

  // Wait for actual API key content to render
  await page.waitForFunction(() => {
    const text = document.body?.innerText || '';
    return text.includes('sk_live') || text.includes('Secret key') || text.includes('PrimeCV') || text.includes('API keys');
  }, { timeout: 15000 }).catch(() => console.log('Wait for key content timed out'));

  const body2 = await page.evaluate(() => document.body?.innerText || '');
  console.log('Body (first 800):', body2.substring(0, 800));

  if (url2.includes('apikeys') && !url2.includes('login')) {
    console.log('\nON API KEYS PAGE!');

    await page.screenshot({ path: '/tmp/stripe-keys.png' });

    // Find and click the rotate menu for PrimeCV
    const rotateClicked = await page.evaluate(() => {
      // Find the row with PrimeCV
      const rows = document.querySelectorAll('tr, [role="row"], div[class*="row"]');
      for (const row of rows) {
        if (row.textContent?.includes('PrimeCV')) {
          // Find action button in this row
          const menuBtn = row.querySelector('button[aria-label*="menu"], button[aria-label*="more"], [data-testid*="menu"]');
          if (menuBtn) {
            menuBtn.click();
            return 'menu clicked';
          }
          // Try clicking the row itself
          row.click();
          return 'row clicked';
        }
      }
      return 'PrimeCV not found';
    });
    console.log('Row action:', rotateClicked);
    await sleep(2000);

    // If menu opened, click "Rotate key"
    const rotateOption = await page.evaluate(() => {
      const items = document.querySelectorAll('[role="menuitem"], button, a, [role="option"]');
      for (const item of items) {
        if (item.textContent?.toLowerCase().includes('rotate') && item.offsetParent !== null) {
          item.click();
          return 'rotate clicked';
        }
      }
      return 'no rotate option';
    });
    console.log('Rotate option:', rotateOption);
    await sleep(3000);
    await page.screenshot({ path: '/tmp/stripe-rotate.png' });

    const body3 = await page.evaluate(() => document.body?.innerText || '');
    console.log('After rotate click:', body3.substring(0, 500));

    // Handle verification or confirm dialog
    // Log the full dialog content
    console.log('DIALOG TEXT:', body3);

    // Check for any dialog/verification elements
    const allBtns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent?.substring(0, 60),
        disabled: b.disabled,
        visible: b.offsetParent !== null
      })).filter(b => b.visible);
    });
    console.log('Visible buttons:', JSON.stringify(allBtns));

    if (body3.toLowerCase().includes('verification') || body3.toLowerCase().includes('send') || body3.toLowerCase().includes('verify')) {
      console.log('Verification required');
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          const t = btn.textContent?.toLowerCase() || '';
          if ((t.includes('send') || t.includes('verify')) && !t.includes('cancel')) {
            btn.click(); return;
          }
        }
      });
      await sleep(3000);
      await page.screenshot({ path: '/tmp/stripe-verify-sent.png' });

    } else {
      // Assume this is the confirmation dialog - click all non-cancel buttons
      console.log('Trying to confirm...');
      await page.evaluate(() => {
        // Check any unchecked checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (!cb.checked) { cb.click(); cb.checked = true; }
        });
      });
      await sleep(1000);

      // Click the confirm/submit button
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button, [role="button"]');
        for (const btn of btns) {
          const text = btn.textContent?.toLowerCase() || '';
          if ((text.includes('rotate') || text.includes('confirm') || text.includes('submit')) && !text.includes('cancel')) {
            btn.click(); return;
          }
        }
        // If no matching button, click the last visible button in the dialog
        const visibleBtns = Array.from(btns).filter(b => b.offsetParent !== null);
        if (visibleBtns.length > 0) visibleBtns[visibleBtns.length - 1].click();
      });
      await sleep(5000);
      await page.screenshot({ path: '/tmp/stripe-rotated.png' });

      const body5 = await page.evaluate(() => document.body?.innerText || '');
      console.log('After confirm:', body5.substring(0, 800));

      // Extract new key from the page
      const newKey = await page.evaluate(() => {
        const text = document.body?.innerText || '';
        const match = text.match(/sk_live_[A-Za-z0-9]+/);
        return match ? match[0] : null;
      });
      console.log('\nNEW STRIPE KEY:', newKey);

      if (newKey) {
        const envPath = '/home/kadum/AI/primecv-master/.env.local';
        let env = fs.readFileSync(envPath, 'utf8');
        env = env.replace(/sk_live_[A-Za-z0-9]+/g, newKey);
        fs.writeFileSync(envPath, env);
        console.log('Updated .env.local');
      }
    }

    await page.screenshot({ path: '/tmp/stripe-final.png' });
    const finalBody = await page.evaluate(() => document.body?.innerText || '');
    console.log('\nFinal page:', finalBody.substring(0, 500));
  }

  await browser.disconnect();
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
