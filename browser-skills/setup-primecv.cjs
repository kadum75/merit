/**
 * PrimeCV Auto-Setup Skill
 *
 * Opens Supabase and Stripe dashboards so you can Google-login manually,
 * then auto-extracts API keys, creates Stripe webhooks, runs SQL migration,
 * and writes .env.
 *
 * Usage: node browser-skills/setup-primecv.cjs
 */
const { chromium } = require('playwright');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

async function waitForLogin(page, name, targetUrl) {
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  Log into ${name}`);
  console.log(`  Browser is OPEN — complete the Google login`);
  console.log(`  Target: ${targetUrl}`);
  console.log(`═══════════════════════════════════════════\n`);

  // Wait for navigation away from login page
  let currentUrl = page.url();
  while (currentUrl.includes('auth') || currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('accounts.google.com')) {
    await page.waitForTimeout(1000);
    currentUrl = page.url();
  }
  console.log(`[OK] Logged into ${name}: ${currentUrl}`);
}

async function main() {
  console.log('\n=== PrimeCV Setup — Browser Assistant ===\n');

  const appUrl = await ask('App URL (default: http://localhost:3000): ') || 'http://localhost:3000';

  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });

  const context = await browser.newContext({ viewport: null });

  // ────────────────────────────────────────────
  //  1. SUPABASE — get API keys
  // ────────────────────────────────────────────
  console.log('\n--- Step 1: Supabase API Keys ---\n');

  let supabaseUrl = '';
  let supabaseAnonKey = '';
  let supabaseServiceKey = '';
  let supabaseProjectRef = '';
  let supabasePat = '';

  const sbPage = await context.newPage();
  await sbPage.goto('https://supabase.com/dashboard', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('[INFO] Sign in to Supabase in the browser window...');
  await waitForLogin(sbPage, 'Supabase', 'https://supabase.com/dashboard');

  // Navigate to first project's API settings
  await sbPage.waitForTimeout(2000);
  const currentUrl = sbPage.url();

  if (currentUrl.includes('/project/')) {
    supabaseProjectRef = currentUrl.match(/\/project\/([^\/]+)/)?.[1] || '';
  } else {
    // Click the first project card
    try {
      const projectLink = await sbPage.$('a[href*="/project/"]');
      if (projectLink) {
        await projectLink.click();
        await sbPage.waitForTimeout(3000);
        supabaseProjectRef = sbPage.url().match(/\/project\/([^\/]+)/)?.[1] || '';
      }
    } catch (e) {
      console.log('[INFO] Please navigate to your Supabase project and press Enter...');
      await ask('');
      supabaseProjectRef = sbPage.url().match(/\/project\/([^\/]+)/)?.[1] || '';
    }
  }

  // Go to project API settings
  await sbPage.goto(`https://supabase.com/dashboard/project/${supabaseProjectRef}/settings/api`, { waitUntil: 'networkidle', timeout: 30000 });
  await sbPage.waitForTimeout(2000);

  // Extract keys from the page
  supabaseUrl = await sbPage.evaluate(() => {
    const el = document.querySelector('[data-testid="project-url"] input, input[value*="supabase.co"]');
    return el ? el.value : '';
  });

  // Fallback: try to find from the page text
  if (!supabaseUrl) {
    supabaseUrl = await sbPage.evaluate(() => {
      const body = document.body.innerText;
      const match = body.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
      return match ? match[0] : '';
    });
  }

  supabaseAnonKey = await sbPage.evaluate(() => {
    const el = document.querySelector('[data-testid="anon-key"] input, [data-testid="anon-key"] textarea');
    return el ? el.value : '';
  });

  supabaseServiceKey = await sbPage.evaluate(() => {
    const el = document.querySelector('[data-testid="service-key"] input, [data-testid="service-key"] textarea');
    return el ? el.value : '';
  });

  console.log(`\n  Project URL: ${supabaseUrl || '⚠ not found'}`);
  console.log(`  Anon Key: ${supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : '⚠ not found'}`);
  console.log(`  Service Key: ${supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : '⚠ not found'}`);

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.log('\n[!] Could not auto-extract all Supabase keys.');
    console.log('  Open: https://supabase.com/dashboard/project/_/settings/api');
    supabaseUrl = await ask('  Paste Project URL: ');
    supabaseAnonKey = await ask('  Paste Anon Key: ');
    supabaseServiceKey = await ask('  Paste Service Role Key: ');
  }

  // Get Supabase PAT
  console.log('\n  Now get a Personal Access Token...');
  await sbPage.goto('https://supabase.com/dashboard/account/tokens', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('  Generate a new token at: https://supabase.com/dashboard/account/tokens');
  console.log('  (Click "New Token", name it "primecv-setup", copy the token)');
  supabasePat = await ask('  Paste Supabase PAT (press Enter to skip): ');

  // ────────────────────────────────────────────
  //  2. STRIPE — get API keys + create webhook
  // ────────────────────────────────────────────
  console.log('\n--- Step 2: Stripe Setup ---\n');

  let stripeSecretKey = '';
  let stripeWebhookSecret = '';
  let monthlyPriceId = '';
  let annualPriceId = '';

  const stPage = await context.newPage();
  await stPage.goto('https://dashboard.stripe.com', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('[INFO] Sign in to Stripe in the browser window...');
  await waitForLogin(stPage, 'Stripe', 'https://dashboard.stripe.com');

  // Go to API keys
  await stPage.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle', timeout: 30000 });
  await stPage.waitForTimeout(2000);

  stripeSecretKey = await stPage.evaluate(() => {
    const el = document.querySelector('input[value*="sk_test_"], input[value*="sk_live_"]');
    return el ? el.value : '';
  });

  if (!stripeSecretKey) {
    console.log('\n[!] Could not auto-extract Stripe secret key.');
    console.log('  Open: https://dashboard.stripe.com/apikeys');
    stripeSecretKey = await ask('  Reveal and paste your Secret Key (sk_test_...): ');
  } else {
    console.log(`  Secret Key: ${stripeSecretKey.substring(0, 12)}...`);
  }

  // Create the webhook endpoint
  console.log('\n  Creating Stripe webhook endpoint...');
  try {
    const whRes = await fetch('https://api.stripe.com/v1/webhook_endpoints', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        url: `${appUrl}/api/webhook`,
        'enabled_events[]': ['checkout.session.completed', 'customer.subscription.deleted', 'invoice.payment_failed'],
      }),
    });
    const whData = await whRes.json();
    if (whRes.ok) {
      console.log(`  ✓ Webhook created: ${whData.id}`);
      stripeWebhookSecret = whData.secret;
      console.log(`  ✓ Webhook signing secret: ${whData.secret}`);
    } else {
      console.log(`  ⚠ ${whData.error?.message || 'Failed'}`);
      console.log('  Create manually: https://dashboard.stripe.com/webhooks');
      stripeWebhookSecret = await ask('  Paste Webhook Signing Secret: ');
    }
  } catch (e) {
    console.log(`  ⚠ Error: ${e.message}`);
    stripeWebhookSecret = await ask('  Paste Webhook Signing Secret: ');
  }

  // Get price IDs
  console.log('\n  Now get your Stripe Price IDs...');
  await stPage.goto('https://dashboard.stripe.com/products', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('  Open: https://dashboard.stripe.com/products');
  console.log('  Create products named "PrimeCV Monthly" and "PrimeCV Annual" if not yet created.');
  monthlyPriceId = await ask('  Paste Monthly Price ID (price_...): ');
  annualPriceId = await ask('  Paste Annual Price ID (price_...): ');

  // ────────────────────────────────────────────
  //  3. RUN SQL MIGRATION
  // ────────────────────────────────────────────
  console.log('\n--- Step 3: Supabase SQL Migration ---\n');

  if (supabasePat && supabaseProjectRef) {
    console.log('  Running migration via Supabase Management API...');
    const sql = readFileSync('supabase-migration.sql', 'utf-8');
    const res = await fetch(`https://api.supabase.com/v1/projects/${supabaseProjectRef}/sql`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${supabasePat}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      console.log('  ✓ Migration applied successfully');
    } else {
      const err = await res.text();
      console.log(`  ⚠ Migration failed: ${err}`);
      console.log('  Run the SQL manually at: https://supabase.com/dashboard/project/_/sql/new');
    }
  } else {
    console.log('  ⚠ No PAT or project ref — run supabase-migration.sql manually');
    console.log('  Open: https://supabase.com/dashboard/project/_/sql/new');
    console.log('  Paste and run the contents of supabase-migration.sql');
  }

  // ────────────────────────────────────────────
  //  4. WRITE .env
  // ────────────────────────────────────────────
  console.log('\n--- Step 4: Write .env ---\n');

  const envContent = `# Supabase
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# Stripe
STRIPE_SECRET_KEY=${stripeSecretKey}
STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret}
VITE_STRIPE_MONTHLY_PRICE_ID=${monthlyPriceId}
VITE_STRIPE_ANNUAL_PRICE_ID=${annualPriceId}

# App
VITE_APP_URL=${appUrl}
`;

  writeFileSync('.env', envContent);
  console.log('  ✓ .env file written');

  // ────────────────────────────────────────────
  //  5. SAVE AS SKILL
  // ────────────────────────────────────────────
  const skillContent = `# PrimeCV Setup Skill
# Generated by browser-skills/setup-primecv.cjs
# Date: ${new Date().toISOString()}

## Credentials
- Supabase Project: ${supabaseProjectRef || 'manual'}
- Stripe Account: ${stripeSecretKey ? 'configured' : 'manual'}

## API Keys
Supabase:
  URL: ${supabaseUrl}
  Anon Key: ${supabaseAnonKey ? '✓ set' : '✗ missing'}
  Service Key: ${supabaseServiceKey ? '✓ set' : '✗ missing'}

Stripe:
  Secret Key: ${stripeSecretKey ? '✓ set' : '✗ missing'}
  Webhook Secret: ${stripeWebhookSecret ? '✓ set' : '✗ missing'}
  Monthly Price: ${monthlyPriceId}
  Annual Price: ${annualPriceId}

## Migration
- supabase-migration.sql: ${supabasePat ? 'auto-applied' : 'run manually'}

## How to re-run
  node browser-skills/setup-primecv.cjs

## Manual URLs
- Supabase API settings: https://supabase.com/dashboard/project/${supabaseProjectRef || '_'}/settings/api
- Supabase SQL: https://supabase.com/dashboard/project/${supabaseProjectRef || '_'}/sql/new
- Stripe API keys: https://dashboard.stripe.com/apikeys
- Stripe webhooks: https://dashboard.stripe.com/webhooks
- Stripe products: https://dashboard.stripe.com/products
`;

  writeFileSync('.opencode/PRIMECV_SETUP.md', skillContent);
  writeFileSync('.opencode/SETUP_STATE.md', skillContent);
  console.log('  ✓ Setup state saved to .opencode/');

  // ────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  ✓ PrimeCV setup complete!');
  console.log('  Run: npm run dev');
  console.log('═══════════════════════════════════════════\n');

  await browser.close();
  rl.close();
}

main().catch(err => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
