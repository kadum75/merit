const puppeteer = require('puppeteer-core');
const fs = require('fs');
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
  let page = pages.find(p => p.url().includes('stripe.com') && !p.url().includes('login'));
  if (!page) page = pages[0];
  console.log('URL:', page.url().substring(0, 100));

  // First, check current state
  const body = await page.evaluate(() => document.body?.innerText || '');
  const hasPrimeCV = body.includes('PrimeCV') && body.includes('sk_live');
  console.log('Has PrimeCV with key:', hasPrimeCV);

  // Find the "More options" button for PrimeCV row and click it via CDP
  const box = await page.evaluate(() => {
    // Find all "More options" buttons
    const allBtns = Array.from(document.querySelectorAll('button'));
    const primeRow = Array.from(document.querySelectorAll('tr, [role="row"], div[class*="Row"]'));
    
    // Find button in the PrimeCV section
    for (const btn of allBtns) {
      if (btn.textContent?.trim() === 'More options' && btn.offsetParent !== null) {
        const rect = btn.getBoundingClientRect();
        // Check if this button is in the PrimeCV area
        const row = btn.closest('tr, [role="row"], [class*="row"], [class*="Row"], div');
        if (row && row.textContent?.includes('PrimeCV')) {
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
        }
      }
    }
    return null;
  });
  console.log('PrimeCV More options button:', JSON.stringify(box));

  if (box) {
    // Click via CDP
    const cdp = await page.target.createCDPSession();
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: box.x,
      y: box.y,
      button: 'left',
      clickCount: 1
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: box.x,
      y: box.y,
      button: 'left',
      clickCount: 1
    });
    console.log('Clicked More options via CDP');
    await sleep(1500);

    // Look for "Rotate" in the opened menu
    const rotateBox = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, [role="menuitem"], a'));
      for (const btn of btns) {
        const text = btn.textContent?.trim()?.toLowerCase() || '';
        if ((text.includes('rotate') || text.includes('roll')) && btn.offsetParent !== null) {
          const rect = btn.getBoundingClientRect();
          return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
        }
      }
      return null;
    });
    console.log('Rotate option box:', JSON.stringify(rotateBox));

    if (rotateBox) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: rotateBox.x,
        y: rotateBox.y,
        button: 'left',
        clickCount: 1
      });
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: rotateBox.x,
        y: rotateBox.y,
        button: 'left',
        clickCount: 1
      });
      console.log('Clicked Rotate option via CDP');
      await sleep(3000);

      // Take screenshot to show dialog
      await page.screenshot({ path: '/tmp/stripe-dialog.png' });

      // Now find and click the "Rotate API key" confirm button
      const confirmBox = await page.evaluate(() => {
        // Look for the dialog/modal
        const dialog = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="dialog"]');
        if (dialog) {
          const btns = dialog.querySelectorAll('button');
          for (const btn of btns) {
            if (btn.textContent?.trim() === 'Rotate API key' && !btn.disabled) {
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
        }
        // Fallback: find any visible Rotate API key button
        const allBtns = Array.from(document.querySelectorAll('button'));
        for (const btn of allBtns) {
          if (btn.textContent?.trim() === 'Rotate API key' && btn.offsetParent !== null && !btn.disabled) {
            const rect = btn.getBoundingClientRect();
            return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
          }
        }
        return null;
      });
      console.log('Confirm button:', JSON.stringify(confirmBox));

      if (confirmBox) {
        await cdp.send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          x: confirmBox.x,
          y: confirmBox.y,
          button: 'left',
          clickCount: 1
        });
        await cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          x: confirmBox.x,
          y: confirmBox.y,
          button: 'left',
          clickCount: 1
        });
        console.log('Clicked Rotate API key confirm via CDP');
        await sleep(8000);
        await page.screenshot({ path: '/tmp/stripe-rotated2.png' });

        // Extract new key
        const newBody = await page.evaluate(() => document.body?.innerText || '');
        console.log('After rotation body (first 800):', newBody.substring(0, 800));

        // Check for new key
        const keys = await page.evaluate(() => {
          const text = document.body?.innerText || '';
          const matches = text.match(/sk_live_[A-Za-z0-9]+/g) || [];
          return matches;
        });
        console.log('All sk_live keys found:', JSON.stringify(keys));

        // Also check for the new key reveal
        const revealTexts = await page.evaluate(() => {
          const text = document.body?.innerText || '';
          // After rotation, Stripe might show new key in a success message
          const lines = text.split('\n').filter(l => l.includes('sk_live') || l.includes('key') || l.includes('Key') || l.includes('success') || l.includes('Success'));
          return lines;
        });
        console.log('Relevant lines:', JSON.stringify(revealTexts));

        // Check if key changed from OSkX to something else
        const hasOSkX = newBody.includes('OSkX');
        console.log('Old key (OSkX) still present:', hasOSkX);

        // Try to find all visible elements with text containing sk_live
        const visibleKeys = await page.evaluate(() => {
          const results = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
          let node;
          while (node = walker.nextNode()) {
            if (node.textContent?.includes('sk_live')) {
              const rect = node.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                results.push(node.textContent?.substring(0, 40));
              }
            }
          }
          return results;
        });
        console.log('Visible elements with sk_live:', JSON.stringify(visibleKeys));
      }
      await cdp.detach();
    }
  }

  await browser.disconnect();
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
