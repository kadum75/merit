const { chromium } = require('playwright');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const [url, selector, format = 'text'] = process.argv.slice(2);

if (!url) {
  console.error('Usage: node browser-skills/scrape.cjs <url> [selector] [text|json|csv]');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  try {
    let data;
    if (selector) {
      const elements = await page.$$(selector);
      if (format === 'json') {
        data = await Promise.all(elements.map(async el => ({
          text: await el.textContent(),
          html: await el.innerHTML(),
          attrs: await el.evaluate(el => {
            const attrs = {};
            for (const a of el.attributes) attrs[a.name] = a.value;
            return attrs;
          })
        })));
        console.log(JSON.stringify(data, null, 2));
      } else if (format === 'csv') {
        const rows = await Promise.all(elements.map(el => el.textContent()));
        console.log('text');
        rows.forEach(r => console.log(`"${(r || '').trim().replace(/"/g, '""')}"`));
      } else {
        const texts = await Promise.all(elements.map(el => el.textContent()));
        console.log(texts.map(t => t.trim()).filter(Boolean).join('\n---\n'));
      }
    } else {
      data = await page.evaluate(() => document.body.innerText);
      console.log(data.trim());
    }
  } finally {
    await browser.close();
  }
})();
