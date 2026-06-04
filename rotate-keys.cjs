const puppeteer = require('puppeteer-core');
const fs = require('fs');
const http = require('http');

const CDP_PORT = 9225;
const ENV_FILE = '/home/kadum/AI/primecv-master/.env.local';
const STRIPE_EMAIL = 'rjcosta@gmail.com';
const STRIPE_PASSWORD = '@Blasted23';
const LOG = [];

function log(m) { const l = `[${new Date().toISOString()}] ${m}`; LOG.push(l); console.log(l); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function getBrowserWS() {
  const data = await httpGet('/json/version');
  return data.webSocketDebuggerUrl;
}

async function run() {
  const browserWS = await getBrowserWS();
  log(`Connecting...`);
  const browser = await puppeteer.connect({ browserWSEndpoint: browserWS, defaultViewport: null });
  log('Connected');

  // ====== STRIPE ======
  log('\n=== STRIPE KEY ROTATION ===');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Listen for popups
  const popupPromise = new Promise(resolve => {
    browser.on('targetcreated', async target => {
      try {
        const tUrl = target.url() || '';
        if (tUrl.includes('google.com')) {
          log(`Popup: ${tUrl.substring(0, 80)}`);
          const popPage = await target.page();
          resolve(popPage);
        }
      } catch (e) {}
    });
  });

  log('Navigate to Stripe login...');
  await page.goto('https://dashboard.stripe.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => log(`Nav: ${e.message}`));
  await sleep(4000);

  let url = page.url();
  let body = await page.evaluate(() => document.body?.innerText || '');
  log(`Login page: ${url}`);

  if (url.includes('login') || body.includes('Sign in')) {
    log('Trying email/password login first...');

    // Set form values directly via JS (fast, no typing delay)
    await page.evaluate((email, pw) => {
      const e = document.querySelector('#email');
      const p = document.querySelector('#old-password');
      if (e) { e.value = email; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }
      if (p) { p.value = pw; p.dispatchEvent(new Event('input', { bubbles: true })); p.dispatchEvent(new Event('change', { bubbles: true })); }
    }, STRIPE_EMAIL, STRIPE_PASSWORD);
    log('Form values set via JS');
    await sleep(2000);
    await page.screenshot({ path: '/tmp/stripe-filled.png' });

    // Click submit
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = false;
        btn.click();
      }
    });
    log('Clicked Sign in');
    await sleep(15000);

    url = page.url();
    body = await page.evaluate(() => document.body?.innerText || '');
    log(`After login URL: ${url}`);

    // If still on login, try enabling the button and clicking again
    if (url.includes('login')) {
      log('Login failed with email/password, trying Google OAuth...');

      // Click Google sign-in - it might navigate away from Stripe
      const googleClicked = await page.evaluate(() => {
        const allEls = document.querySelectorAll('button, a, span, div, [role="button"]');
        for (const el of allEls) {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('google') && el.offsetParent !== null) {
            el.click();
            return true;
          }
        }
        return false;
      });
      log(`Google clicked: ${googleClicked}`);
      await sleep(8000);

      url = page.url();
      log(`URL after Google click: ${url.substring(0, 100)}`);

      // Check if we were redirected to Google
      if (url.includes('google.com') || url.includes('accounts.google')) {
        log('Redirected to Google! Need to handle login there...');
        await page.screenshot({ path: '/tmp/google-login-page.png' });

        const googleText = await page.evaluate(() => document.body?.innerText || '');
        log(`Google page text: ${googleText.substring(0, 300)}`);

        // Enter email
        const gEmailInput = await page.$('input[type="email"]');
        if (gEmailInput) {
          await gEmailInput.click();
          await gEmailInput.type(STRIPE_EMAIL, { delay: 10 });
          log('Google email entered');
          await sleep(1000);
          await page.keyboard.press('Enter');
          await sleep(4000);
        }

        // Enter password
        const gPwInput = await page.$('input[type="password"]');
        if (gPwInput) {
          await gPwInput.click();
          await gPwInput.type(STRIPE_PASSWORD, { delay: 8 });
          log('Google password entered');
          await sleep(1000);
          await page.keyboard.press('Enter');
          await sleep(15000);
        }

        url = page.url();
        log(`URL after Google login: ${url.substring(0, 100)}`);
        await page.screenshot({ path: '/tmp/post-google-login.png' });
      }
    }

    // Check Stripe state after login
    url = page.url();
    body = await page.evaluate(() => document.body?.innerText || '');
    log(`After login URL: ${url}`);
    log(`After login body (200): ${body.substring(0, 200)}`);
  }

  // Now navigate to API keys
  log('\nNavigating to API keys...');
  await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => log(`Nav: ${e.message}`));
  await sleep(6000);

  url = page.url();
  body = await page.evaluate(() => document.body?.innerText || '');
  log(`API keys URL: ${url}`);

  // Save page content for analysis
  const pageContent = await page.content();
  fs.writeFileSync('/tmp/stripe-apikeys.html', pageContent);

  if (url.includes('apikeys') && !url.includes('login')) {
    log('SUCCESS: On API keys page!');

    // Dump key-related text
    const keyLines = await page.evaluate(() => {
      return (document.body?.innerText || '').split('\n').filter(l =>
        l.includes('sk_live') || l.includes('PrimeCV') || l.includes('Rotate') || l.includes('Secret key')
      );
    });
    log(`Key lines: ${JSON.stringify(keyLines)}`);

    // Try to find and click the overflow menu on PrimeCV row
    // Look for buttons near the "PrimeCV" text in the table
    await page.evaluate(() => {
      // Find all rows/tables and look for one containing "PrimeCV"
      const rows = document.querySelectorAll('tr, [role="row"], div[class*="row"]');
      for (const row of rows) {
        if (row.textContent?.includes('PrimeCV')) {
          // Find the menu/action button in this row
          const menuBtn = row.querySelector('button[aria-label*="menu"], button[aria-label*="more"], button[aria-label*="action"]');
          if (menuBtn) {
            menuBtn.click();
            return 'clicked menu';
          }
          // Click the row to reveal actions
          row.click();
          return 'clicked row';
        }
      }
      return 'PrimeCV row not found';
    });
    log('Clicked PrimeCV row');
    await sleep(2000);
    await page.screenshot({ path: '/tmp/stripe-menu.png' });

    // Click "Rotate key" option
    await page.evaluate(() => {
      const items = document.querySelectorAll('button, [role="menuitem"], a, [role="option"]');
      for (const item of items) {
        if (item.textContent?.toLowerCase().includes('rotate')) {
          item.click();
          return true;
        }
      }
      return false;
    });
    log('Clicked Rotate key');
    await sleep(3000);
    await page.screenshot({ path: '/tmp/stripe-rotate-dialog.png' });

    body = await page.evaluate(() => document.body?.innerText || '');
    log(`After rotate click: ${body.substring(0, 400)}`);

    // Handle the rotate dialog - check for verification or confirm
    if (body.includes('verification') || body.includes('Verification') || body.includes('Send')) {
      log('Verification required');

      // Click "Send verification" button
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent?.toLowerCase().includes('send') || btn.textContent?.toLowerCase().includes('verify')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      log('Clicked send verification');
      await sleep(3000);
      await page.screenshot({ path: '/tmp/stripe-verify-sent.png' });

      body = await page.evaluate(() => document.body?.innerText || '');
      log(`After send verify: ${body.substring(0, 300)}`);

    } else if (body.includes('expire') || body.includes('Expire')) {
      // Confirm rotation - set "expire old key immediately"
      log('Confirming rotation...');
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent?.toLowerCase().includes('rotate') || btn.textContent?.toLowerCase().includes('confirm')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      await sleep(5000);
      await page.screenshot({ path: '/tmp/stripe-rotated.png' });

      body = await page.evaluate(() => document.body?.innerText || '');
      log(`After rotation: ${body.substring(0, 500)}`);

      // Extract new key
      const newKey = await page.evaluate(() => {
        const text = document.body?.innerText || '';
        const match = text.match(/sk_live_[A-Za-z0-9]+/);
        return match ? match[0] : null;
      });
      log(`New Stripe key: ${newKey}`);
    }
  } else if (body.includes('Sign in') || url.includes('login')) {
    log('Still not logged in');
  } else {
    log(`Unexpected state: ${body.substring(0, 100)}`);
  }

  await page.close();
  await browser.disconnect();
  fs.writeFileSync('/tmp/rotation-log.txt', LOG.join('\n'));
  log('\nDone');
}

run().catch(e => {
  console.error('FATAL:', e.message, e.stack?.substring(0, 500));
  fs.writeFileSync('/tmp/rotation-log.txt', LOG.join('\n') + '\nFATAL: ' + e.message + '\n' + (e.stack || ''));
});
