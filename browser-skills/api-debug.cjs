const { chromium } = require('playwright');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const [url, ...filters] = process.argv.slice(2);

if (!url) {
  console.error('Usage: node browser-skills/api-debug.cjs <url> [filter-method=GET] [filter-url-contains]');
  console.error('Captures all network requests during page load and logs them as a HAR-like report.');
  process.exit(1);
}

const filterMethod = (filters[0] || 'ALL').toUpperCase();
const filterUrl = filters[1] || '';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const requests = [];

  page.on('request', req => {
    requests.push({
      id: req.url(),
      method: req.method(),
      url: req.url(),
      type: req.resourceType(),
      headers: req.headers(),
      startTime: Date.now(),
    });
  });

  page.on('response', res => {
    const entry = requests.find(r => r.id === res.url());
    if (entry) {
      entry.status = res.status();
      entry.statusText = res.statusText();
      entry.duration = Date.now() - entry.startTime;
      entry.responseHeaders = res.headers();
    }
  });

  page.on('requestfailed', req => {
    const entry = requests.find(r => r.id === req.url());
    if (entry) {
      entry.failed = true;
      entry.errorText = req.failure()?.errorText;
    }
  });

  console.log(`Loading ${url} and capturing network requests...\n`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const filtered = requests.filter(r => {
    if (filterMethod !== 'ALL' && r.method !== filterMethod) return false;
    if (filterUrl && !r.url.includes(filterUrl)) return false;
    return true;
  });

  console.log(`Total requests: ${requests.length}`);
  console.log(`Filtered: ${filtered.length}\n`);

  // Group by type
  const byType = {};
  for (const r of filtered) {
    (byType[r.type] = byType[r.type] || []).push(r);
  }

  for (const [type, list] of Object.entries(byType)) {
    console.log(`── ${type.toUpperCase()} (${list.length}) ──`);
    for (const r of list) {
      const status = r.failed ? 'FAIL' : (r.status || 'PENDING');
      const dur = r.duration ? `${r.duration}ms` : '';
      console.log(`  ${r.method} ${status} ${dur} ${r.url.substring(0, 120)}`);
    }
    console.log();
  }

  // Summary
  const totalSize = requests.reduce((sum, r) => sum + (parseInt(r.responseHeaders?.['content-length']) || 0), 0);
  const errors = requests.filter(r => r.failed || (r.status && r.status >= 400));
  console.log(`Summary: ${filtered.length} requests, ${errors.length} errors, ${(totalSize / 1024).toFixed(0)} KB`);

  await browser.close();
})();
