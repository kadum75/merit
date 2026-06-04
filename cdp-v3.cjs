const WebSocket = require('ws');
const http = require('http');
const CDP_PORT = 9225;
let msgId = 0;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${CDP_PORT}${path}`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 8000);
    ws.send(JSON.stringify({ id, method, params }));
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        clearTimeout(timer);
        ws.removeListener('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function evaluate(ws, expr) {
  const r = await send(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result?.result?.value;
}

async function click(ws, x, y) {
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers: 0 });
  await sleep(100);
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, modifiers: 0, buttons: 1 });
  await sleep(50);
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, modifiers: 0, buttons: 0 });
}

async function main() {
  console.log('Getting targets...');
  const targets = await httpGet('/json');
  console.log('Available page targets:');
  const pageTargets = targets.filter(tt => tt.type === 'page');
  pageTargets.forEach(tt => console.log('  ', tt.url?.substring(0, 120)));
  let t = pageTargets.find(tt => tt.url?.includes('acct_') && tt.url?.includes('apikeys'));
  if (!t) {
    t = pageTargets.find(tt => tt.url?.includes('dashboard.stripe.com'));
    if (!t) { console.log('No dashboard page found'); return; }
  }
  if (!t) { console.log('No Stripe page'); return; }
  console.log('Target:', t.url?.substring(0, 60));

  console.log('Connecting WS...');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WS connect timeout')), 5000);
    ws.on('open', () => { clearTimeout(timer); resolve(); });
    ws.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
  console.log('Connected');

  // Enable domains
  try {
    await send(ws, 'Page.enable');
    console.log('Page enabled');
  } catch(e) { console.log('Page.enable err:', e.message); }

  // Don't navigate - use current page state
  console.log('Using current page...');
  await sleep(3000);

  console.log('Checking page state...');
  try {
    const url = await evaluate(ws, 'location.href');
    console.log('URL:', url?.substring(0, 80));
    const body = await evaluate(ws, 'document.body?.innerText || ""');
    console.log('Has PrimeCV:', body?.includes('PrimeCV'));
    console.log('Body len:', body?.length);
    if (!body?.includes('PrimeCV')) {
      console.log('Body preview:', body?.substring(0, 400));
    }
  } catch(e) {
    console.log('Eval error:', e.message);
  }

  // Debug: find ALL buttons and their positions
  const allBtns = await evaluate(ws, `(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null);
    return btns.map(b => ({
      txt: b.textContent?.trim()?.substring(0, 40),
      x: Math.round(b.getBoundingClientRect().x + b.getBoundingClientRect().width/2),
      y: Math.round(b.getBoundingClientRect().y + b.getBoundingClientRect().height/2),
      w: Math.round(b.getBoundingClientRect().width),
      h: Math.round(b.getBoundingClientRect().height)
    }));
  })()`);
  console.log('All buttons:', JSON.stringify(allBtns));

  // Find PrimeCV More options - last one
  const moreBtns = allBtns?.filter(b => b.txt === 'More options') || [];
  console.log('More options buttons:', moreBtns.length);

  if (moreBtns.length >= 4) {
    const moreBtn = moreBtns[moreBtns.length - 1];
    console.log('Last More options:', JSON.stringify(moreBtn));

    // Single clean click sequence with buttons field
    await click(ws, moreBtn.x, moreBtn.y);
    await sleep(3000);
    console.log('Clicked More options');

    // Debug: check for menus
    const debugState = await evaluate(ws, `(() => {
      const text = document.body?.innerText || '';
      const menus = document.querySelectorAll('[role="menu"]');
      const visibleMenus = Array.from(menus).filter(m => m.offsetParent !== null);
      const allRotate = Array.from(document.querySelectorAll('*')).filter(el => el.offsetParent !== null && el.textContent?.includes('Rotate'));
      return ({ hasRotateInBody: text.includes('Rotate key'), visibleMenus: visibleMenus.length, rotateEls: allRotate.slice(0, 3).map(e => e.textContent?.substring(0, 40)) });
    })()`);
    console.log('After click debug:', JSON.stringify(debugState));

    // Find Rotate option
    const rotOpt = await evaluate(ws, `(() => {
      const all = document.querySelectorAll('button, [role="menuitem"], a');
      for (const el of all) {
        if (el.offsetParent !== null && (el.textContent?.trim()?.toLowerCase() || '').includes('rotate')) {
          return ({ x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2), y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2) });
        }
      }
      return null;
    })()`);
    console.log('Rotate option:', JSON.stringify(rotOpt));

    if (rotOpt) {
      await click(ws, rotOpt.x, rotOpt.y);
      await sleep(3000);
      console.log('Clicked Rotate');

      // Get dialog elements
      const dialogItems = await evaluate(ws, `(() => {
        const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
        if (!d) return null;
        return Array.from(d.querySelectorAll('*')).filter(el => el.offsetParent !== null && el.textContent?.trim()).map(el => ({
          tag: el.tagName,
          txt: el.textContent?.trim()?.substring(0, 40),
          role: el.getAttribute('role') || '',
          dis: !!el.disabled,
          x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2),
          y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2)
        }));
      })()`);
      console.log('Dialog items:', JSON.stringify(dialogItems));
      console.log('Dialog items count:', dialogItems?.length);

      if (dialogItems && dialogItems.length > 0) {
        // Find and click "now" option
        const nowEl = dialogItems.find(i => i.txt === 'now');
        if (nowEl) {
          console.log('Clicking now at', nowEl.x, nowEl.y);
          await click(ws, nowEl.x, nowEl.y);
          await sleep(2000);
        } else {
          // Click "Select an expiration date" to open dropdown
          const selectEl = dialogItems.find(i => i.txt.includes('Select') || i.txt.includes('Expiration'));
          console.log('Select element:', JSON.stringify(selectEl));
          if (selectEl) {
            await click(ws, selectEl.x, selectEl.y);
            await sleep(2000);

            // Find now after dropdown
            const nowAfter = await evaluate(ws, `(() => {
              const all = document.querySelectorAll('*');
              for (const el of all) {
                if (el.offsetParent !== null && el.textContent?.trim() === 'now' && !el.closest('[role="dialog"]')?.querySelector('[role="listbox"]') === null) {
                  return ({ x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2), y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2) });
                }
              }
              // Fallback - find any "now" outside dialog
              const allEl = document.querySelectorAll('*');
              for (const el of allEl) {
                if (el.offsetParent !== null && el.textContent?.trim() === 'now') {
                  return ({ x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2), y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2) });
                }
              }
              return null;
            })()`);
            console.log('Now after dropdown:', JSON.stringify(nowAfter));
            if (nowAfter) {
              await click(ws, nowAfter.x, nowAfter.y);
              await sleep(2000);
              console.log('Clicked now from dropdown');
            }
          }
        }

        // Click Rotate API key
        const rotBtn = dialogItems.find(i => i.txt === 'Rotate API key' && !i.dis);
        if (rotBtn) {
          console.log('Clicking Rotate API key at', rotBtn.x, rotBtn.y);
          await click(ws, rotBtn.x, rotBtn.y);
          await sleep(8000);

          const finalBody = await evaluate(ws, 'document.body?.innerText || ""');
          console.log('\n=== RESULT ===');
          console.log('Has OSkX:', finalBody?.includes('OSkX'));
          console.log('Preview:', finalBody?.substring(0, 800));

          if (!finalBody?.includes('OSkX')) {
            console.log('\n*** ROTATION SUCCEEDED! ***');
          }

          // Check for verification
          if (finalBody?.toLowerCase().includes('verification') && finalBody?.toLowerCase().includes('code')) {
            console.log('\n*** VERIFICATION REQUIRED - check email ***');
          }
        } else {
          console.log('No Rotate API key button found (may be disabled)');
        }
      } else {
        console.log('No dialog found');
        const pageText = await evaluate(ws, 'document.body?.innerText?.substring(0, 1000) || ""');
        console.log('Page text:', pageText);
      }
    }
  }

  ws.close();
}

main().catch(e => { console.error('FATAL:', e.message, e.stack?.split('\n')[1]); process.exit(1); });
