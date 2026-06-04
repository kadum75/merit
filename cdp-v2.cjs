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
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
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
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await new Promise(r => setTimeout(r, 100));
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 50));
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function main() {
  const targets = await httpGet('/json');
  const t = targets.find(t => t.url?.includes('dashboard.stripe.com'));
  if (!t) { console.log('No Stripe page'); return; }

  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject); });
  console.log('Connected');

  // Reload page fresh
  await send(ws, 'Page.enable');
  await send(ws, 'Page.navigate', { url: 'https://dashboard.stripe.com/apikeys' });
  await sleep(12000);

  // Check page state
  const url = await evaluate(ws, 'location.href');
  const body = await evaluate(ws, 'document.body?.innerText || ""');
  console.log('URL:', url?.substring(0, 80));
  console.log('Has PrimeCV:', body?.includes('PrimeCV'));
  console.log('Body preview:', body?.substring(0, 400));

  if (!body?.includes('PrimeCV')) {
    console.log('Page not loaded properly, waiting more...');
    await sleep(8000);
    const body2 = await evaluate(ws, 'document.body?.innerText || ""');
    console.log('Retry - has PrimeCV:', body2?.includes('PrimeCV'));
  }

  // Find More options for PrimeCV
  const moreBtn = await evaluate(ws, `(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    if (btns.length === 0) return null;
    // PrimeCV is usually the last one
    const btn = btns[btns.length - 1];
    return ({ x: Math.round(btn.getBoundingClientRect().x + btn.getBoundingClientRect().width/2), y: Math.round(btn.getBoundingClientRect().y + btn.getBoundingClientRect().height/2), idx: btns.length - 1, total: btns.length });
  })()`);
  console.log('More options:', JSON.stringify(moreBtn));

  if (!moreBtn) {
    console.log('No More options found');
    ws.close();
    return;
  }

  await click(ws, moreBtn.x, moreBtn.y);
  await sleep(2000);
  console.log('Clicked More options');

  // Find Rotate option in menu
  const rotateOpt = await evaluate(ws, `(() => {
    const all = document.querySelectorAll('button, [role="menuitem"], a');
    for (const el of all) {
      if (el.offsetParent !== null && (el.textContent?.trim()?.toLowerCase() || '').includes('rotate')) {
        return ({ x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2), y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2), text: el.textContent?.trim() });
      }
    }
    return null;
  })()`);
  console.log('Rotate option:', JSON.stringify(rotateOpt));

  if (!rotateOpt) {
    console.log('No Rotate option found');
    ws.close();
    return;
  }

  await click(ws, rotateOpt.x, rotateOpt.y);
  await sleep(3000);
  console.log('Clicked Rotate key');

  // Get all visible elements in dialog
  const items = await evaluate(ws, `(() => {
    const d = document.querySelector('[role="dialog"], [aria-modal="true"]');
    if (!d) return 'NO_DIALOG';
    const els = Array.from(d.querySelectorAll('*')).filter(el => el.offsetParent !== null && el.textContent?.trim());
    return els.map(el => ({
      tag: el.tagName,
      txt: el.textContent?.trim()?.substring(0, 30),
      role: el.getAttribute('role') || '',
      dis: !!el.disabled,
      x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2),
      y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2)
    })).filter(e => e.txt && e.txt.length < 25);
  })()`);
  console.log('Dialog items:', JSON.stringify(items)?.substring(0, 1000));

  // Try clicking "now"
  const nowEl = await evaluate(ws, `(() => {
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.offsetParent !== null && el.textContent?.trim() === 'now') {
        return ({ x: Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width/2), y: Math.round(el.getBoundingClientRect().y + el.getBoundingClientRect().height/2) });
      }
    }
    return null;
  })()`);
  console.log('Now element:', JSON.stringify(nowEl));
  if (nowEl && nowEl !== 'null') {
    const pos = JSON.parse(nowEl);
    await click(ws, pos.x, pos.y);
    await sleep(2000);
    console.log('Clicked now');
  }

  // Click Rotate API key
  const rotBtn = await evaluate(ws, `(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const btn of btns) {
      if (btn.textContent?.trim() === 'Rotate API key' && btn.offsetParent !== null && !btn.disabled) {
        return ({ x: Math.round(btn.getBoundingClientRect().x + btn.getBoundingClientRect().width/2), y: Math.round(btn.getBoundingClientRect().y + btn.getBoundingClientRect().height/2) });
      }
    }
    return null;
  })()`);

  if (rotBtn) {
    const pos = rotBtn;
    console.log('Clicking Rotate API key at', pos.x, pos.y);
    await click(ws, pos.x, pos.y);
    await sleep(8000);

    const finalBody = await evaluate(ws, 'document.body?.innerText || ""');
    console.log('After rotation:', finalBody?.substring(0, 800));
    console.log('OSkX present:', finalBody?.includes('OSkX'));
  }

  ws.close();
}

main().catch(e => console.error('FATAL:', e.message, e.stack?.split('\n')[1]));
