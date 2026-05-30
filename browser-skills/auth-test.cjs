const { chromium } = require('playwright');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const [url, ...steps] = process.argv.slice(2);

if (!url || steps.length < 2) {
  console.error('Usage: node browser-skills/auth-test.cjs <login-url> <email-field> <password-field> <email-value> <password-value> <submit-selector> [success-selector]');
  console.error('Example: node browser-skills/auth-test.cjs https://example.com/login input#email input#pass user@test.com mypassword button[type=submit] .dashboard');
  process.exit(1);
}

const [emailField, passwordField, emailValue, passwordValue, submitSelector, successSelector] = steps;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`1. Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

    console.log(`2. Typing email...`);
    await page.waitForSelector(emailField, { timeout: 10000 });
    await page.fill(emailField, emailValue);

    console.log(`3. Typing password...`);
    await page.waitForSelector(passwordField, { timeout: 10000 });
    await page.fill(passwordField, passwordValue);

    console.log(`4. Submitting...`);
    await page.waitForSelector(submitSelector, { timeout: 10000 });
    await page.click(submitSelector);

    if (successSelector) {
      console.log(`5. Waiting for success indicator: ${successSelector}...`);
      await page.waitForSelector(successSelector, { timeout: 15000 });
      console.log(`✅ Login successful — dashboard loaded`);
    } else {
      await page.waitForTimeout(3000);
      console.log(`✅ Login attempted. Current URL: ${page.url()}`);
    }

    // Save auth state for reuse
    const storageState = await context.storageState();
    const fs = require('fs');
    const stateFile = 'auth-state.json';
    fs.writeFileSync(stateFile, JSON.stringify(storageState, null, 2));
    console.log(`   Auth state saved to ${stateFile}. Reuse with: --load-storage ${stateFile}`);

  } catch (err) {
    console.error(`❌ Auth test failed: ${err.message}`);
    try {
      const errText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      if (errText) console.error(`   Page text: ${errText}`);
    } catch {}
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
