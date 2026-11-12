// mi/dm — the drum DSP: Plaits' drum models (dsp/, C++) compiled to WebAssembly (web/wasm/midm.wasm).
// One PlaitsBank is one instance of the module: six drum voices with their own state. The worklet
// plays one; the page keeps another for measuring (auto-level). No allocation after construction.

export class PlaitsBank {
  constructor(module) {
    const inst = new WebAssembly.Instance(module, {});
    const x = (this.x = inst.exports);
    if (x._initialize) x._initialize(); // static constructors
    x.md_init();
    this.voices = x.md_voice_count();
    this.max = x.md_max_render();
    this.buf = new Float32Array(x.memory.buffer, x.md_render(0, 0), this.max); // memory never grows
    this.mL = new Float32Array(x.memory.buffer, x.md_master_left(), this.max);
    this.mR = new Float32Array(x.memory.buffer, x.md_master_right(), this.max);
  }
  // master clipper: write the mix into mL/mR, clip(n) processes it in place
  clipSet(i, val) {
    this.x.md_clip_set(i, val);
  }
  clip(n) {
    this.x.md_clip(n);
  }
  // every voice back to its defaults, silent
  reset() {
    this.x.md_init();
  }
  set(v, i, val) {
    this.x.md_set(v, i, val);
  }
  trigger(v, vel, open) {
    this.x.md_trigger(v, vel, open ? 1 : 0);
  }
  // renders n (<= this.max) samples of voice v into this.buf
  render(v, n) {
    this.x.md_render(v, n);
    return this.buf;
  }
}

// the DSP's own parameter tables: drums [id, min, max, default, curve, label, model], the model names,
// and the master clipper [id, min, max, default, curve, label]
export function readSpec(module) {
  const inst = new WebAssembly.Instance(module, {});
  const x = inst.exports;
  if (x._initialize) x._initialize();
  const u8 = new Uint8Array(x.memory.buffer);
  const str = (p) => { let s = ''; while (u8[p]) s += String.fromCharCode(u8[p++]); return s; };
  const TAPER = ['lin', 'exp', 'int'];
  const params = [];
  for (let i = 0; i < x.md_param_count(); i++)
    params.push([str(x.md_param_id(i)), x.md_param_min(i), x.md_param_max(i), +x.md_param_def(i).toPrecision(6), TAPER[x.md_param_taper(i)], str(x.md_param_label(i)), x.md_param_model(i)]);
  const models = [];
  for (let i = 0; i < x.md_model_count(); i++) models.push(str(x.md_model_name(i)));
  const clip = [];
  for (let i = 0; i < x.md_clip_param_count(); i++)
    clip.push([str(x.md_clip_param_id(i)), x.md_clip_param_min(i), x.md_clip_param_max(i), +x.md_clip_param_def(i).toPrecision(6), TAPER[x.md_clip_param_taper(i)], str(x.md_clip_param_label(i))]);
  return { params, models, clip };
}
