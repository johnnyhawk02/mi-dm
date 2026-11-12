// mi/dm — MSTR page: master clipper (with its transfer curve), volume, high-pass, output meters and credits.

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
  about.append(h('div', '', `<p style="font-size:19px;line-height:1.25">the drums are the bass drum, snare drum and hi-hat models from emilie gillet's plaits dsp (mit licence), the original c++ compiled to webassembly and run in an audio worklet at 48 khz. every argument each model's render function takes has its own knob on the voice page. the clipper is mi/dm's own c++ (mit), after the behaviour of jatin chowdhury's chow plugin, in the same webassembly.</p>`));
  page.append(buildClipper(), out, about);
  return page;
}
// master clipper: one polarity squashed above the threshold by the ratio (rectify holds it there)
function buildClipper() {
  const s = sect('clipper');
  s.head.append(h('span', 'sp'), toggle('m.clipOn', 'on', 'sm'), toggle('m.clipFlip', 'flip', 'sm'), toggle('m.clipRectify', 'rectify', 'sm'));
  const r = h('div', 'row');
  for (const k of ['m.clipThresh', 'm.clipRatio', 'm.clipInput', 'm.clipOutput', 'm.clipMix']) r.append(knob(k));
  // transfer curve: input -1..1 across, output up
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-1.1 -1.1 2.2 2.2');
  svg.style.cssText = 'width:100%;height:96px;overflow:visible';
  const axes = document.createElementNS(NS, 'path');
  axes.setAttribute('d', 'M-1 0H1M0 -1V1');
  axes.setAttribute('stroke', 'var(--mid)');
  axes.setAttribute('stroke-width', '0.02');
  const curve = document.createElementNS(NS, 'path');
  curve.setAttribute('fill', 'none');
  curve.setAttribute('stroke', 'var(--ink)');
  curve.setAttribute('stroke-width', '0.06');
  svg.append(axes, curve);
  const wrap = h('div');
  wrap.style.cssText = 'display:flex;align-items:center';
  wrap.append(svg);
  r.append(wrap);
  const draw = () => {
    const g = (id) => getG(NV_ + M[id]);
    const on = g('clipOn') >= 0.5;
    const th = Math.pow(10, g('clipThresh') / 20), slope = g('clipRectify') >= 0.5 ? 0 : 1 / g('clipRatio');
    const gi = Math.pow(10, g('clipInput') / 20), go = Math.pow(10, g('clipOutput') / 20), sg = g('clipFlip') >= 0.5 ? -1 : 1, wet = g('clipMix');
    let d = '';
    for (let i = 0; i <= 100; i++) {
      const x = -1 + i / 50;
      let y = x;
      if (on) {
        const xs = x * gi * sg;
        const c = xs <= th ? x * gi : sg * (th + (xs - th) * slope);
        y = (1 - wet) * x + wet * c * go;
      }
      d += (i ? 'L' : 'M') + x.toFixed(3) + ' ' + (-clamp(y, -1.1, 1.1)).toFixed(3);
    }
    curve.setAttribute('d', d);
    curve.setAttribute('opacity', on ? 1 : 0.35);
  };
  for (const id of ['clipOn', 'clipThresh', 'clipRatio', 'clipInput', 'clipOutput', 'clipFlip', 'clipRectify', 'clipMix']) watch('m.' + id, draw);
  draw();
  s.append(r, h('div', 'dim', '<span style="font-size:16px">squashes one half of the waveform above the threshold by the ratio; rectify cuts it flat; flip works on the other half. lopsided and buzzy, after the chow plugin.</span>'));
  return s;
}

function drawMasterMeters() {
  const st = S.status;
  if (mixMeters.length) for (let v = 0; v < 6; v++) mixMeters[v].set(st ? st.meters[v] : 0);
  if (!outL || !outL.isConnected) return;
  const db = (x) => (x > 1e-5 ? (20 * Math.log10(x) + 48) / 48 : 0);
  outL.set(st ? db(st.meters[6]) : 0);
  outR.set(st ? db(st.meters[7]) : 0);
}
