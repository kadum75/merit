const { chromium } = require('playwright');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const [startUrl, maxPages = '10', sameDomain = 'true', outputFile] = process.argv.slice(2);

if (!startUrl) {
  console.error('Usage: node browser-skills/crawl.cjs <start-url> [max-pages=10] [same-domain=true] [output-file]');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const visited = new Set();
  const queue = [startUrl];
  const baseDomain = new URL(startUrl).hostname;
  const results = [];

  while (queue.length > 0 && visited.size < parseInt(maxPages)) {
    const currentUrl = queue.shift();
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    try {
      await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 15000 });
      const title = await page.title();
      const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
      results.push({ url: currentUrl, title, snippet: text.substring(0, 200) });
      console.log(`[${visited.size}/${maxPages}] ${title} — ${currentUrl}`);

      if (visited.size < parseInt(maxPages)) {
        const links = await page.evaluate((opts) => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(href => {
              try {
                const u = new URL(href);
                return u.protocol.startsWith('http') && (!opts.sameDomain || u.hostname === opts.baseDomain);
              } catch { return false; }
            });
        }, { sameDomain: sameDomain === 'true', baseDomain });

        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      }
    } catch (err) {
      console.error(`[SKIP] ${currentUrl} — ${err.message}`);
    }
  }

  if (outputFile) {
    const fs = require('fs');
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`[OK] Results saved to ${outputFile}`);
  }

  await browser.close();
  console.log(`\nDone. Crawled ${visited.size} pages.`);
})();
