// mi/dm — top-level engine: six Plaits drum voices (WebAssembly), then level, pan, mute/solo and the
// master (rush high-pass, volume, safety clip). process() allocates nothing. Parameters live in two
// flat Float32Arrays:
//   params  NUM_VOICES * NP  (voice blocks: the DSP's parameters, then level, trim, pan)
//   master  MP               (tempo, mixer, sequencer)

import { NUM_VOICES, NP, DSP_N, P, M, MUTE_STRIDE, defaultMaster } from './params.js';
import { kitToArray, INIT_KIT } from './kits.js';
import { PlaitsBank } from './plaits.js';
import { Svf, softclip } from './dsp.js';

const E_CTRL = 32; // control rate: gains, filters and DSP parameters update every 32 samples

export class Engine {
  // wasm: the compiled WebAssembly.Module of web/wasm/midm.wasm
  constructor(sr, wasm) {
    this.sr = sr;
    this.params = kitToArray(INIT_KIT);
    this.master = Float32Array.from(defaultMaster());
    this.bank = new PlaitsBank(wasm);
    this.sent = new Float32Array(NUM_VOICES * DSP_N).fill(NaN); // last value given to the DSP
    this.gL = new Float32Array(NUM_VOICES);
    this.gR = new Float32Array(NUM_VOICES);
    this.meter = new Float32Array(NUM_VOICES);
    this.hpL = new Svf();
    this.hpR = new Svf();
    this.hpOn = false;
    this.ctr = 0;
    this.peakL = 0;
    this.peakR = 0;
    this.gr = 0;
    this.anySolo = false;
    this.control();
  }

  setParam(v, i, x) {
    this.params[v * NP + i] = x;
  }
  setMaster(i, x) {
    this.master[i] = x;
  }

  // hand changed parameters of voice v to the DSP
  syncVoice(v) {
    const p = this.params;
    const sent = this.sent;
    const b = v * NP;
    const s = v * DSP_N;
    for (let i = 0; i < DSP_N; i++) {
      const x = p[b + i];
      if (x !== sent[s + i]) {
        sent[s + i] = x;
        this.bank.set(v, i, x);
      }
    }
  }

  // vel 0..1 (scales the accent), alt=1 for an open hat. Mutes act on notes, so tails ring on.
  trigger(v, vel = 1, alt = 0) {
    if (this.master[M.mute0 + v * MUTE_STRIDE] >= 0.5) return;
    this.syncVoice(v);
    this.bank.trigger(v, vel, alt);
  }

  control() {
    const p = this.params;
    const m = this.master;
    let solo = false;
    for (let v = 0; v < NUM_VOICES; v++) if (m[M.solo0 + v * MUTE_STRIDE] >= 0.5) solo = true;
    this.anySolo = solo;
    for (let v = 0; v < NUM_VOICES; v++) {
      this.syncVoice(v);
      const b = v * NP;
      let g = p[b + P.level] * Math.pow(10, p[b + P.trim] / 20);
      if (solo && m[M.solo0 + v * MUTE_STRIDE] < 0.5) g = 0;
      let pan = p[b + P.pan];
      pan = pan < -1 ? -1 : pan > 1 ? 1 : pan;
      const a = ((pan + 1) * Math.PI) / 4; // equal power
      this.gL[v] = g * Math.cos(a) * Math.SQRT2;
      this.gR[v] = g * Math.sin(a) * Math.SQRT2;
    }
    const hp = m[M.mHp];
    this.hpOn = hp > 21;
    if (this.hpOn) {
      this.hpL.set(hp, 0.1, this.sr);
      this.hpR.set(hp, 0.1, this.sr);
    }
  }

  // render n samples into outL/outR starting at offset
  process(outL, outR, n, off = 0) {
    const m = this.master;
    while (n > 0) {
      if (this.ctr === 0) this.control();
      let k = E_CTRL - this.ctr;
      if (k > n) k = n;
      this.ctr = (this.ctr + k) % E_CTRL;
      for (let i = 0; i < k; i++) outL[off + i] = outR[off + i] = 0;
      for (let v = 0; v < NUM_VOICES; v++) {
        const buf = this.bank.render(v, k);
        const gl = this.gL[v];
        const gr = this.gR[v];
        let mt = this.meter[v];
        for (let i = 0; i < k; i++) {
          const x = buf[i];
          outL[off + i] += x * gl;
          outR[off + i] += x * gr;
          const ax = Math.abs(x * (gl > gr ? gl : gr));
          mt = ax > mt ? ax : mt * 0.9995;
        }
        this.meter[v] = mt;
      }
      const mv = m[M.mVol];
      for (let i = 0; i < k; i++) {
        let l = outL[off + i];
        let r = outR[off + i];
        if (this.hpOn) {
          this.hpL.tick(l);
          this.hpR.tick(r);
          l = this.hpL.hp;
          r = this.hpR.hp;
        }
        l *= mv;
        r *= mv;
        // gentle safety: transparent below ~0.9
        if (l > 0.9 || l < -0.9) l = Math.sign(l) * (0.9 + 0.1 * softclip((Math.abs(l) - 0.9) * 10));
        if (r > 0.9 || r < -0.9) r = Math.sign(r) * (0.9 + 0.1 * softclip((Math.abs(r) - 0.9) * 10));
        outL[off + i] = l;
        outR[off + i] = r;
        const al = l < 0 ? -l : l;
        const ar = r < 0 ? -r : r;
        this.peakL = al > this.peakL ? al : this.peakL * 0.9998;
        this.peakR = ar > this.peakR ? ar : this.peakR * 0.9998;
      }
      off += k;
      n -= k;
    }
  }
}
