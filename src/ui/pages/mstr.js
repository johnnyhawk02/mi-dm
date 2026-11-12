// mi/dm — MSTR page: master volume, high-pass, output meters and credits.

let outL = null;
let outR = null;
function hbar(n = 30) {
  const b = h('div');
  b.style.cssText = 'display:flex;gap:2px;height:14px;flex:1';
  b.innerHTML = '<i style="flex:1;background:var(--dim)"></i>'.repeat(n);
  const bars = b.querySelectorAll('i');
  b.set = (frac) => {
    const lit = Math.round(clamp(frac, 0, 1) * n);
    if (b.lit === lit) return;
    b.lit = lit;
    bars.forEach((x, i) => (x.style.background = i < lit ? 'var(--ink)' : 'var(--dim)'));
  };
  return b;
}
function buildMstr() {
  const page = h('div');
  page.style.display = 'contents';
  const out = sect('output');
  outL = hbar(36);
  outR = hbar(36);
  const meters = h('div');
  meters.style.cssText = 'display:flex;flex-direction:column;gap:6px;flex:4;justify-content:center;align-self:center;padding-left:12px';
  const l1 = h('div');
  l1.style.cssText = 'display:flex;gap:8px;align-items:center';
  l1.append(h('span', '', 'L'), outL);
  const l2 = h('div');
  l2.style.cssText = 'display:flex;gap:8px;align-items:center';
  l2.append(h('span', '', 'R'), outR);
  meters.append(l1, l2);
  const r = h('div', 'row');
  r.append(knob('m.mVol'), knob('m.mHp'), meters);
  out.append(r);
  const about = sect('about');
  about.append(h('div', '', `<p style="font-size:19px;line-height:1.25">the drums are the bass drum, snare drum and hi-hat models from emilie gillet's plaits dsp (mit licence), the original c++ compiled to webassembly and run in an audio worklet at 48 khz. every argument each model's render function takes has its own knob on the voice page.</p>`));
  page.append(out, about);
  return page;
}
function drawMasterMeters() {
  const st = S.status;
  if (mixMeters.length) for (let v = 0; v < 6; v++) mixMeters[v].set(st ? st.meters[v] : 0);
  if (!outL || !outL.isConnected) return;
  const db = (x) => (x > 1e-5 ? (20 * Math.log10(x) + 48) / 48 : 0);
  outL.set(st ? db(st.meters[6]) : 0);
  outR.set(st ? db(st.meters[7]) : 0);
}
