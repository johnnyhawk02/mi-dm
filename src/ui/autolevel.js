// mi/dm — auto-level after a randomise. Each drum is played once offline (its own instance of the
// drum DSP), its loudness is measured the way ears hear it, and its level is set so the
// kit sits at a sensible balance. Piercing highs count extra, so harsh hats and cymbals come down.

const AL_SR = 48000;
const AL_LEN = Math.round(AL_SR * 0.5);
// loudness target per drum, in dB relative to the kick
// (the faders still do the mix; this only evens out how loud each sound is before them)
const AL_OFFSET = [0, 0, 0, 0, -3, -3];
let alRef = null; // the kick of the starting kit, measured once: the loudness everything aims at

// short-term ear-weighted loudness (dB) and peak of one hit at level 1
let alBank = null;
function measureHit(block) {
  if (!alBank) alBank = new PlaitsBank(WASM_MOD);
  alBank.reset();
  for (let i = 0; i < DSP_N; i++) alBank.set(0, i, block[i]);
  alBank.trigger(0, 1, 0);
  // ear weighting: cut the lows below ~60 Hz, add the presence region (2-5 kHz, where treble hurts)
  // and the top (above 8 kHz) on top of the full signal
  const hp = new Svf(); hp.set(60, 0, AL_SR);
  const pres = new Svf(); pres.set(3500, 0.35, AL_SR);
  const air = new Svf(); air.set(8000, 0, AL_SR);
  const W = Math.round(AL_SR * 0.05); // 50 ms windows
  let acc = 0, n = 0, best = 0, peak = 0;
  for (let i0 = 0; i0 < AL_LEN; i0 += 128) {
    const k = Math.min(128, AL_LEN - i0);
    const buf = alBank.render(0, k);
    for (let i = 0; i < k; i++) {
      const x = buf[i];
      const ax = Math.abs(x);
      if (ax > peak) peak = ax;
      hp.tick(x);
      const y = hp.hp;
      pres.tick(y);
      air.tick(y);
      const w = y + pres.bp * 1.0 + air.hp * 0.7;
      acc += w * w;
      if (++n === W) {
        if (acc / W > best) best = acc / W;
        acc = 0;
        n = 0;
      }
    }
  }
  return { db: 10 * Math.log10(best + 1e-12), peak };
}

function autoLevelRef() {
  if (alRef === null) {
    const k = kitToArray(INIT_KIT);
    const m = measureHit(k.subarray(0, NP));
    alRef = m.db;
  }
  return alRef;
}

// the largest and smallest offset (normalised) a knob sequence puts on its knob
function laneRange(ln) {
  let lo = 0, hi = 0;
  for (let i = 0; i < ln.len; i++) {
    const o = ln.steps[i] * ln.depth;
    if (o < lo) lo = o;
    if (o > hi) hi = o;
  }
  return [lo, hi];
}
// sets each drum's trim (gain before its fader) for the drums marked in `only` (all six if left out);
// the faders are never touched. Knob sequences count too: each drum is measured as it is, and with
// every sequence on it pushed to its highs, and to its lows, and the loudest of those is used.
function autoLevel(only) {
  const ref = autoLevelRef();
  for (let v = 0; v < 6; v++) {
    if (only && !only[v]) continue;
    const variants = [];
    for (const side of [-1, 0, 1]) {
      const block = S.base.slice(v * NP, v * NP + NP);
      let moved = side === 0;
      for (const ln of S.lanes) {
        if (!ln || side === 0) continue;
        if (ln.g >= v * NP && ln.g < v * NP + NP) {
          const off = laneRange(ln)[side < 0 ? 0 : 1];
          block[ln.g - v * NP] = denorm(ln.g, norm(ln.g, S.base[ln.g]) + off);
          moved = true;
        }
      }
      if (moved) variants.push(measureHit(block));
    }
    let db = -Infinity, peak = 0;
    for (const m of variants) { if (m.db > db) db = m.db; if (m.peak > peak) peak = m.peak; }
    if (peak < 1e-4) continue; // silent voice: leave it
    let g = Math.pow(10, (ref + AL_OFFSET[v] - db) / 20);
    if (g * peak > 0.9) g = 0.9 / peak; // hard ceiling per drum
    const p = PARAMS[P.trim];
    S.base[v * NP + P.trim] = clamp(20 * Math.log10(g), p.min, p.max);
  }
}

function clearTrims() {
  for (let v = 0; v < 6; v++) S.base[v * NP + P.trim] = 0;
}
