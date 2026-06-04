const puppeteer = require('puppeteer-core');
const fs = require('fs');
const http = require('http');

const CDP_PORT = 9225;
const EMAIL = 'rjcosta@gmail.com';
const PASSWORD = '@Blasted23';

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
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('=== STRIPE LOGIN ===');
  await page.goto('https://dashboard.stripe.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  console.log('Login URL:', page.url().substring(0, 80));

  // Try email/password first with direct API call
  console.log('\nTrying email/password...');
  await page.evaluate((e, p) => {
    document.querySelector('#email').value = e;
    document.querySelector('#email').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#old-password').value = p;
    document.querySelector('#old-password').dispatchEvent(new Event('input', { bubbles: true }));
  }, EMAIL, PASSWORD);
  await sleep(2000);

  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = false; btn.click(); }
  });
  await sleep(10000);

  let url = page.url();
  console.log('After email/pw:', url.substring(0, 100));

  if (url.includes('stripe.com') && !url.includes('login')) {
    console.log('EMAIL/PW LOGIN SUCCESS!');
  } else if (url.includes('stripe.com/login')) {
    console.log('Email/pw failed, trying Google OAuth...');

    // Click Google sign-in using the specific ID
    await page.evaluate(() => {
      const el = document.querySelector('#continue_with_google');
      if (el) { el.click(); return true; }
      return false;
    });
    console.log('Clicked #continue_with_google');
    await sleep(5000);

    url = page.url();
    console.log('After Google click:', url.substring(0, 100));

    // Handle Google login on same tab
    if (url.includes('accounts.google.com') || url.includes('google.com/o/oauth')) {
      console.log('On Google login page');

      // Wait for page to fully load
      await page.waitForSelector('input[type="email"], input[type="password"], [data-identifier]', { timeout: 15000 }).catch(() => {});
      await sleep(2000);
      await page.screenshot({ path: '/tmp/google-1.png' });

      const googleText = await page.evaluate(() => document.body?.innerText || '');
      console.log('Google page:', googleText.substring(0, 400));

      // Check if we need to pick an account
      const accountLinks = await page.$$('[data-identifier]');
      for (const link of accountLinks) {
        const id = await page.evaluate(el => el.getAttribute('data-identifier'), link);
        if (id === EMAIL) {
          console.log('Selecting existing account:', id);
          await link.click();
          await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
          await sleep(5000);
          break;
        }
      }

      // Enter email
      let emailInput = await page.$('input[type="email"]');
      if (emailInput) {
        console.log('Entering Google email...');
        await emailInput.click();
        await emailInput.type(EMAIL, { delay: 8 });
        await sleep(1000);
        // Click Next
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        await sleep(4000);
      }

      // Enter password
      let pwInput = await page.$('input[type="password"]');
      if (pwInput) {
        console.log('Entering Google password...');
        await pwInput.click();
        await pwInput.type(PASSWORD, { delay: 6 });
        await sleep(1000);
        await page.keyboard.press('Enter');
        console.log('Submitted Google credentials');
        await sleep(15000);
      }

      await page.screenshot({ path: '/tmp/google-2.png' });
      url = page.url();
      console.log('After Google login:', url.substring(0, 120));
    }
  }

  // Check if we're back on Stripe
  if (url.includes('stripe.com') && !url.includes('login')) {
    console.log('\nSUCCESS - Logged into Stripe!');
    await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(5000);
    const body = await page.evaluate(() => document.body?.innerText || '');
    console.log('API keys:', body.substring(0, 500));
    await page.screenshot({ path: '/tmp/stripe-final.png' });
    fs.writeFileSync('/tmp/stripe-body.txt', body);
  } else {
    console.log('\nStill not logged into Stripe');
  }

  await browser.disconnect();
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
