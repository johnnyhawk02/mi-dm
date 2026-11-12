# dsp: the mi/dm drums

Plain C++ only: no browser, Emscripten or plugin code lives here, so this folder can go into another
build (a JUCE VST3 plugin, a command-line renderer) unchanged.

- `plaits/` and `stmlib/`: the parts of Emilie Gillet's Plaits and stmlib the drum models need, copied
  unchanged (MIT licence, see the `LICENSE` file in each folder and each file's header).
  The drum models are `plaits/dsp/drums/`: `analog_bass_drum.h`, `synthetic_bass_drum.h`,
  `analog_snare_drum.h`, `synthetic_snare_drum.h` and `hi_hat.h` (two variants).
- `midm/drum_voice.h`, `midm/drum_voice.cc`: the wrapper. One `DrumVoice` plays any of the six
  models, with three calls:

  ```cpp
  midm::DrumVoice voice;
  voice.Init();
  voice.SetParameter(midm::PARAM_MODEL, midm::MODEL_ANALOG_BASS_DRUM);
  voice.SetParameter(midm::PARAM_ABD_FREQUENCY, 52.0f);  // real units: Hz, or 0..1
  voice.Trigger(1.0f);                                    // velocity scales the accent
  voice.Render(out, n);                                   // mono, any block size
  ```

  Every argument of each model's `Render()` is a parameter, including the ones the hardware module
  derives from its knobs (attack and self FM, dirtiness, FM envelope amount and decay, the bass drum
  engine's overdrive drive). `kParameters` lists each one's id, label, range, default and taper, so a
  host can build its controls from it; the web page reads the same table out of the WebAssembly.

- `midm/master_clipper.h`, `midm/master_clipper.cc`: the master-bus clipper (mi/dm's own code, MIT,
  after the behaviour of the CHOW plugin, none of its GPL code): `Init`, `SetParameter`, and
  `Process(left, right, n)` in place. `kClipperParameters` lists its controls.

## Building

The DSP runs at a fixed 48 kHz (Plaits' `kSampleRate`). Define `TEST` when compiling: it selects
stmlib's portable code instead of ARM assembly. `CMakeLists.txt` builds a static library
(`midm_dsp`) and, on its own, a native check:

    cmake -S dsp -B dsp/build && cmake --build dsp/build && dsp/build/midm_render_test

The web build compiles the same files with Emscripten: `web/wasm/build.sh`.
