import puppeteer from 'puppeteer-core';

const BRAVE_PATH = '/snap/brave/current/opt/brave.com/brave/brave';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });

  const page = await browser.newPage();

  // Open Supabase
  console.log('\n=== SUPABASE ===');
  console.log('Browser open. Please:');
  console.log('1. Log into https://supabase.com/dashboard');
  console.log('2. Click your project');
  console.log('3. Go to Settings → API');
  console.log('4. Press Enter here when done\n');
  await page.goto('https://supabase.com/dashboard', { waitUntil: 'networkidle' });
  await waitForEnter();

  // Get current URL for project ref
  const sbUrl = page.url();
  console.log('Current URL:', sbUrl);

  // Navigate to API settings
  const projectRef = sbUrl.match(/\/project\/([^/]+)/)?.[1];
  if (projectRef) {
    await page.goto(`https://supabase.com/dashboard/project/${projectRef}/settings/api`, { waitUntil: 'networkidle' });
    console.log('Navigate to API settings page, then press Enter to extract keys...');
    await waitForEnter();

    const keys = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
      const result = {};
      inputs.forEach(inp => {
        const label = inp.closest('div')?.previousElementSibling?.textContent || '';
        const value = inp.value;
        if (value && value.length > 10) result[label] = value;
      });
      // Also try textareas
      document.querySelectorAll('textarea').forEach(ta => {
        const label = ta.closest('div')?.previousElementSibling?.textContent || '';
        if (ta.value && ta.value.length > 10) result[label] = ta.value;
      });
      return result;
    });
    console.log('Extracted keys:', JSON.stringify(keys, null, 2));
  }

  // Open Stripe
  console.log('\n=== STRIPE ===');
  console.log('1. Log into https://dashboard.stripe.com');
  console.log('2. Go to Developers → API Keys');
  console.log('3. Press Enter here when done\n');
  await page.goto('https://dashboard.stripe.com', { waitUntil: 'networkidle' });
  await waitForEnter();

  const stUrl = page.url();
  console.log('Current URL:', stUrl);

  await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle' });
  console.log('On API keys page. Press Enter to extract...');
  await waitForEnter();

  console.log('\nDone. Press Enter to close browser.');
  await waitForEnter();
  await browser.close();
}

function waitForEnter() {
  return new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
}

main().catch(err => { console.error(err); process.exit(1); });
