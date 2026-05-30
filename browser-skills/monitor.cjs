const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const [url, intervalSec = '300', maxRuns = '10', outputDir = 'monitor-data'] = process.argv.slice(2);

if (!url) {
  console.error('Usage: node browser-skills/monitor.cjs <url> [interval-sec=300] [max-runs=10] [output-dir=monitor-data]');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
const baselineFile = `${outputDir}/baseline.txt`;
let run = 0;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  while (run < parseInt(maxRuns)) {
    run++;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      const content = await page.evaluate(() => document.body.innerText);
      const hash = crypto.createHash('md5').update(content).digest('hex');
      const timestamp = new Date().toISOString();

      if (!fs.existsSync(baselineFile)) {
        fs.writeFileSync(baselineFile, hash);
        fs.writeFileSync(`${outputDir}/snapshot-${run}.txt`, content, 'utf-8');
        console.log(`[${timestamp}] Run ${run}: Baseline established`);
      } else {
        const baseline = fs.readFileSync(baselineFile, 'utf-8').trim();
        if (hash !== baseline) {
          fs.writeFileSync(`${outputDir}/snapshot-${run}.txt`, content, 'utf-8');
          console.log(`[${timestamp}] Run ${run}: ⚠ CHANGE DETECTED — snapshot saved`);
        } else {
          console.log(`[${timestamp}] Run ${run}: No change`);
        }
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Run ${run}: Error — ${err.message}`);
    }

    if (run < parseInt(maxRuns)) {
      await new Promise(r => setTimeout(r, parseInt(intervalSec) * 1000));
    }
  }

  await browser.close();
  console.log(`\nMonitoring complete. ${run} runs. Data in ${outputDir}/`);
})();
