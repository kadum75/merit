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

async function main() {
  const info = await httpGet('/json/version');
  const targets = await httpGet('/json');
  const t = targets.find(t => t.url?.includes('dashboard.stripe.com'));
  if (!t) { console.log('No Stripe page found'); return; }
  console.log('Target:', t.url?.substring(0, 80));

  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('Connected, sending evaluate...');

  const raw = await send(ws, 'Runtime.evaluate', {
    expression: '42',
    returnByValue: true
  });
  console.log('Raw response:', JSON.stringify(raw).substring(0, 500));
  console.log('Result:', JSON.stringify(raw.result));
  console.log('Value:', raw.result?.value);

  ws.close();
}

main().catch(e => console.error('FATAL:', e.message));
