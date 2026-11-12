// Native check of the drum DSP, no browser: every model sounds, stays finite and under +-2.
//   cmake -S dsp -B dsp/build && cmake --build dsp/build && dsp/build/midm_render_test

#include <cmath>
#include <cstdio>

#include "midm/drum_voice.h"

int main() {
  static midm::DrumVoice voice;
  static float out[48000];
  int failures = 0;
  for (int model = 0; model < midm::NUM_MODELS; ++model) {
    for (int open = 0; open < 2; ++open) {
      voice.Init();
      voice.SetParameter(midm::PARAM_MODEL, static_cast<float>(model));
      voice.Trigger(1.0f, open != 0);
      // odd block sizes on purpose: Render takes any size
      size_t done = 0;
      const size_t sizes[] = { 1, 7, 24, 31, 128, 5 };
      for (int i = 0; done < 48000; ++i) {
        size_t n = sizes[i % 6];
        if (done + n > 48000) n = 48000 - done;
        voice.Render(out + done, n);
        done += n;
      }
      float peak = 0.0f;
      bool finite = true;
      for (size_t i = 0; i < 48000; ++i) {
        finite = finite && std::isfinite(out[i]);
        peak = std::fmax(peak, std::fabs(out[i]));
      }
      const bool ok = finite && peak > 0.05f && peak < 2.0f;
      failures += ok ? 0 : 1;
      std::printf("%s %-10s %s peak %.3f\n", ok ? "ok  " : "FAIL",
                  midm::kModelNames[model], open ? "open  " : "closed", peak);
    }
  }
  return failures ? 1 : 0;
}
