const puppeteer = require('puppeteer-core');
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

  console.log('=== STRIPE GOOGLE OAUTH ===');

  await page.goto('https://dashboard.stripe.com/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);

  // Click Google OAuth
  console.log('Clicking Google...');
  await page.evaluate(() => document.querySelector('#continue_with_google').click());
  await sleep(8000);

  let url = page.url();
  console.log('URL:', url.substring(0, 120));

  if (!url.includes('google.com')) {
    console.log('No Google redirect');
    await browser.disconnect();
    return;
  }

  console.log('On Google!');
  await sleep(3000);

  let text = await page.evaluate(() => document.body?.innerText || '');
  console.log('Google page:', text.substring(0, 500));

  // Handle "Choose an account" - click the matching account
  const accountBtns = await page.$$('[data-identifier]');
  for (const btn of accountBtns) {
    const id = await page.evaluate(el => el.getAttribute('data-identifier'), btn);
    if (id === EMAIL) {
      console.log('Selecting account:', id);
      await btn.click();
      await sleep(5000);
      break;
    }
  }

  // Try to enter email
  let emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    console.log('Entering email...');
    const box = await emailInput.boundingBox();
    console.log('Email field box:', box);
    await emailInput.click();
    await emailInput.type(EMAIL, { delay: 5 });
    await sleep(500);
    await page.keyboard.press('Enter');
    console.log('Submitted email, waiting...');
    await sleep(5000);
  }

  // Check what's on the page now
  text = await page.evaluate(() => document.body?.innerText || '');
  console.log('After email:', text.substring(0, 400));

  // Try to enter password
  let pwInput = await page.$('input[type="password"]');
  if (pwInput) {
    console.log('Entering password...');
    const box = await pwInput.boundingBox();
    console.log('Password field box:', box);
    await pwInput.click();
    await pwInput.type(PASSWORD, { delay: 5 });
    await sleep(500);
    await page.keyboard.press('Enter');
    console.log('Submitted password');
    await sleep(15000);
  } else {
    console.log('No password input found');
    // Maybe there's another step - check for any input
    const allInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, type: i.type, name: i.name, placeholder: i.placeholder }));
    });
    console.log('All inputs:', JSON.stringify(allInputs));
  }

  url = page.url();
  console.log('After Google login URL:', url.substring(0, 150));
  console.log('Full URL:', url);

  // Handle redirect back to Stripe
  await sleep(8000);
  url = page.url();
  console.log('Final URL:', url.substring(0, 150));

  if (url.includes('stripe.com') && !url.includes('login')) {
    console.log('\nLOGGED IN!');
    await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(5000);
    const body = await page.evaluate(() => document.body?.innerText || '');
    console.log('API Keys:', body.substring(0, 500));
  } else if (url.includes('stripe.com')) {
    console.log('Back on Stripe, checking if logged in...');
    const body = await page.evaluate(() => document.body?.innerText || '');
    console.log('Stripe page:', body.substring(0, 300));
  } else {
    console.log('Not on Stripe:', url);
    await page.screenshot({ path: '/tmp/sg-unexpected.png' });
  }

  await browser.disconnect();
}

main().catch(e => {
  console.error('FATAL:', e.message, e.stack?.substring(0, 300));
  process.exit(1);
});
