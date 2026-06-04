const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
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

async function click(page, x, y) {
  await page.mouse.move(x, y);
  await sleep(100);
  await page.mouse.down();
  await sleep(50);
  await page.mouse.up();
}

async function evaluate(page, expr) {
  return page.evaluate(expr);
}

async function main() {
  const info = await httpGet('/json/version');
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  console.log('Connected');

  const pages = await browser.pages();
  const stripePage = pages.find(p => p.url().includes('acct_') && p.url().includes('apikeys'));
  if (!stripePage) { console.log('No API keys page'); await browser.disconnect(); return; }

  for (const p of pages) {
    if (p !== stripePage) { try { await p.close(); } catch (e) {} }
  }
  console.log('Pages filtered');

  // Navigate fresh
  await stripePage.goto('https://dashboard.stripe.com/apikeys', { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
  await sleep(8000);
  await stripePage.bringToFront();
  console.log('Page loaded');

  // Helper to find a visible element by text
  async function findVisibleText(text) {
    return evaluate(stripePage, (t) => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.offsetParent !== null && el.textContent?.trim() === t) {
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
        }
      }
      return null;
    }, text);
  }

  // Open More options menu for PrimeCV
  let morePos = await evaluate(stripePage, () => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    if (btns.length < 4) return null;
    const btn = btns[btns.length - 1];
    const r = btn.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  console.log('More options:', JSON.stringify(morePos));

  // First try JS click on button
  await evaluate(stripePage, () => {
    const btns = Array.from(document.querySelectorAll('button'))
      .filter(b => b.textContent?.trim() === 'More options' && b.offsetParent !== null);
    const btn = btns[btns.length - 1];
    if (btn) {
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      setTimeout(() => {
        btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, view: window }));
      }, 50);
    }
  });
  await sleep(3000);
  console.log('Clicked More options');

  // Debug: check menu
  const menuCheck = await evaluate(stripePage, () => {
    const menus = Array.from(document.querySelectorAll('[role="menu"]')).filter(m => m.offsetParent !== null);
    return menus.length > 0 ? menus[0].innerText?.substring(0, 200) : 'no menu';
  });
  console.log('Menu content:', menuCheck);

  // Find and click Rotate key - try multiple methods
  const rotItem = await evaluate(stripePage, () => {
    const items = document.querySelectorAll('[role="menu"] button, [role="menuitem"]');
    for (const item of items) {
      if (item.offsetParent !== null && item.textContent?.trim().toLowerCase().includes('rotate')) {
        const r = item.getBoundingClientRect();
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), text: item.textContent?.trim() };
      }
    }
    return null;
  });
  console.log('Rotate item:', JSON.stringify(rotItem));

  if (rotItem) {
    // JS dispatchEvent is needed to trigger the menu item action (mouse click doesn't work)
    await stripePage.mouse.move(rotItem.x, rotItem.y);
    await sleep(200);
    await stripePage.mouse.click(rotItem.x, rotItem.y);
    await sleep(1000);
    await evaluate(stripePage, () => {
      const items = document.querySelectorAll('[role="menu"] button, [role="menuitem"]');
      for (const item of items) {
        if (item.offsetParent !== null && item.textContent?.trim().toLowerCase().includes('rotate')) {
          item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, view: window }));
          item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, view: window }));
          item.dispatchEvent(new MouseEvent('click', { bubbles: true, view: window }));
          return;
        }
      }
    });
    await sleep(4000);
    console.log('Clicked Rotate key');
  } else {
    // Fallback: JS click
    await evaluate(stripePage, () => {
      const items = document.querySelectorAll('[role="menu"] button, [role="menuitem"]');
      for (const item of items) {
        if (item.offsetParent !== null && item.textContent?.trim().toLowerCase().includes('rotate')) {
          item.dispatchEvent(new MouseEvent('click', { bubbles: true, view: window }));
          return;
        }
      }
    });
    await sleep(4000);
    console.log('Clicked Rotate key via JS');
  }

  // Now find the rotate dialog - look for "Rotate API key" text
  let rotateDialog = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    rotateDialog = await evaluate(stripePage, () => {
      // Look for visible dialog containing "Rotate API key" or "Expiration"
      const dialogs = document.querySelectorAll('[role="dialog"]');
      for (const d of dialogs) {
        if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
          return { found: true, text: d.innerText?.substring(0, 300) };
        }
      }
      return { found: false };
    });
    if (rotateDialog.found) {
      console.log('Found rotate dialog:', rotateDialog.text?.substring(0, 100));
      break;
    }
    // Check if a non-rotate dialog is blocking (Assistant)
    const blocker = await evaluate(stripePage, () => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      for (const d of dialogs) {
        if (d.offsetParent !== null && d.textContent?.includes('Assistant')) {
          d.style.display = 'none';
          return 'Assistant dismissed';
        }
      }
      return 'no blocker';
    });
    console.log(`Attempt ${attempt + 1}:`, blocker);
    await sleep(2000);
  }

  if (!rotateDialog || !rotateDialog.found) {
    console.log('Could not find rotate dialog. Checking page...');
    const pageText = await evaluate(stripePage, () => document.body?.innerText?.substring(0, 600));
    console.log('Page:', pageText);
    await browser.disconnect();
    return;
  }

  // Helper: find the visible rotate dialog
  async function findRotateDialog() {
    return evaluate(stripePage, () => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      for (const d of dialogs) {
        if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
          return d;
        }
      }
      return null;
    });
  }

  // Find Rotate API key button - get full details
  let rotBtnInfo = await evaluate(stripePage, () => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const d of dialogs) {
      if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
        const btns = d.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.offsetParent !== null && btn.textContent?.trim() === 'Rotate API key') {
            const r = btn.getBoundingClientRect();
            const attrs = {};
            for (const attr of btn.attributes) {
              attrs[attr.name] = attr.value;
            }
            return {
              x: Math.round(r.x + r.width / 2),
              y: Math.round(r.y + r.height / 2),
              disabled: btn.disabled,
              ariaDisabled: btn.getAttribute('aria-disabled'),
              className: btn.className?.substring(0, 100),
              attrs,
              tagName: btn.tagName,
              innerHTML: btn.innerHTML?.substring(0, 200),
              parentClassName: btn.parentElement?.className?.substring(0, 100)
            };
          }
        }
      }
    }
    return null;
  });
  console.log('Rotate button details:', JSON.stringify(rotBtnInfo, null, 2));

  // Always try to select expiration "now" first
  console.log('Looking for expiration field...');

  // Dump the full dialog structure
  const dialogStructure = await evaluate(stripePage, () => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const d of dialogs) {
      if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
        const result = { tagName: d.tagName, id: d.id, className: d.className?.substring(0, 100) };
        result.labels = [];
        result.radios = [];
        result.inputs = [];
        result.selects = [];
        result.allButtons = [];
        const all = d.querySelectorAll('*');
        for (const el of all) {
          if (el.offsetParent === null) continue;
          const t = el.textContent?.trim();
          const r = el.getBoundingClientRect();
          const tag = el.tagName.toLowerCase();
          // Track labels and key text
          if (t && t.length > 0 && t.length < 60 && (tag === 'label' || tag === 'span' || tag === 'div')) {
            result.labels.push({ text: t, x: Math.round(r.x), y: Math.round(r.y), tag });
          }
          if (tag === 'input') {
            result.inputs.push({ type: el.type, placeholder: el.placeholder, name: el.name || el.getAttribute('aria-label'), x: Math.round(r.x), y: Math.round(r.y) });
          }
          if (tag === 'select') {
            result.selects.push({ name: el.name, x: Math.round(r.x), y: Math.round(r.y) });
          }
          if (tag === 'button') {
            result.allButtons.push({ text: t?.substring(0, 30), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h), type: el.type, disabled: el.disabled });
          }
        }
        return result;
      }
    }
    return null;
  });
  console.log('Dialog structure:', JSON.stringify(dialogStructure, null, 2));

  // Set expiration to "now" via the select element
  const selectResult = await evaluate(stripePage, () => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const d of dialogs) {
      if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
        const sel = d.querySelector('select[name="delay_sec"]');
        if (!sel) return { error: 'select not found' };
        // Get available options
        const options = Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
        // Set to 0 (now)
        sel.value = '0';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return { options, value: sel.value };
      }
    }
    return { error: 'dialog not found' };
  });
  console.log('Select result:', JSON.stringify(selectResult));

  await sleep(1000);

  // Re-find Rotate API key button
  const rotBtnPos = await evaluate(stripePage, () => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const d of dialogs) {
      if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
        const btns = d.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.offsetParent !== null && btn.textContent?.trim() === 'Rotate API key') {
            const r = btn.getBoundingClientRect();
            return {
              x: Math.round(r.x + r.width / 2),
              y: Math.round(r.y + r.height / 2),
              disabled: btn.disabled,
              ariaDisabled: btn.getAttribute('aria-disabled'),
              className: btn.className?.substring(0, 80)
            };
          }
        }
      }
    }
    return null;
  });
  console.log('Button after expiration:', JSON.stringify(rotBtnPos));

  if (!rotBtnPos || rotBtnPos.disabled || rotBtnPos.ariaDisabled === 'true') {
    console.log('Rotate API key button still not clickable');
    const dialogText = await evaluate(stripePage, () => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      for (const d of dialogs) { if (d.offsetParent !== null) return d.innerText?.substring(0, 500); }
      return null;
    });
    console.log('Dialog text:', dialogText);
    await browser.disconnect();
    return;
  }

  // Capture console logs from the page
  const consoleLogs = [];
  stripePage.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    }
  });

  // Try form submission with network interception
  const requests = [];
  const responses = [];
  stripePage.on('request', req => {
    if (req.method() === 'POST') {
      requests.push({ url: req.url().substring(0, 150), time: Date.now() });
    }
  });
  stripePage.on('response', res => {
    if (res.request().method() === 'POST') {
      responses.push({ url: res.url().substring(0, 150), status: res.status(), time: Date.now() });
    }
  });

  console.log('Attempting form submission at', rotBtnPos.x, rotBtnPos.y);

  // Check form info - especially hidden fields
  const formInfo = await evaluate(stripePage, () => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const d of dialogs) {
      if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
        const form = d.querySelector('form');
        if (!form) return { error: 'no form' };
        // Get all form elements including their values
        const elements = [];
        for (const el of form.elements) {
          if (el.name) {
            elements.push({ name: el.name, value: el.value, type: el.type || el.tagName });
          }
        }
        return {
          id: form.id,
          action: form.action?.substring(0, 100),
          method: form.method,
          elements
        };
      }
    }
    return null;
  });
  console.log('Form info:', JSON.stringify(formInfo, null, 2));

  // Try direct form.submit() - bypasses React preventDefault
  // This will navigate the page with GET params
  // Dump event listeners on the button and form
  const eventInfo = await evaluate(stripePage, () => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const d of dialogs) {
      if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
        const btn = d.querySelector('button');
        if (!btn) return null;
        const form = d.querySelector('form');
        const info = {
          btnId: btn.id,
          btnClass: btn.className?.substring(0, 80),
          btnOnClick: typeof btn.onclick,
          formOnSubmit: form ? typeof form.onsubmit : 'no form',
          reactFiber: null,
          listeners: []
        };
        // Try to get React fiber data
        const key = Object.keys(btn).find(k => k.startsWith('__reactProps'));
        if (key) {
          const props = btn[key];
          info.listeners = Object.keys(props).filter(k => k.startsWith('on')).map(k => `${k}: ${typeof props[k]}`);
        }
        // Try getEventListeners
        if (typeof window.getEventListeners === 'function') {
          info.getListeners = window.getEventListeners(btn);
        }
        return info;
      }
    }
    return null;
  });
  console.log('Event info:', JSON.stringify(eventInfo, null, 2));

  // Event info shows btn.onclick is 'function' - try calling it directly
  const clickResult = await evaluate(stripePage, () => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const d of dialogs) {
      if (d.offsetParent !== null && (d.textContent?.includes('Rotate API key') || d.textContent?.includes('Expiration'))) {
        const btns = d.querySelectorAll('button');
        for (const btn of btns) {
          if (btn.offsetParent !== null && btn.textContent?.trim() === 'Rotate API key') {
            const results = [];
            // Try calling onclick with synthetic event
            if (typeof btn.onclick === 'function') {
              const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
              btn.onclick.call(btn, evt);
              results.push('onclick_direct');
            }
            // Try React onClick
            const key = Object.keys(btn).find(k => k.startsWith('__reactProps'));
            if (key) {
              const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
              btn[key].onClick?.(evt);
              results.push('react_onclick');
            }
            // Try dispatchEvent (not trusted, but some handlers don't check)
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            btn.dispatchEvent(evt);
            results.push('dispatchEvent');
            return { method: results, result: 'called' };
          }
        }
      }
    }
    return { method: 'none', result: 'no dialog' };
  });
  console.log('Direct onclick result:', JSON.stringify(clickResult));
  await sleep(5000);

  // Check the result - look for dialog changes, loading, errors
  const afterOnClick = await evaluate(stripePage, () => {
    const text = document.body?.innerText || '';
    const loading = !!document.querySelector('[aria-busy="true"], [role="progressbar"], .Loading, .loading');
    // Check for new key entries
    const newKeys = text.match(/sk_live_[A-Za-z0-9_.]{10,}/g) || [];
    return {
      oskx: text.includes('OSkX'),
      keys: newKeys,
      textSnippet: text.substring(text.indexOf('Rotating') - 20, text.indexOf('Rotating') + 50) || text.substring(text.indexOf('Key'), text.indexOf('Key') + 100) || 'No rotating found',
      loading
    };
  });
  console.log('After onclick call:', JSON.stringify(afterOnClick));
  await sleep(2000);
  // Check if dialog is still open
  const stillOpen = await evaluate(stripePage, () => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    return Array.from(dialogs).filter(d => d.offsetParent !== null).map(d => d.textContent?.substring(0, 120));
  });
  console.log('Open dialogs:', JSON.stringify(stillOpen));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
