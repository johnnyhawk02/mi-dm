// Playwright smoke test: serve dist/, load the page, play a beat with all six drum models (every
// drum's meter must move), play every built-in preset, check the output
// meters show sound that isn't clipping, and no page errors. Also writes screenshots.
//   node build.mjs && node test/smoke.mjs [shots-dir]
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const dist = new URL('../dist/', import.meta.url);
const types = { html: 'text/html', js: 'text/javascript', json: 'application/json', webmanifest: 'application/manifest+json', svg: 'image/svg+xml', png: 'image/png' };
const srv = createServer((req, res) => {
  const f = new URL('.' + (req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]), dist);
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[f.pathname.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const url = `http://localhost:${srv.address().port}/`;
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let fail = 0;
const errors = [];
for (const [w, hgt] of [[1440, 900], [1280, 800]]) {
  const p = await b.newPage({ viewport: { width: w, height: hgt } });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.__midm);
  await p.waitForTimeout(300);
  // nothing scrolls: the stage fits the window
  const fits = await p.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && document.documentElement.scrollHeight <= innerHeight; });
  console.log(`${fits ? 'ok  ' : 'FAIL'} ${w}x${hgt} fits without scrolling`);
  if (!fits) fail++;
  if (w === 1440) {
    await p.click('#play');
    await p.waitForFunction(() => window.__midm.S.status && window.__midm.S.status.playing, null, { timeout: 10000 });
    // a beat with all six drum models: each drum on its own model, every drum's meter must move
    const r6 = await p.evaluate(() => new Promise((res) => {
      const f = window.__midm, MODELS = [0, 1, 3, 2, 5, 4];
      MODELS.forEach((m, v) => f.setG(v * f.NP + f.P.model, m));
      // a fixed 16-step beat in which every drum plays
      const rows = ['9...9...9...9...', '..........9...9.', '.9.....9.....9..', '....9.......9...', '9.......9.......', '9.9.9.9.9.9.9.9.'];
      f.S.vel.fill(0); f.S.flag.fill(0);
      rows.forEach((r, v) => [...r].forEach((c, k) => { if (c !== '.') f.S.vel[v * f.MAX_STEPS + k] = 110; }));
      f.sendPattern(false);
      const pk = [0, 0, 0, 0, 0, 0]; const t0 = performance.now();
      const tick = () => { const st = f.S.status; if (st) for (let v = 0; v < 6; v++) pk[v] = Math.max(pk[v], st.meters[v]);
        if (performance.now() - t0 > 4000) res({ pk, models: MODELS.map((m) => f.MODEL_NAMES[m]) }); else requestAnimationFrame(tick); };
      tick();
    }));
    r6.pk.forEach((x, v) => {
      const ok = x > 0.01;
      if (!ok) fail++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} drum ${v + 1} (${r6.models[v]}) plays in the beat, meter peak ${x.toFixed(3)}`);
    });
    if (shots) await p.screenshot({ path: `${shots}/playing-${w}x${hgt}.png` });
    const n = await p.evaluate(() => window.__midm.BUILTIN_PRESETS.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((i) => { const f = window.__midm; f.S.playing = false; f.applyPreset(f.BUILTIN_PRESETS[i]); f.S.playing = true; }, i);
      // track the loudest master peak over ~2 s
      const r = await p.evaluate(() => new Promise((res) => {
        let pk = 0; const t0 = performance.now();
        const tick = () => { const st = window.__midm.S.status; if (st) pk = Math.max(pk, st.meters[6], st.meters[7]);
          if (performance.now() - t0 > 2000) res(pk); else requestAnimationFrame(tick); };
        tick();
      }));
      const name = await p.evaluate((i) => window.__midm.BUILTIN_PRESETS[i].name, i);
      const ok = r > 0.05 && r < 0.99;
      if (!ok) fail++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} preset ${name.padEnd(16)} peak ${r.toFixed(3)}`);
    }
  }
  if (shots) for (const pg of ['beat', 'voice', 'mix', 'mstr', 'prst']) {
    await p.evaluate((pg) => window.__midm.showPage(pg), pg);
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${shots}/${pg}-${w}x${hgt}.png` });
  }
  await p.close();
}
if (errors.length) { fail++; console.log('FAIL page errors:\n' + errors.join('\n')); }
await b.close();
srv.close();
process.exit(fail ? 1 : 0);
