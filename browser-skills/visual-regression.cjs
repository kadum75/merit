const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const CHROME_PATH = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const [url, baselinePath, threshold = '0.05'] = process.argv.slice(2);

if (!url || !baselinePath) {
  console.error('Usage: node browser-skills/visual-regression.cjs <url> <baseline.png|baseline-dir/> [threshold=0.05]');
  console.error('  First run (no baseline): saves screenshot as baseline');
  console.error('  Subsequent runs: compare against baseline, save diff if mismatch');
  process.exit(1);
}

function pixelDiff(img1, img2) {
  if (img1.length !== img2.length) return 1;
  let diffPixels = 0;
  for (let i = 0; i < img1.length; i += 4) {
    const dr = Math.abs(img1[i] - img2[i]);
    const dg = Math.abs(img1[i+1] - img2[i+1]);
    const db = Math.abs(img1[i+2] - img2[i+2]);
    if (dr > 10 || dg > 10 || db > 10) diffPixels++;
  }
  return diffPixels / (img1.length / 4);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url, { waitUntil: 'networkidle' });

  const isDir = fs.existsSync(baselinePath) && fs.statSync(baselinePath).isDirectory();
  const screenshotDir = isDir ? baselinePath : path.dirname(baselinePath);
  const baselineFile = isDir ? path.join(baselinePath, `${new URL(url).hostname}.png`) : baselinePath;

  const screenshot = await page.screenshot({ fullPage: true });

  if (!fs.existsSync(baselineFile)) {
    fs.writeFileSync(baselineFile, screenshot);
    console.log(`[OK] Baseline saved: ${baselineFile}`);
  } else {
    const baseline = fs.readFileSync(baselineFile);
    const img1 = Buffer.from(baseline);
    const img2 = Buffer.from(screenshot);

    if (img1.length !== img2.length) {
      console.log(`[DIFF] Image sizes differ: baseline=${img1.length}, current=${img2.length}`);
    } else {
      const diff = pixelDiff(img1, img2);
      const maxDiff = parseFloat(threshold);
      if (diff > maxDiff) {
        const diffFile = baselineFile.replace('.png', '-diff.png');
        // Simple visual diff: overlay red for differing pixels
        const diffImg = Buffer.from(screenshot);
        for (let i = 0; i < diffImg.length; i += 4) {
          const dr = Math.abs(img1[i] - img2[i]);
          const dg = Math.abs(img1[i+1] - img2[i+1]);
          const db = Math.abs(img1[i+2] - img2[i+2]);
          if (dr > 10 || dg > 10 || db > 10) {
            diffImg[i] = 255;     // R
            diffImg[i+1] = 0;     // G
            diffImg[i+2] = 0;     // B
          }
        }
        fs.writeFileSync(diffFile, diffImg);
        console.log(`[FAIL] Visual diff ${(diff * 100).toFixed(2)}% exceeds threshold ${(maxDiff * 100).toFixed(2)}%. Diff saved: ${diffFile}`);
      } else {
        console.log(`[OK] Visual match (diff: ${(diff * 100).toFixed(2)}%)`);
      }
    }
  }

  await browser.close();
})();
