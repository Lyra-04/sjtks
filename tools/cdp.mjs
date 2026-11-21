import fs from 'node:fs';

const PORT = process.env.CDP_PORT || 9333;
const URL_TO_OPEN = process.argv[2] || 'file:///C:/Users/Ice/Documents/deepseek-harness/default-workspace/index.html';
const OUT = process.argv[3] || 'C:/Users/Ice/Documents/deepseek-harness/default-workspace/shot-cdp.png';
const EXPR = process.argv[4] || '';

const created = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(URL_TO_OPEN)}`, { method: 'PUT' })).json();
const ws = new WebSocket(created.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const events = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method) {
    events.push(msg);
    if (msg.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || '');
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE', msg.params.type, msg.params.args.map(a => a.value ?? a.description).join(' '));
    }
  }
});
await new Promise((r) => ws.addEventListener('open', r));
function send(method, params = {}) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((resolve) => pending.set(mid, resolve));
}
await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true });
await new Promise((r) => setTimeout(r, 2500));
if (EXPR) {
  const r = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true, awaitPromise: true });
  console.log('EVAL', JSON.stringify(r.result?.result?.value ?? r.result?.result ?? r.result, null, 2));
}
const shot = await send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'));
console.log('SCREENSHOT', OUT);
const info = await send('Runtime.evaluate', {
  expression: `JSON.stringify({title:document.title, w:innerWidth, h:innerHeight, bodyScrollW:document.body.scrollWidth, phone:document.getElementById('phone')?.getBoundingClientRect(), desktop:document.getElementById('desktop')?.getBoundingClientRect(), grid:document.querySelector('.desktop-grid')?.getBoundingClientRect(), card:document.querySelector('.quote-card')?.getBoundingClientRect(), pageScroll:document.querySelector('.page-scroll')?.getBoundingClientRect(), pages:document.querySelector('.desktop-pages')?.getBoundingClientRect(), err:window.__err||null})`,
  returnByValue: true
});
console.log('INFO', info.result?.result?.value);
ws.close();
process.exit(0);
