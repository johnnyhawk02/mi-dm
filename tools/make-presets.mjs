// Makes presets/factory.json: built-in presets for mi/dm, from the starting kit with seeded variations
// and some model swaps.
//   node tools/make-presets.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { PARAMS, MPARAMS, NP, P, toNorm, fromNorm, defaultMaster } from '../src/engine/params.js';
import { INIT_KIT, kitToArray } from '../src/engine/kits.js';
import { generate } from '../src/seq/patterngen.js';
import { MAX_STEPS } from '../src/seq/sequencer.js';
import { Rng } from '../src/engine/dsp.js';

const r4 = (x) => +x.toPrecision(5);
// perf knobs follow each preset's models: each drum's frequency and decay, then the rest
const perfFor = (models) => {
  const pick = (v, suffix) => {
    const p = PARAMS.find((q) => q.model === models[v] && q.id.endsWith(suffix));
    return p ? `v${v}.${p.id}` : `v${v}.accent`;
  };
  return ['m.bpm', 'm.swDepth', 'm.accent', 'gen.energy',
    pick(0, 'Freq'), pick(0, 'Decay'), pick(0, 'Tone'), pick(0, 'Fm'),
    pick(1, 'Freq'), pick(1, 'Decay'), pick(2, 'Freq'), pick(2, 'Decay'),
    pick(3, 'Freq'), pick(3, 'Decay'), pick(3, 'Snappy'), pick(3, 'Tone'),
    pick(4, 'Freq'), pick(4, 'Decay'), pick(5, 'Decay'), pick(5, 'Open'),
    pick(5, 'Tone'), pick(5, 'Noise'), 'v3.accent', 'm.mHp'];
};

// name, genre, bpm, beat, energy, fills, spread, models (null keeps the kit's), voice overrides, master overrides
const DEFS = [
  ['zorlix vexum', 'techno', 132, 0, 0.6, 0.3, 0.12, null, { 0: { abdDecay: 0.65, abdDrive: 0.3 } }, { swDepth: 0 }],
  ['quanak floop', 'house', 124, 1, 0.5, 0.3, 0.12, null, { 5: { hh1Decay: 0.35 } }, { swType: 0, swDepth: 0.35 }],
  ['mibron saa', 'electro', 118, 0, 0.7, 0.4, 0.18, [1, 0, 3, 3, 5, 4], { 0: { sbdFreq: 46, sbdDecay: 0.75, sbdFmAmt: 1, sbdFmDec: 0.5 }, 3: { ssdFreq: 210, ssdSnappy: 0.7 } }, {}],
  ['krydok ixa', 'breaks', 136, 1, 0.65, 0.5, 0.16, null, { 3: { asdDecay: 0.55, asdSnappy: 0.75 } }, { swType: 1, swDepth: 0.25 }],
  ['oonsel trumph', 'dnb', 172, 0, 0.7, 0.5, 0.14, null, { 3: { asdFreq: 230 } }, { rushEvery: 2, rushLen: 6, rushVoice: 3, rushRate: 4 }],
  ['flavi gaaro', 'hiphop', 90, 1, 0.45, 0.25, 0.18, [1, 1, 2, 2, 4, 5], { 0: { sbdFreq: 44, sbdDecay: 0.85, sbdDirt: 0.5 }, 1: { sbdFreq: 130 }, 2: { asdFreq: 420, asdSnappy: 0.2 } }, { swType: 2, swDepth: 0.55 }],
  ['griek pazee', 'garage', 132, 0, 0.55, 0.3, 0.14, null, { 4: { hh2Decay: 0.6 } }, { swType: 0, swDepth: 0.6 }],
  ['xutub lumek', 'minimal', 126, 1, 0.4, 0.2, 0.22, [0, 3, 3, 2, 5, 5], { 1: { ssdFreq: 150, ssdFm: 0.7, ssdSnappy: 0.1 } }, {}],
  ['draron pekfo', 'techno', 140, 1, 0.8, 0.6, 0.25, null, { 0: { abdDrive: 0.45, abdAtkFm: 1, abdSelfFm: 0.6, level: 0.6 } }, { rushEvery: 1, rushLen: 4, rushVoice: 5, rushRate: 6, mVol: 0.4 }],
  ['yelvi spuquo', 'electro', 110, 1, 0.5, 0.35, 0.2, [0, 1, 4, 3, 5, 4], { 2: { hh1Freq: 900, hh1Decay: 0.15 } }, {}],
  ['spuzz ronek', 'house', 122, 0, 0.55, 0.25, 0.16, [1, 0, 2, 2, 5, 4], { 0: { sbdFreq: 52, sbdDecay: 0.6 }, 1: { abdFreq: 110, abdDecay: 0.35 }, 2: { asdFreq: 520, asdSnappy: 0.15 } }, { swType: 0, swDepth: 0.2 }],
  ['tromor aaga', 'breaks', 98, 0, 0.6, 0.45, 0.2, null, { 3: { asdTone: 0.75, asdSnappy: 0.85 }, 5: { hh1Noise: 0.6 } }, { swType: 2, swDepth: 0.35 }],
];

const presets = DEFS.map(([name, genre, bpm, beat, energy, fills, spread, models, vo, mo], n) => {
  const rng = new Rng(1000 + n * 77);
  const arr = kitToArray(INIT_KIT);
  if (models) models.forEach((m, v) => (arr[v * NP + P.model] = m));
  const voices = [];
  for (let v = 0; v < 6; v++) {
    const m = arr[v * NP + P.model];
    const o = {};
    for (const p of PARAMS) {
      let x = arr[v * NP + p.i];
      // spread the drum's own model parameters a little (frequency less)
      if (p.model === m && p.curve !== 'int') {
        const span = /Freq$/.test(p.id) ? spread * 0.35 : spread;
        x = fromNorm(p, Math.min(1, Math.max(0, toNorm(p, x) + rng.bi() * span)));
      }
      o[p.id] = r4(x);
    }
    Object.assign(o, vo[v] || {});
    voices.push(o);
  }
  const md = defaultMaster();
  const master = {};
  MPARAMS.forEach((p, i) => (master[p.id] = md[i]));
  Object.assign(master, { bpm }, mo);
  const g = generate({ genre, beat, energy, fills, accent: master.accent, len: 16, seed: n + 1 });
  const pat = [];
  for (let t = 0; t < 6; t++) {
    const row = [];
    for (let k = 0; k < MAX_STEPS; k++) { const i = t * MAX_STEPS + k; row.push(g.vel[i] ? g.vel[i] + g.flag[i] * 128 : 0); }
    while (row.length && !row[row.length - 1]) row.pop();
    pat.push(row);
  }
  const vm = voices.map((o) => o.model);
  const lanes = [];
  const decay = PARAMS.find((p) => p.model === vm[5] && /Decay$/.test(p.id));
  if (n % 2 === 0) lanes.push({ key: `v5.${decay.id}`, steps: [0, 0.3, -0.2, 0.6, 0, 0.2, -0.3, 0.9, 0, 0.3, -0.2, 0.5, 0, 0.1, -0.4, 1], len: 16, slew: 0, speed: 0, depth: 0.3, groove: true });
  const tone = PARAMS.find((p) => p.model === vm[3] && /(Tone|Snappy)$/.test(p.id));
  if (n % 3 === 0) lanes.push({ key: `v3.${tone.id}`, steps: Array.from({ length: 16 }, (_, i) => r4(Math.sin((i / 16) * Math.PI * 2))), len: 16, slew: 0.5, speed: 2, depth: 0.25, groove: true });
  return { v: 1, name, ts: 0, voices, master, pat, lanes, gen: { genre, beat, energy, fills, density: [1, 1, 1, 1, 1, 1], seed: n + 1 }, perf: perfFor(vm) };
});
mkdirSync(new URL('../presets/', import.meta.url), { recursive: true });
writeFileSync(new URL('../presets/factory.json', import.meta.url), JSON.stringify({ app: 'mi/dm', v: 1, presets }, null, 0));
console.log(`presets/factory.json: ${presets.length} presets`);
