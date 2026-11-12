# mi/dm

mi/dm is a six-voice drum machine for the browser. Each drum is one of six drum models (analog and
synthetic bass drum, analog and synthetic snare drum, two hi-hats), and every parameter those models
take has its own knob.

**Play it: https://johnnyhawk02.github.io/mi-dm/**

It keeps the sequencer, mixer, presets, page layout and controls of
[fm/dm](https://github.com/johnnyhawk02/fm-drum-machine); the FM engines, effects and visualiser are
gone, and the drums are now the original Plaits C++ compiled to WebAssembly, running in an
AudioWorklet.

## The drums

The sound is Emilie Gillet's drum DSP from Plaits
(https://github.com/pichenettes/eurorack/tree/master/plaits, MIT licence), unchanged. The hardware
module drives these models from three knobs; here each argument of each model's `Render()` is its
own control:

| model | parameters |
|---|---|
| analog bd | freq, tone, decay, attack fm, self fm, drive (the bass drum engine's overdrive) |
| synth bd | freq, tone, decay, dirtiness, fm amount, fm decay |
| analog sd | freq, tone, decay, snappy |
| synth sd | freq, fm amount, decay, snappy |
| hihat 1 | freq, tone, decay, noisiness, open decay |
| hihat 2 | freq, tone, decay, noisiness, open decay |

Every model also takes accent (scaled by each hit's velocity) and sustain (a free-running tone with
no envelope). Open decay is the decay an open-hat step uses. Pick a drum's model on the voice page,
or click the model box above its level.

## Master clipper

The mstr page has a master-bus clipper: it squashes one half of the waveform above a threshold by a
ratio (rectify cuts it flat, flip works on the other half), with input, output and mix, and a curve
that shows what it does. It is mi/dm's own C++ (`dsp/midm/master_clipper.*`, MIT), written after the
behaviour of Jatin Chowdhury's [CHOW](https://github.com/Chowdhury-DSP/CHOW) distortion plugin. It
contains none of CHOW's code, which is GPL-3.0. It is compiled into the same WebAssembly as the drums.

## Layout

- `dsp/`: the drum DSP, plain C++ with no browser or Emscripten code (see `dsp/README.md`).
  `dsp/plaits` and `dsp/stmlib` are the needed Plaits and stmlib files, unchanged, with their licence;
  `dsp/midm/drum_voice.*` is the small wrapper (trigger, set parameter, render block) that a JUCE
  plugin can use as is. `dsp/CMakeLists.txt` builds it natively.
- `web/wasm/`: the C interface for the browser and `build.sh`, which compiles `dsp/` with Emscripten
  into a standalone `midm.wasm` (about 20 KB, no imports).
- `src/engine/`: the AudioWorklet side: `plaits.js` loads the wasm, `engine.js` mixes the six drums.
  `dspparams.js` is generated from the C++ parameter table, so the knobs always match the DSP.
- `src/seq/`, `src/ui/`: sequencer and page, from fm/dm.

## Build

Needs Node 22 and Emscripten (`em++` on the path).

    sh web/wasm/build.sh   # dsp/ -> web/wasm/midm.wasm
    node build.mjs         # dist/index.html, one self-contained page with the wasm inside
    npm test               # renders every model and preset in Node; sequencer tests
    node test/smoke.mjs    # Playwright: plays a beat with all six models in the page

GitHub Actions (`.github/workflows/pages.yml`) builds the DSP natively and to WebAssembly, runs the
tests and publishes `dist/` to GitHub Pages on every push to main.

## Licence and credits

mi/dm is MIT licensed (`LICENSE`).

The drum models are from Plaits by Emilie Gillet, copyright 2016 Emilie Gillet, and use stmlib,
copyright 2012 Emilie Gillet, both MIT licensed. Their copyright notices and licence text are kept
with the code in `dsp/plaits/LICENSE`, `dsp/stmlib/LICENSE` and every source file's header.
mi/dm is not affiliated with or endorsed by Mutable Instruments or Emilie Gillet.

The VT323 font (SIL Open Font License) is embedded in the page.
