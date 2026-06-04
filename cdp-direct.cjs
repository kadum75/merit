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
  return new Promise((resolve) => {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, method, params }));
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.id === id) {
        ws.removeListener('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function click(ws, x, y) {
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  const info = await httpGet('/json/version');
  const wsUrl = info.webSocketDebuggerUrl;

  // Get all targets to find the stripe page
  const targets = await httpGet('/json');
  const stripeTarget = targets.find(t => t.url && t.url.includes('dashboard.stripe.com') && t.url.includes('apikeys'));
  if (!stripeTarget) {
    // Use the first page target
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) { console.log('No page target found'); return; }
  }

  const targetUrl = stripeTarget ? stripeTarget.webSocketDebuggerUrl : targets.find(t => t.type === 'page')?.webSocketDebuggerUrl;
  console.log('Target URL:', targetUrl?.substring(0, 80));

  const ws = new WebSocket(targetUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('Connected via CDP WS');

  // Enable page events
  await send(ws, 'Page.enable');
  await send(ws, 'Runtime.enable');
  console.log('Page enabled');

  // Reload
  await send(ws, 'Page.navigate', { url: 'https://dashboard.stripe.com/apikeys' });
  await sleep(12000);

  // Evaluate JS to get page text
  const result = await send(ws, 'Runtime.evaluate', {
    expression: `JSON.stringify({ url: location.href, bodyLen: document.body?.innerText?.length, hasPrimeCV: document.body?.innerText?.includes('PrimeCV'), hasKeys: document.body?.innerText?.includes('sk_live') })`,
    returnByValue: true
  });
  console.log('Page state:', result.result?.value);

  // Open menu at PrimeCV "More options" (last one). Coordinates from earlier: 1189, 615
  await click(ws, 1189, 615);
  await sleep(2000);
  console.log('Clicked More options');

  // Click Rotate key: 1123, 687
  await click(ws, 1123, 687);
  await sleep(3000);
  console.log('Clicked Rotate key');

  // Check dialog + get inner HTML
  const dlgResult = await send(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
      if (!d) return 'NO DIALOG';
      const all = Array.from(d.querySelectorAll('*')).filter(el => el.offsetParent !== null && el.textContent?.trim());
      return all.map(el => ({
        t: el.tagName,
        txt: el.textContent?.trim()?.substring(0, 40),
        r: el.getAttribute('role') || '',
        dis: !!el.disabled,
        x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2),
        y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2)
      })).filter(e => e.txt && (e.txt.length < 30 || e.txt === 'Expiration' || e.txt.includes('Select') || e.txt === 'now' || e.txt.includes('Rotate') || e.txt === 'Cancel' || e.txt.includes('expire')));
    })()`,
    returnByValue: true
  });
  const dialogEls = dlgResult.result?.value;
  console.log('Dialog elements:', JSON.stringify(dialogEls, null, 2));

  if (Array.isArray(dialogEls)) {
    // Find "now" option
    const nowEl = dialogEls.find(e => e.txt === 'now');
    if (nowEl) {
      console.log('Clicking "now" at', nowEl.x, nowEl.y);
      await click(ws, nowEl.x, nowEl.y);
      await sleep(2000);
    } else {
      // Click "Select an expiration date" to open dropdown
      const selectEl = dialogEls.find(e => e.txt.includes('Select'));
      if (selectEl) {
        console.log('Clicking expiration trigger at', selectEl.x, selectEl.y);
        await click(ws, selectEl.x, selectEl.y);
        await sleep(2000);

        // Find "now" after dropdown opens
        const nowResult = await send(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const all = Array.from(document.querySelectorAll('*'));
            for (const el of all) {
              if (el.offsetParent !== null && el.textContent?.trim() === 'now') {
                return { x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2), y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2) };
              }
            }
            return null;
          })()`,
          returnByValue: true
        });
        if (nowResult.result?.value) {
          console.log('Found now after dropdown:', JSON.stringify(nowResult.result.value));
          await click(ws, nowResult.result.value.x, nowResult.result.value.y);
          await sleep(2000);
        }
      }
    }

    // Click Rotate API key - find button in dialog
    const rotateBtn = dialogEls.find(e => e.txt === 'Rotate API key' || (e.txt.includes('Rotate') && e.t === 'BUTTON'));
    if (rotateBtn && !rotateBtn.dis) {
      console.log('Clicking Rotate API key at', rotateBtn.x, rotateBtn.y);
      await click(ws, rotateBtn.x, rotateBtn.y);
      await sleep(8000);
    } else {
      // Use coordinates from earlier
      console.log('Using stored coordinates for Rotate API key');
      await click(ws, 787, 618);
      await sleep(8000);
    }

    // Check result
    const finalResult = await send(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const text = document.body?.innerText || '';
        const hasOldKey = text.includes('OSkX');
        const keys = [...text.matchAll(/sk_live_[A-Za-z0-9_.]+/g)].map(m => m[0]);
        return { hasOldKey, keys, text: text.substring(0, 500) };
      })()`,
      returnByValue: true
    });
    console.log('Final:', JSON.stringify(finalResult.result?.value));
  }

  ws.close();
  console.log('Done');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack?.split('\n')[0]); process.exit(1); });
