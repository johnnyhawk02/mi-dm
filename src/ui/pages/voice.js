// mi/dm — VOICE page: drum picker (click auditions, shift-click a hat = open, right-click / long-press
// randomises that drum), the drum's model (one of the six Plaits drum models), every parameter that
// model's Render takes, and the drum's output.

let curVoice = 0;

function vkey(id) {
  return `v${curVoice}.${id}`;
}
// the parameter ids of one model, in the DSP's order
function modelParams(m) {
  return PARAMS.filter((p) => p.model === m).map((p) => p.id);
}
function voiceModel(v) {
  return Math.round(getG(v * NP + P.model));
}
function isHatVoice(v) {
  return HAT_MODELS.includes(voiceModel(v));
}

function buildVoice() {
  const page = h('div');
  page.style.display = 'contents';
  // drum picker
  const pick = h('div', 'subtabs');
  const pickB = SHORT.map((n, v) => {
    const b = btn(VOICE_NAMES[v], '', (e) => {
      setVoice(v);
      startAudio().then(() => post({ t: 'trig', v, vel: 1, alt: isHatVoice(v) && e.shiftKey ? 1 : 0 }));
    });
    // right-click (or long-press on a touch screen) randomises just this drum and plays it
    const rndThis = () => {
      setVoice(v);
      runRandomVoice(v);
      if (!S.playing) startAudio().then(() => post({ t: 'trig', v, vel: 1, alt: 0 }));
    };
    b.title = 'click: play · shift-click a hat: open · right-click or long-press: randomise this drum';
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!held) rndThis();
    });
    let holdT = 0, held = false;
    b.addEventListener('pointerdown', (e) => {
      held = false;
      if (e.pointerType === 'mouse') return;
      holdT = setTimeout(() => { held = true; rndThis(); }, 550);
    });
    const cancel = () => clearTimeout(holdT);
    b.addEventListener('pointerup', cancel);
    b.addEventListener('pointerleave', cancel);
    b.addEventListener('pointercancel', cancel);
    b.addEventListener('click', (e) => { if (held) { e.stopImmediatePropagation(); held = false; } }, true);
    pick.append(b);
    return b;
  });

  // model picker: picking one also plays it
  const modelSect = sect('model');
  const modelRow = h('div', 'subtabs');
  const modelB = MODEL_NAMES.map((name, m) => {
    const b = btn(name, 'sm', () => {
      setG(curVoice * NP + P.model, m);
      if (S.opts.autoLevel) { autoLevel([0, 1, 2, 3, 4, 5].map((i) => i === curVoice)); sendAll(); }
      startAudio().then(() => post({ t: 'trig', v: curVoice, vel: 1, alt: 0 }));
    });
    modelRow.append(b);
    return b;
  });
  modelSect.append(modelRow);

  const body = h('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '12px';
  page.append(pick, modelSect, body);

  function draw() {
    const m = voiceModel(curVoice);
    pickB.forEach((b, v) => b.classList.toggle('on', v === curVoice));
    modelB.forEach((b, i) => b.classList.toggle('on', i === m));
    body.innerHTML = '';
    const ids = modelParams(m);
    const s = sect(`${MODEL_NAMES[m]} · render parameters`);
    // six columns per row, like every other page
    for (let i = 0; i < ids.length; i += 6) s.append(krow(ids.slice(i, i + 6).map(vkey)));
    const hit = sect('hit · output', krow(['accent', 'sustain', 'level', 'trim', 'pan'].map(vkey)));
    const note = h('div', 'dim', `<span style="font-size:16px">${MODEL_HELP[m]}</span>`);
    body.append(s, hit, note);
  }
  function setVoice(v) {
    curVoice = v;
    draw();
  }
  for (let v = 0; v < 6; v++) watch(`v${v}.model`, () => v === curVoice && draw());
  page.setVoice = setVoice;
  voicePage = page;
  draw();
  return page;
}
// one line on each model, under its knobs
const MODEL_HELP = [
  '808-style bridged-T resonator. attack fm and self fm bend the pitch on the hit and as it rings; drive is the bass drum engine\'s overdrive.',
  'sine body through a transistor-style vca, with a click and noise transient. fm amount and fm decay set the pitch drop; dirtiness adds phase noise.',
  '808-style snare: resonators for the body, filtered noise for the snare wires. snappy sets the noise.',
  'sine body with fm, plus noise through a band-pass. fm amount bends the body; snappy sets the noise.',
  '808-style hat: six square waves into a resonant band-pass and a swing vca. noisiness blends in clocked noise. open hits use open decay.',
  'ring-modulated square and saw pairs, linear vca, two-stage envelope. noisiness blends in clocked noise. open hits use open decay.',
];
let voicePage = null;
// shift+1..6 jumps here
function showVoice(v) {
  showPage('voice');
  if (voicePage) voicePage.setVoice(v);
}
