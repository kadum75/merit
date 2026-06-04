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

async function main() {
  const info = await httpGet('/json/version');
  const targets = await httpGet('/json');
  const stripeTarget = targets.find(t => t.url?.includes('dashboard.stripe.com') && t.url?.includes('apikeys'));
  if (!stripeTarget) {
    console.log('No Stripe API keys page found among', targets.length, 'targets');
    targets.forEach(t => console.log('  ', t.url?.substring(0, 80)));
    return;
  }
  console.log('Found API keys page:', stripeTarget.url.substring(0, 80));

  const ws = new WebSocket(stripeTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('Connected');

  // Check current page state
  const state = await send(ws, 'Runtime.evaluate', {
    expression: `JSON.stringify({ 
      url: location.href, 
      hasDialog: !!document.querySelector('[role="dialog"]'),
      dialogText: document.querySelector('[role="dialog"]')?.innerText?.substring(0, 300),
      hasPrime: document.body?.innerText?.includes('PrimeCV'),
      bodyPreview: document.body?.innerText?.substring(0, 600)
    })`,
    returnByValue: true
  });
  console.log('State:', state.result?.value);

  ws.close();
}

main().catch(e => { console.error('ERR:', e.message); });
