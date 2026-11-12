// mi/dm — starting kit: one of each Plaits drum model. Each voice lists only the values that
// differ from the parameter defaults.

import { PARAMS, P, NUM_VOICES, NP } from './params.js';

export const INIT_KIT = [
  // kick: analog bass drum
  { model: 0, abdFreq: 50, abdDecay: 0.55, abdTone: 0.45, level: 0.9 },
  // tom: synthetic bass drum, tuned up and shortened
  { model: 1, sbdFreq: 98, sbdDecay: 0.3, sbdTone: 0.6, sbdFmAmt: 0.55, sbdDirt: 0.2, level: 0.75, pan: -0.25 },
  // perc: synthetic snare, high and with little noise
  { model: 3, ssdFreq: 380, ssdFm: 0.3, ssdDecay: 0.3, ssdSnappy: 0.15, level: 0.7, pan: 0.3 },
  // snare: analog snare drum
  { model: 2, asdFreq: 190, asdTone: 0.5, asdDecay: 0.45, asdSnappy: 0.65, level: 0.8 },
  // cymbal: hi-hat 2 (ring-mod metal), long
  { model: 5, hh2Freq: 520, hh2Tone: 0.6, hh2Decay: 0.75, hh2Noise: 0.25, hh2Open: 0.85, level: 0.5, pan: 0.2 },
  // hihat: hi-hat 1 (square-wave metal), closed and open
  { model: 4, hh1Freq: 400, hh1Tone: 0.55, hh1Decay: 0.25, hh1Noise: 0.3, hh1Open: 0.65, level: 0.55, pan: -0.2 },
];

// expand a kit (array of partial objects) into a flat Float32Array NUM_VOICES*NP
export function kitToArray(kit, out = new Float32Array(NUM_VOICES * NP)) {
  for (let v = 0; v < NUM_VOICES; v++) {
    for (const p of PARAMS) out[v * NP + p.i] = p.def;
    const k = kit[v] || {};
    for (const id in k) if (id in P) out[v * NP + P[id]] = k[id];
  }
  return out;
}

export function arrayToKit(arr) {
  const kit = [];
  for (let v = 0; v < NUM_VOICES; v++) {
    const o = {};
    for (const p of PARAMS) {
      const x = arr[v * NP + p.i];
      if (Math.abs(x - p.def) > 1e-6) o[p.id] = +x.toPrecision(5);
    }
    kit.push(o);
  }
  return kit;
}
