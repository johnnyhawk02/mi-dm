// Node test: render every drum model (closed and open for the hats), check not silent, not clipping,
// finite and deterministic; every Render argument of every model has a parameter that changes the
// sound; then a beat with all six models.
import { Engine } from '../src/engine/engine.js';
import { PARAMS, P, M, NP, MODEL_NAMES, HAT_MODELS } from '../src/engine/params.js';
import { WASM } from './wasm.mjs';
import { writeWav } from './wav.mjs';
import { mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SR = 48000;
const outDir = process.argv[2];
if (outDir) mkdirSync(outDir, { recursive: true });
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fail++; };

// one hit of `model` on voice 0, centred, level 1, trim 0
function hit(model, alt = 0, set = {}, secs = 1.5) {
  const e = new Engine(SR, WASM);
  const sp = (k, x) => (e.params[P[k]] = x);
  sp('model', model); sp('level', 1); sp('trim', 0); sp('pan', 0);
  for (const k in set) sp(k, set[k]);
  for (let v = 1; v < 6; v++) e.params[v * NP + P.level] = 0;
  e.master[M.mVol] = 1;
  const n = SR * secs, L = new Float32Array(n), R = new Float32Array(n);
  e.trigger(0, 1, alt);
  e.process(L, R, n);
  return { L, R };
}
const stats = (L) => { let pk = 0, ss = 0; for (const x of L) { pk = Math.max(pk, Math.abs(x)); ss += x * x; } return { pk, rms: Math.sqrt(ss / L.length) }; };
const hash = (a) => createHash('sha1').update(Buffer.from(a.buffer)).digest('hex').slice(0, 10);

for (let m = 0; m < MODEL_NAMES.length; m++) {
  for (const alt of HAT_MODELS.includes(m) ? [0, 1] : [0]) {
    const { L, R } = hit(m, alt);
    const s = stats(L), name = MODEL_NAMES[m] + (alt ? ' open' : '');
    const det = hash(L) === hash(hit(m, alt).L);
    check(s.pk > 0.05 && s.pk < 1 && det && L.every(Number.isFinite), `${name.padEnd(14)} peak ${s.pk.toFixed(3)} rms ${s.rms.toFixed(4)} det ${det}`);
    if (outDir) writeWav(`${outDir}/${name.replace(/ /g, '-')}.wav`, L, R, SR);
  }
}

// every model parameter does something: min and max sound different
for (const p of PARAMS.filter((q) => q.model >= 0)) {
  const alt = /Open$/.test(p.id) ? 1 : 0; // open decay plays on open hits
  const a = hit(p.model, alt, { [p.id]: p.min }, 0.5).L, b = hit(p.model, alt, { [p.id]: p.max }, 0.5).L;
  let d = 0; for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - b[i]));
  check(d > 1e-3, `${MODEL_NAMES[p.model].padEnd(10)} ${p.label.padEnd(10)} (${p.id}) changes the sound`);
}
// sustain: free-running, still sounding after a second
{
  const { L } = hit(0, 0, { sustain: 1 }, 1.5);
  check(stats(L.subarray(SR)).rms > 1e-3, 'sustain: analog bd keeps sounding');
}

// beat: 2 bars at 120 bpm with the starting kit (one of each model), then 2 s of tail
function beat() {
  const e = new Engine(SR, WASM), step = SR * 60 / 120 / 4, n = step * 32 + SR * 2;
  const models = new Set([0, 1, 2, 3, 4, 5].map((v) => e.params[v * NP + P.model]));
  const L = new Float32Array(n), R = new Float32Array(n);
  const pat = [[0, [0, 6, 10, 16, 22, 26]], [3, [4, 12, 20, 28]], [5, [0, 2, 4, 6, 8, 10, 12, 16, 18, 20, 22, 24, 26, 28]],
    [1, [14, 30]], [2, [11, 27]], [4, [0]]];
  const ev = []; for (const [v, steps] of pat) for (const s of steps) ev.push([s * step, v]);
  ev.push([14 * step, 5, 1]); ev.push([30 * step, 5, 1]);
  ev.sort((a, b) => a[0] - b[0]);
  let pos = 0;
  for (const [t, v, alt] of ev) { e.process(L, R, t - pos, pos); pos = t; e.trigger(v, 0.85 + 0.15 * ((t / step) % 4 === 0), alt || 0); }
  e.process(L, R, n - pos, pos);
  return { L, R, models };
}
{
  const { L, R, models } = beat();
  const s = stats(L), tail = stats(L.subarray(L.length - 4800));
  check(models.size === 6 && s.pk < 0.95 && s.pk > 0.1 && L.every(Number.isFinite) && R.every(Number.isFinite) && tail.pk < 0.05,
    `beat with ${models.size} models: peak ${s.pk.toFixed(3)} rms ${s.rms.toFixed(4)} tail ${tail.pk.toFixed(4)}`);
  if (outDir) writeWav(`${outDir}/beat.wav`, L, R, SR);
}
// speed
{
  const e = new Engine(SR, WASM), n = SR * 10, L = new Float32Array(n), R = new Float32Array(n);
  const t0 = performance.now();
  for (let i = 0; i < n; i += 4800) { for (let v = 0; v < 6; v++) e.trigger(v, 1); e.process(L, R, 4800, i); }
  console.log(`speed: 10 s, all voices busy, in ${(performance.now() - t0).toFixed(0)} ms`);
}
process.exit(fail ? 1 : 0);
