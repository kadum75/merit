const puppeteer = require('puppeteer-core');
const http = require('http');
const CDP_PORT = 9225;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}${path}`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const info = await httpGet('/json/version');
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  console.log('Connected');

  // Get pages and close unnecessary ones
  const pages = await browser.pages();
  console.log('Total pages:', pages.length);

  const stripePage = pages.find(p => p.url().includes('acct_') && p.url().includes('apikeys'));
  if (!stripePage) { console.log('No API keys page'); await browser.disconnect(); return; }

  // Close all other pages
  for (const p of pages) {
    if (p !== stripePage) {
      try { await p.close(); } catch(e) {}
    }
  }
  console.log('Closed other pages');

  // Navigate fresh - force reload
  await stripePage.goto('about:blank');
  await sleep(1000);
  await stripePage.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle0', timeout: 45000 }).catch(e => console.log('Nav error:', e.message));
  await sleep(8000);
  console.log('Page loaded');

  await stripePage.bringToFront();
  await sleep(1000);

  // Debug: click on the page body to focus it
  await stripePage.mouse.click(100, 100);
  await sleep(500);

  // Click More options for PrimeCV
  // Wait for the page to be fully interactive
  await stripePage.waitForFunction(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null).length >= 4;
  }, { timeout: 15000 }).catch(() => console.log('Wait for buttons timed out'));

  const moreBtns = await stripePage.evaluate(() => {
    return Array.from(document.querySelectorAll('button'))
      .filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null)
      .length;
  });
  console.log('More options buttons:', moreBtns);

  // Click the last More options button
  const morePos = await stripePage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    const btn = btns[btns.length - 1];
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
  });
  console.log('More options position:', JSON.stringify(morePos));

  // Use JavaScript click dispatch from within the page
  const clicked = await stripePage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    const btn = btns[btns.length - 1];
    if (!btn) return 'no button';
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    setTimeout(() => {
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }, 50);
    return 'events dispatched';
  });
  console.log('JS click result:', clicked);
  await sleep(3000);

  // Check for menu
  const menuCheck = await stripePage.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="menu"]')).filter(m => m.offsetParent !== null).length;
  });
  console.log('Visible menus:', menuCheck);
  const menu = await stripePage.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="menu"]')).filter(m => m.offsetParent !== null).length;
  });
  console.log('Visible menus after click:', menu);

  if (menu > 0) {
    // Find Rotate option
    const rotPos = await stripePage.evaluate(() => {
      const items = document.querySelectorAll('button, [role="menuitem"], a');
      for (const item of items) {
        if (item.offsetParent !== null && item.textContent?.trim().toLowerCase().includes('rotate')) {
          const rect = item.getBoundingClientRect();
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
        }
      }
      return null;
    });
    console.log('Rotate position:', JSON.stringify(rotPos));

    if (rotPos) {
      await stripePage.mouse.click(rotPos.x, rotPos.y);
      await sleep(3000);

      // Handle dialog
      const dialog = await stripePage.evaluate(() => {
        const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
        return d ? d.innerText?.substring(0, 500) : null;
      });
      console.log('Dialog:', dialog);

      // After the dialog check above, click Rotate via JS events
      if (allDialogs.length > 0) {
        // Click the "Rotate key" menu item via JS
        await stripePage.evaluate(() => {
          const items = document.querySelectorAll('[role="menu"] button, [role="menuitem"], [role="dialog"] button');
          for (const item of items) {
            if (item.offsetParent !== null && item.textContent?.trim().toLowerCase().includes('rotate')) {
              // Dispatch trusted-like events
              item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
              item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
              item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              return;
            }
          }
        });
        await sleep(3000);

        // Check what's visible now
        const dialogsAfter = await stripePage.evaluate(() => {
          const dialogs = document.querySelectorAll('[role="dialog"]');
          return Array.from(dialogs).map(d => ({
            visible: d.offsetParent !== null,
            display: getComputedStyle(d).display,
            text: d.innerText?.substring(0, 200)
          }));
        });
        console.log('Dialogs after Rotate click:', JSON.stringify(dialogsAfter, null, 2));

        // Check if rotate API key dialog appeared
        const hasRotateDialog = dialogsAfter.some(d => 
          d.visible && (d.text.includes('Rotate API key') || d.text.includes('Expiration'))
        );
        console.log('Has rotate dialog:', hasRotateDialog);

        if (!hasRotateDialog) {
          console.log('Rotate dialog did not appear - skipping expiration selection');
        } else {
          for (const text of ['now', 'in 1 hour', 'in 24 hours']) {
          const pos = await stripePage.evaluate((t) => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
              if (el.offsetParent !== null && el.textContent?.trim() === t) {
                const rect = el.getBoundingClientRect();
                return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
              }
            }
            return null;
          }, text);
          if (pos) {
            console.log(`Clicking "${text}" at ${pos.x},${pos.y}`);
            await stripePage.mouse.click(pos.x, pos.y);
            await sleep(500);
            break;
          }
        }

        // If no "now" found, try clicking expiration label to open dropdown
        const noNow = await stripePage.evaluate(() => {
          const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (!d) return;
          const els = d.querySelectorAll('*');
          for (const el of els) {
            if (el.offsetParent !== null && (el.textContent?.includes('Select an expiration') || el.textContent?.trim() === 'Expiration')) {
              const rect = el.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          return null;
        });
        if (noNow) {
          console.log('Opening expiration dropdown at', noNow.x, noNow.y);
          await stripePage.mouse.click(noNow.x, noNow.y);
          await sleep(2000);

          // Now find "now" again
          const nowAfter = await stripePage.evaluate(() => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
              if (el.offsetParent !== null && el.textContent?.trim() === 'now') {
                const rect = el.getBoundingClientRect();
                return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
              }
            }
            return null;
          });
          if (nowAfter) {
            console.log('Now found at', nowAfter.x, nowAfter.y);
            await stripePage.mouse.click(nowAfter.x, nowAfter.y);
            await sleep(500);
          }
        }

        // Click Rotate API key
        const confirmPos = await stripePage.evaluate(() => {
          const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
          if (!d) return null;
          const btns = d.querySelectorAll('button');
          for (const btn of btns) {
            if (btn.textContent?.trim() === 'Rotate API key' && !btn.disabled) {
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          return null;
        });
        console.log('Confirm position:', JSON.stringify(confirmPos));

        if (confirmPos) {
          await stripePage.mouse.click(confirmPos.x, confirmPos.y);
          console.log('Clicked Rotate API key');
          await sleep(10000);

          const result = await stripePage.evaluate(() => document.body?.innerText || '');
          if (result.includes('OSkX')) {
            console.log('OSkX still present - may need verification');
          } else {
            console.log('*** ROTATION SUCCEEDED! ***');
            const keys = result.match(/sk_live_[A-Za-z0-9_.]+/g);
            console.log('Keys:', JSON.stringify(keys));
          }
        }
      }
    }
  } else {
    console.log('Menu did not appear. Checking page state...');
    const text = await stripePage.evaluate(() => document.body?.innerText?.substring(0, 600));
    console.log('Page text:', text);
  }

  await browser.disconnect();
}

main().catch(e => { console.error('FATAL:', e.message, e.stack?.split('\n')[1]); process.exit(1); });
