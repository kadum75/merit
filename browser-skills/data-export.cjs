const { chromium } = require('playwright');
const fs = require('fs');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const [url, tableSelector, outputFile, outputFormat = 'json'] = process.argv.slice(2);

if (!url || !tableSelector) {
  console.error('Usage: node browser-skills/data-export.cjs <url> <table-selector> [output-file] [json|csv]');
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
    const tables = await page.$$(tableSelector);
    const results = [];

    for (let i = 0; i < tables.length; i++) {
      const data = await tables[i].evaluate(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells.map(c => c.innerText.trim());
        });
      });
      results.push({ table: i, data });
    }

    if (outputFormat === 'csv') {
      const lines = results.flatMap(r =>
        r.data.map(row => row.map(c => `"${c.replace(/"/g, '""')}"`).join(','))
      );
      const csv = lines.join('\n');
      if (outputFile) {
        fs.writeFileSync(outputFile, csv, 'utf-8');
        console.log(`[OK] CSV saved to ${outputFile} (${lines.length} rows)`);
      } else {
        console.log(csv);
      }
    } else {
      const json = JSON.stringify(results, null, 2);
      if (outputFile) {
        fs.writeFileSync(outputFile, json, 'utf-8');
        console.log(`[OK] JSON saved to ${outputFile} (${results.length} tables)`);
      } else {
        console.log(json);
      }
    }
  } finally {
    await browser.close();
  }
})();
