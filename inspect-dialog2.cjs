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
  console.log('1. URL:', page.url().substring(0, 100));
  await page.bringToFront();

  // Step 1: Click More options for PrimeCV (last one)
  const moreInfo = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const more = allBtns.filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    console.log('More buttons count:', more.length);
    if (more.length === 0) return 'no more btns';
    const last = more[more.length - 1];
    const rect = last.getBoundingClientRect();
    return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, idx: more.length - 1 };
  });
  console.log('2. More options info:', JSON.stringify(moreInfo));
  if (typeof moreInfo === 'string') { console.log('FAIL:', moreInfo); await browser.disconnect(); return; }

  await page.mouse.click(moreInfo.x, moreInfo.y);
  console.log('3. Clicked More options');
  await sleep(2000);

  // Step 2: Click Rotate key
  const rotateInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="menuitem"], a'));
    for (const btn of btns) {
      if (btn.textContent?.trim().toLowerCase().includes('rotate') && btn.offsetParent !== null) {
        const rect = btn.getBoundingClientRect();
        return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: btn.textContent?.trim() };
      }
    }
    return 'no rotate btn';
  });
  console.log('4. Rotate info:', JSON.stringify(rotateInfo));
  if (typeof rotateInfo === 'string') { console.log('FAIL:', rotateInfo); await browser.disconnect(); return; }

  await page.mouse.click(rotateInfo.x, rotateInfo.y);
  console.log('5. Clicked Rotate');
  await sleep(3000);

  // Step 3: Check for dialog
  const hasDialog = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
    return d ? 'yes' : 'no dialog found';
  });
  console.log('6. Has dialog:', hasDialog);

  if (hasDialog !== 'yes') {
    // Try finding the dialog content differently
    const allDialogs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).filter(el => {
        return el.offsetParent !== null && el.textContent?.includes('Rotate API key') && el.textContent?.includes('Cancel');
      }).length;
    });
    console.log('7. Elements with Rotate/Cancel text:', allDialogs);
    await page.screenshot({ path: '/tmp/stripe-no-dialog.png' });
    await browser.disconnect();
    return;
  }

  // Dump dialog content
  const dlgText = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
    return d ? d.innerText : 'no dialog';
  });
  console.log('8. Dialog text:', dlgText);

  // Find ALL interactive elements in the dialog
  const elements = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (!d) return [];
    const results = [];
    const walker = document.createTreeWalker(d, NodeFilter.SHOW_ELEMENT);
    let node;
    while (node = walker.nextNode()) {
      if (node.offsetParent !== null) {
        const tag = node.tagName.toLowerCase();
        const text = node.textContent?.trim();
        if (text && (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'label' || node.getAttribute('role') || node.getAttribute('tabindex') || node.onclick)) {
          const rect = node.getBoundingClientRect();
          results.push({
            tag,
            text: text.substring(0, 60),
            role: node.getAttribute('role') || '',
            disabled: node.disabled,
            x: Math.round(rect.x + rect.width/2),
            y: Math.round(rect.y + rect.height/2),
            w: Math.round(rect.width),
            h: Math.round(rect.height)
          });
        }
      }
    }
    return results;
  });
  console.log('9. Dialog elements:');
  elements.forEach((e, i) => console.log(`   ${i}: <${e.tag}> "${e.text}" role=${e.role} dis=${e.disabled} @(${e.x},${e.y}) ${e.w}x${e.h}`));

  await page.screenshot({ path: '/tmp/stripe-dialog-full.png' });

  // Step 4: Try clicking on "now" option inside dialog
  const nowEl = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (!d) return null;
    const all = d.querySelectorAll('*');
    for (const el of all) {
      if (el.offsetParent !== null && el.textContent?.trim() === 'now') {
        const rect = el.getBoundingClientRect();
        return { x: rect.x + rect.width/2, y: rect.y + rect.height/2, text: el.textContent?.trim() };
      }
    }
    return null;
  });
  console.log('10. "now" element:', JSON.stringify(nowEl));

  if (nowEl) {
    await page.mouse.click(nowEl.x, nowEl.y);
    console.log('11. Clicked "now"');
    await sleep(2000);
  }

  // Step 5: Click "Rotate API key"
  const rotBtn = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (!d) return null;
    const btn = Array.from(d.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Rotate API key' && !b.disabled);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
    }
    return null;
  });
  console.log('12. Rotate API key button:', JSON.stringify(rotBtn));

  if (rotBtn) {
    await page.mouse.click(rotBtn.x, rotBtn.y);
    console.log('13. Clicked Rotate API key');
    await sleep(8000);
    await page.screenshot({ path: '/tmp/stripe-done2.png' });
    
    const body = await page.evaluate(() => document.body?.innerText || '');
    console.log('14. After rotation (first 1500):', body.substring(0, 1500));
    
    if (body.includes('OSkX')) console.log('OSkX still present');
    else console.log('OSkX GONE! Rotation succeeded!');
  }

  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
