import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

async function main() {
  console.log('\n=== PrimeCV Setup ===\n');

  const cdpEndpoint = process.env.CDP_ENDPOINT || 'http://localhost:9222';

  // Connect to running Brave
  console.log(`Connecting to Brave at ${cdpEndpoint}...`);
  const browser = await chromium.connectOverCDP(cdpEndpoint);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  console.log('✓ Connected to Brave\n');

  // ── 1. STRIPE ──
  console.log('=== STRIPE ===');
  console.log('Log into Stripe dashboard (Google login), then press Enter...');
  await page.goto('https://dashboard.stripe.com', { waitUntil: 'networkidle' });
  await ask('Press Enter after logging into Stripe: ');

  // Get secret key
  await page.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  let stripeSecretKey = await page.evaluate(() => {
    const inp = document.querySelector('input[value*="sk_test_"], input[value*="sk_live_"]');
    return inp ? inp.value : '';
  });
  if (!stripeSecretKey) {
    console.log('Could not auto-extract. Navigate to reveal the key and press Enter...');
    await ask('');
    stripeSecretKey = await page.evaluate(() => {
      const inp = document.querySelector('input[type="text"][value*="sk_"], input:not([type="password"])[value*="sk_"]');
      return inp ? inp.value : '';
    });
    if (!stripeSecretKey) stripeSecretKey = await ask('Paste Stripe Secret Key (sk_...): ');
  }
  console.log(`Secret Key: ${stripeSecretKey.substring(0, 12)}...`);

  // Create webhook
  console.log('\nCreating Stripe webhook endpoint...');
  const appUrl = await ask('App URL (default: http://localhost:3000): ') || 'http://localhost:3000';
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
      console.log(`✓ Webhook created`);
      var stripeWebhookSecret = whData.secret;
      console.log(`✓ Webhook secret: ${whData.secret}`);
    } else {
      console.log(`⚠ ${whData.error?.message}`);
      stripeWebhookSecret = await ask('Paste Webhook Signing Secret: ');
    }
  } catch (e) {
    console.log(`⚠ Error: ${e.message}`);
    stripeWebhookSecret = await ask('Paste Webhook Signing Secret: ');
  }

  const monthlyPriceId = await ask('Paste Monthly Price ID (price_...): ');
  const annualPriceId = await ask('Paste Annual Price ID (price_...): ');

  // ── 2. SUPABASE ──
  console.log('\n=== SUPABASE ===');
  await page.goto('https://supabase.com/dashboard', { waitUntil: 'networkidle' });
  console.log('Log into Supabase dashboard, then press Enter...');
  await ask('Press Enter after logging into Supabase: ');

  // Get project ref from URL
  let sbUrl = page.url();
  let projectRef = sbUrl.match(/\/project\/([^/]+)/)?.[1];
  if (!projectRef) {
    console.log('Navigate to your project and press Enter...');
    await ask('');
    sbUrl = page.url();
    projectRef = sbUrl.match(/\/project\/([^/]+)/)?.[1];
  }

  // Go to API settings
  await page.goto(`https://supabase.com/dashboard/project/${projectRef}/settings/api`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const supabaseUrl = await page.evaluate(() => {
    const inp = document.querySelector('input[value*="supabase.co"]');
    return inp ? inp.value : '';
  }) || await ask('Paste Supabase Project URL: ');

  const supabaseAnonKey = await page.evaluate(() => {
    const ta = document.querySelector('textarea[id="anon-key"], textarea[readonly]');
    return ta ? ta.value : '';
  }) || await ask('Paste Supabase Anon Key: ');

  const supabaseServiceKey = await page.evaluate(() => {
    const ta = document.querySelector('textarea[id="service-key"], textarea[readonly]');
    return ta ? ta.value : '';
  }) || await ask('Paste Supabase Service Role Key: ');

  console.log(`\nProject URL: ${supabaseUrl}`);
  console.log(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log(`Service Key: ${supabaseServiceKey.substring(0, 20)}...`);

  // Get PAT for migration
  await page.goto('https://supabase.com/dashboard/account/tokens', { waitUntil: 'networkidle' });
  console.log('\nGenerate a PAT at: https://supabase.com/dashboard/account/tokens');
  const supabasePat = await ask('Paste Supabase PAT (or Enter to skip migration): ');

  // ── 3. RUN SQL MIGRATION ──
  if (supabasePat && projectRef) {
    console.log('\nRunning SQL migration...');
    const sql = readFileSync('supabase-migration.sql', 'utf-8');
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${supabasePat}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) console.log('✓ Migration applied');
    else console.log('⚠ Migration failed — run manually in Supabase SQL Editor');
  } else {
    console.log('\n⚠ Run supabase-migration.sql manually in Supabase SQL Editor');
  }

  // ── 4. WRITE .env ──
  const env = `# Supabase
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
  writeFileSync('.env', env);
  console.log('\n✓ .env written');

  await browser.close();
  rl.close();
  console.log('✓ Setup complete. Run: npm run dev\n');
}

main().catch(err => { console.error('\nError:', err); rl.close(); process.exit(1); });
