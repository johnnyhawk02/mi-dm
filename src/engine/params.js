// mi/dm — parameter spec.
// Every voice is one Plaits drum voice (see dsp/midm): the DSP's own parameters (dspparams.js, made
// from the C++ table: the model, accent, sustain and every Render argument of all six models), then
// the voice's mixer settings. Values are stored in real units; the UI maps knob position 0..1 <-> value
// via `curve`. One flat block per voice, so it maps 1:1 onto the C++ DrumVoice.

import { DSP_SPEC, MODEL_NAMES, CLIP_SPEC } from './dspparams.js';

export const NUM_VOICES = 6;
export const VOICE_NAMES = ['kick', 'tom', 'perc', 'snare', 'cymbal', 'hihat'];
export { MODEL_NAMES };
export const DSP_N = DSP_SPEC.length; // the first DSP_N parameters of a voice go to the DSP
export const HAT_MODELS = [4, 5]; // models with an open decay (open-hat steps)

// curve: 'lin' | 'exp' (min must be > 0) | 'int' (stepped) | 'bip' (bipolar lin)
// [id, min, max, default, curve, label, model]
const SPEC = [
  ...DSP_SPEC,
  // mixer
  ['level', 0, 1, 0.8, 'lin', 'level', -1],
  ['trim', -30, 12, 0, 'lin', 'auto trim', -1], // dB gain before the level fader, set by auto-level
  ['pan', -1, 1, 0, 'bip', 'pan', -1],
];

export const PARAMS = SPEC.map(([id, min, max, def, curve, label, model], i) => ({ id, i, min, max, def, curve, label, model }));
export const NP = PARAMS.length;
export const P = Object.fromEntries(PARAMS.map((p) => [p.id, p.i]));

export function toNorm(p, v) {
  if (p.curve === 'exp') return Math.log(v / p.min) / Math.log(p.max / p.min);
  return (v - p.min) / (p.max - p.min);
}
export function fromNorm(p, n) {
  n = n < 0 ? 0 : n > 1 ? 1 : n;
  if (p.curve === 'exp') return p.min * Math.pow(p.max / p.min, n);
  const v = p.min + n * (p.max - p.min);
  return p.curve === 'int' ? Math.round(v) : v;
}

export function defaultVoice() {
  return PARAMS.map((p) => p.def);
}

// ---- master block (one flat array, MP entries)
const MSPEC = [
  ['bpm', 40, 240, 120, 'lin', 'bpm'],
  // master high-pass (rush rises it)
  ['mHp', 20, 2000, 20, 'exp', 'hp'],
  ['mVol', 0, 1.5, 0.5, 'lin', 'master'],
  // master clipper (C++, in the wasm): clipOn, clipThresh, ... in the DSP's order
  ...CLIP_SPEC.map(([id, min, max, def, curve, label]) => ['clip' + id[0].toUpperCase() + id.slice(1), min, max, def, curve, label]),
  // mixer: per voice mute/solo
  ...[0, 1, 2, 3, 4, 5].flatMap((v) => [
    [`mute${v}`, 0, 1, 0, 'int', `mute ${v + 1}`],
    [`solo${v}`, 0, 1, 0, 'int', `solo ${v + 1}`],
  ]),
  // sequencer / groove / rush
  ['patLen', 1, 128, 16, 'int', 'length'],
  ['swType', 0, 3, 0, 'int', 'groove'],
  ['swDepth', 0, 1, 0, 'lin', 'swing'],
  ['accent', 0, 1, 0.5, 'lin', 'accent'],
  ['rushEvery', 0, 4, 0, 'int', 'rush'],
  ['rushLen', 1, 16, 4, 'int', 'rush len'],
  ['rushVoice', 0, 5, 3, 'int', 'rush drum'],
  ['rushRate', 2, 8, 4, 'int', 'rush rate'],
  ['rushHp', 20, 2000, 600, 'exp', 'rush hp'],
  ...Array.from({ length: 16 }, (_, i) => [`rc${i}`, 0, 1, i / 15, 'lin', `curve ${i + 1}`]),
];
export const CLIP_N = CLIP_SPEC.length; // M.clipOn + i is the clipper's parameter i
export const MUTE_STRIDE = 2; // M.mute0 + v * MUTE_STRIDE, M.solo0 + v * MUTE_STRIDE
export const GROOVES = ['swing 16', 'swing 8', 'shuffle', 'drunk'];
export const RUSH_EVERY = [0, 1, 2, 4, 8]; // bars
export const SPEEDS = [['1/16', 1], ['1/8', 2], ['1/4', 4], ['1/2', 8], ['1 bar', 16], ['2 bars', 32], ['4 bars', 64], ['8 bars', 128]];
export const MPARAMS = MSPEC.map(([id, min, max, def, curve, label], i) => ({ id, i, min, max, def, curve, label }));
export const MP = MPARAMS.length;
export const M = Object.fromEntries(MPARAMS.map((p) => [p.id, p.i]));
export function defaultMaster() {
  return MPARAMS.map((p) => p.def);
}
