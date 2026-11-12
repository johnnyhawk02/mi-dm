// mi/dm: the WebAssembly face of dsp/midm/drum_voice. A flat C interface over
// a fixed bank of drum voices, for the AudioWorklet (src/engine/plaits.js).
// Everything browser-specific lives here and in build.sh, not in dsp/.

#include <emscripten/emscripten.h>

#include "midm/drum_voice.h"

namespace {

const int kNumVoices = 6;
const int kMaxRender = 128;

midm::DrumVoice voices[kNumVoices];
float buffer[kMaxRender];

bool valid(int v) { return v >= 0 && v < kNumVoices; }

}  // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE int md_voice_count() { return kNumVoices; }
EMSCRIPTEN_KEEPALIVE int md_max_render() { return kMaxRender; }

EMSCRIPTEN_KEEPALIVE void md_init() {
  for (int v = 0; v < kNumVoices; ++v) voices[v].Init();
}

EMSCRIPTEN_KEEPALIVE void md_set(int v, int parameter, float value) {
  if (valid(v)) voices[v].SetParameter(parameter, value);
}

EMSCRIPTEN_KEEPALIVE float md_get(int v, int parameter) {
  return valid(v) ? voices[v].GetParameter(parameter) : 0.0f;
}

EMSCRIPTEN_KEEPALIVE void md_trigger(int v, float velocity, int open) {
  if (valid(v)) voices[v].Trigger(velocity, open != 0);
}

// renders n (<= md_max_render) samples of voice v; returns the buffer's address
EMSCRIPTEN_KEEPALIVE float* md_render(int v, int n) {
  if (n > kMaxRender) n = kMaxRender;
  if (valid(v) && n > 0) voices[v].Render(buffer, n);
  return buffer;
}

// parameter table, so the page builds its controls from the DSP's own ranges
EMSCRIPTEN_KEEPALIVE int md_param_count() { return midm::NUM_PARAMETERS; }
EMSCRIPTEN_KEEPALIVE const char* md_param_id(int i) { return midm::kParameters[i].id; }
EMSCRIPTEN_KEEPALIVE const char* md_param_label(int i) { return midm::kParameters[i].label; }
EMSCRIPTEN_KEEPALIVE float md_param_min(int i) { return midm::kParameters[i].min; }
EMSCRIPTEN_KEEPALIVE float md_param_max(int i) { return midm::kParameters[i].max; }
EMSCRIPTEN_KEEPALIVE float md_param_def(int i) { return midm::kParameters[i].def; }
EMSCRIPTEN_KEEPALIVE int md_param_taper(int i) { return midm::kParameters[i].taper; }
EMSCRIPTEN_KEEPALIVE int md_param_model(int i) { return midm::kParameters[i].model; }
EMSCRIPTEN_KEEPALIVE int md_model_count() { return midm::NUM_MODELS; }
EMSCRIPTEN_KEEPALIVE const char* md_model_name(int i) { return midm::kModelNames[i]; }

}  // extern "C"
