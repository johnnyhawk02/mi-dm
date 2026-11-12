// mi/dm — mutes: a column per drum with its model, a meter that doubles as the level fader, and the
// drum's mute. Mutes act on notes, so tails ring on.

const MUTE_KEYS = ['z', 'x', 'c', 'v', 'b', 'n'];
const muteMeters = [];

function buildMutes() {
  const el = $('mutes');
  el.innerHTML = '';
  const head = h('h3', '', '<span>model · level</span>');
  head.append(btn('clear', 'sm', () => {
    for (let v = 0; v < 6; v++) for (const k of ['mute', 'solo']) setG(NV_ + M[k + v], 0);
  }));
  const cols = h('div', 'cols');
  for (let v = 0; v < 6; v++) {
    const col = h('div', 'mcol');
    // the drum's model: click to step through the six, right-click to step back
    const mdl = h('button', 'mdl');
    mdl.type = 'button';
    mdl.title = 'model: click for the next, right-click for the previous';
    const gm = v * NP + P.model;
    const stepModel = (d) => {
      setG(gm, (Math.round(getG(gm)) + d + MODEL_NAMES.length) % MODEL_NAMES.length);
      if (S.opts.autoLevel) { autoLevel([0, 1, 2, 3, 4, 5].map((i) => i === v)); sendAll(); }
    };
    mdl.addEventListener('click', () => stepModel(1));
    mdl.addEventListener('contextmenu', (e) => { e.preventDefault(); stepModel(-1); });
    const drawM = () => (mdl.innerHTML = MODEL_NAMES[Math.round(getG(gm))].replace(' ', '<br>'));
    watch(`v${v}.model`, drawM);
    drawM();
    col.append(mdl);
    const meter = meterEl(26);
    muteMeters.push(meter);
    // the meter doubles as the level fader: click or drag anywhere on it, the handle shows the level
    const wrap = h('div', 'lvlfader');
    const knobH = h('i', 'handle');
    wrap.append(meter, knobH);
    col.append(wrap);
    const lvl = h('div', 'lvl');
    const lk = `v${v}.level`;
    const lm_ = model(lk);
    const drawL = () => {
      lvl.textContent = Math.round(getG(lm_.g) * 100);
      knobH.style.bottom = `calc(${lm_.get() * 100}% - 2px)`;
      wrap.classList.toggle('sel', S.sel === lk);
    };
    watch(lk, drawL);
    drawL();
    levelDrag(wrap, lm_);
    bindDrag(lvl, () => model(lk));
    lvl.style.cursor = 'ns-resize';
    const mk = `m.mute${v}`;
    const mb = toggle(mk, SHORT[v]);
    watch(mk, () => col.classList.toggle('quiet', getG(keyG(mk)) >= 0.5));
    col.append(lvl, mb, h('div', 'key', MUTE_KEYS[v]));
    cols.append(col);
  }
  el.append(head, cols);
}
function levelDrag(el, m) {
  const at = (e) => {
    if (!e.buttons) return;
    const r = el.getBoundingClientRect();
    m.set(clamp(1 - (e.clientY - r.top) / r.height, 0, 1));
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    select(m.key);
    el.setPointerCapture(e.pointerId);
    at(e);
    const up = () => {
      el.removeEventListener('pointermove', at);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('lostpointercapture', up);
    };
    el.addEventListener('pointermove', at);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  });
  el.addEventListener('dblclick', () => m.set(m.def));
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (S.sel !== m.key) return;
    m.set(clamp(m.get() - Math.sign(e.deltaY) * 0.02, 0, 1));
  }, { passive: false });
}
function drawMeters() {
  const st = S.status;
  for (let v = 0; v < 6; v++) muteMeters[v].set(st ? st.meters[v] : 0);
}
