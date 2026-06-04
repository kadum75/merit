const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CDP_WS = 'ws://127.0.0.1:9224/devtools/browser/b4829ffd-7059-4bf1-9b42-8e4c31d42944';
const LOG = [];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  LOG.push(line);
  console.log(line);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteer.connect({
    browserWSEndpoint: CDP_WS,
    defaultViewport: { width: 1280, height: 900 }
  });
  log('Connected to Brave');

  // ===== STRIPE =====
  log('\n=== STRIPE KEY ROTATION ===');
  const stripePage = await browser.newPage();

  try {
    await stripePage.goto('https://dashboard.stripe.com/apikeys', { 
      waitUntil: 'domcontentloaded', 
      timeout: 20000 
    });
  } catch(e) {
    log(`Navigation (may be OK): ${e.message}`);
  }

  await sleep(8000);
  const stripeUrl = stripePage.url();
  const stripeTitle = await stripePage.title();
  const stripeBody = await stripePage.evaluate(() => document.body?.innerText?.substring(0, 1000) || '');
  log(`Stripe URL: ${stripeUrl}`);
  log(`Stripe title: ${stripeTitle}`);

  // Check login status
  if (stripeBody.includes('Sign in') || stripeBody.includes('Sign In') || stripeUrl.includes('login')) {
    log('NOT LOGGED IN to Stripe');
  } else {
    log('LOGGED IN to Stripe! Checking page...');
  }

  await stripePage.screenshot({ path: '/tmp/stripe-check.png' });
  log('Screenshot: /tmp/stripe-check.png');

  // Check all visible links and if we can find API keys section
  const pageText = await stripePage.evaluate(() => document.body?.innerText || '');
  log(`Page text (first 500): ${pageText.substring(0, 500)}`);

  // Try to find key-related elements
  const keyElements = await stripePage.evaluate(() => {
    const els = [];
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.includes('sk_live') || text.includes('rk_live') || text.includes('whsec_')) {
        els.push({ tag: el.tagName, text: text.substring(0, 80), class: el.className?.substring(0, 40) });
      }
    });
    return els;
  });
  log(`Key elements: ${keyElements.length}`);

  await stripePage.close();

  // ===== SUPABASE =====
  log('\n=== SUPABASE KEY ROTATION ===');
  const supaPage = await browser.newPage();

  try {
    await supaPage.goto('https://supabase.com/dashboard/projects', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
  } catch(e) {
    log(`Navigation: ${e.message}`);
  }

  await sleep(8000);
  const supaUrl = supaPage.url();
  const supaBody = await supaPage.evaluate(() => document.body?.innerText?.substring(0, 1000) || '');
  log(`Supabase URL: ${supaUrl}`);

  if (supaBody.includes('Sign in') || supaUrl.includes('sign-in')) {
    log('NOT LOGGED IN to Supabase');
  } else {
    log('LOGGED IN to Supabase!');
  }

  await supaPage.screenshot({ path: '/tmp/supabase-check.png' });
  log('Screenshot: /tmp/supabase-check.png');
  log(`Page text (first 500): ${supaBody.substring(0, 500)}`);

  await supaPage.close();
  await browser.disconnect();

  fs.writeFileSync('/tmp/rotation-log.txt', LOG.join('\n'));
  log('\nDone.');
}

run().catch(e => {
  console.error('FATAL:', e.message, e.stack?.substring(0, 500));
  fs.writeFileSync('/tmp/rotation-log.txt', LOG.join('\n') + '\nERROR: ' + e.message);
  process.exit(1);
});
