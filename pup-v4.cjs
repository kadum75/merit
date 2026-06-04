const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('Connecting...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9225' });
  console.log('Connected');

  const pages = await browser.pages();
  const stripePage = pages.find(p => {
    const url = p.url() || '';
    return url.includes('dashboard.stripe.com') && url.includes('apikeys');
  }) || pages[0];
  await stripePage.bringToFront();
  console.log('URL:', (stripePage.url() || '').substring(0, 100));

  // Close dialogs
  await stripePage.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.offsetParent !== null && b.textContent?.trim() === 'Cancel') b.click();
    });
  });
  await sleep(1500);

  // Find More options button and return a handle
  const moreBtnHandle = await stripePage.evaluateHandle(() => {
    const btns = document.querySelectorAll('button');
    for (const btn of btns) {
      if (btn.offsetParent !== null && btn.textContent?.trim() === 'More options') {
        const row = btn.closest('tr, [role="row"]');
        if (row && row.textContent?.includes('PrimeCV')) return btn;
      }
    }
    return null;
  });

  if (!moreBtnHandle || moreBtnHandle.asElement() === null) {
    console.log('More options not found');
    await browser.disconnect();
    return;
  }

  // Click via DOM events
  await stripePage.evaluate((btn) => {
    btn.scrollIntoView({ block: 'center' });
    btn.focus();
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    setTimeout(() => {
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, view: window }));
    }, 80);
  }, moreBtnHandle);
  await sleep(2000);

  moreBtnHandle.dispose();

  // Find Rotate key element handle
  const rotateHandle = await stripePage.evaluateHandle(() => {
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.offsetParent !== null && el.textContent?.trim() === 'Rotate key') {
        return el;
      }
    }
    return null;
  });

  console.log('Rotate handle:', rotateHandle.asElement() !== null);

  if (rotateHandle.asElement() === null) {
    // Menu might have closed, try to debug
    const visible = await stripePage.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="dialog"], [role="menu"]')).filter(d => d.offsetParent !== null).map(d => d.textContent?.substring(0, 300));
    });
    console.log('Visible dialogs/menus:', JSON.stringify(visible));
    await browser.disconnect();
    return;
  }

  // Click the Rotate key element via elementHandle.click()
  // This uses CDP to generate a trusted click
  console.log('Clicking Rotate key via elementHandle.click()...');
  await rotateHandle.click();
  await sleep(3500);
  rotateHandle.dispose();

  // Check state
  const state = await stripePage.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(d => d.offsetParent !== null).map(d => ({
      text: d.textContent?.substring(0, 500),
      inputs: Array.from(d.querySelectorAll('input')).filter(i => i.offsetParent !== null).map(i => ({ type: i.type, placeholder: i.placeholder })),
      buttons: Array.from(d.querySelectorAll('button')).filter(b => b.offsetParent !== null).map(b => b.textContent?.trim())
    }));
    return { dialogs };
  });
  console.log('State after Rotate click:', JSON.stringify(state, null, 2));

  await browser.disconnect();
})();
