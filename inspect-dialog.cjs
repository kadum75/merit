const puppeteer = require('puppeteer-core');
const http = require('http');
const CDP_PORT = 9225;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}${path}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const info = await httpGet('/json/version');
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('dashboard.stripe.com'));
  if (!page) page = pages[0];
  console.log('URL:', page.url().substring(0, 100));
  await page.bringToFront();

  // Step 1: Click More options for PrimeCV (last one)
  const moreBtns = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const more = allBtns.filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    const last = more[more.length - 1];
    const rect = last.getBoundingClientRect();
    return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
  });
  await page.mouse.click(moreBtns.x, moreBtns.y);
  await sleep(2000);

  // Step 2: Click Rotate key
  const rotateOpt = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="menuitem"], a'));
    for (const btn of btns) {
      if (btn.textContent?.trim().toLowerCase().includes('rotate') && btn.offsetParent !== null) {
        const rect = btn.getBoundingClientRect();
        return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
      }
    }
    return null;
  });
  if (!rotateOpt) {
    console.log('No rotate option found');
    await browser.disconnect();
    return;
  }
  await page.mouse.click(rotateOpt.x, rotateOpt.y);
  await sleep(3000);

  // Step 3: Dump the dialog structure
  const dialogInfo = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (!dialog) return 'No dialog found';

    const info = {
      tag: dialog.tagName,
      class: dialog.className?.substring(0, 100),
      html: dialog.innerHTML?.substring(0, 8000),
      allText: dialog.innerText?.substring(0, 2000)
    };
    return info;
  });
  console.log('Dialog HTML:', dialogInfo?.html);
  console.log('Dialog text:', dialogInfo?.allText);
  console.log('Dialog class:', dialogInfo?.class);

  // Step 4: Find all clickable elements in the dialog
  const clickable = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (!dialog) return null;

    const items = [];
    const all = dialog.querySelectorAll('button, a, [role="option"], [role="combobox"], [role="listbox"], [role="radio"], [tabindex]:not([tabindex="-1"]), input, label, div[onclick]');
    all.forEach(el => {
      if (el.offsetParent !== null) {
        const rect = el.getBoundingClientRect();
        items.push({
          tag: el.tagName,
          type: el.type || '',
          text: el.textContent?.trim()?.substring(0, 80),
          role: el.getAttribute('role') || '',
          disabled: el.disabled,
          x: Math.round(rect.x + rect.width/2),
          y: Math.round(rect.y + rect.height/2),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        });
      }
    });
    return items;
  });
  console.log('\nClickable items in dialog:');
  clickable?.forEach((c, i) => console.log(`  ${i}: ${c.tag} ${c.type} "${c.text}" role=${c.role} disabled=${c.disabled} at (${c.x},${c.y}) ${c.w}x${c.h}`));

  await page.screenshot({ path: '/tmp/stripe-inspect.png' });
  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
