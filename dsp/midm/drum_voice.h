// mi/dm drum voice: a small wrapper around the six drum models of Emilie
// Gillet's Plaits DSP (dsp/plaits, unchanged).
//
// Plain C++ with no browser, Emscripten or plugin code, so the same source can
// be built into a WebAssembly module (see web/wasm) or a JUCE plugin as is.
//
//   midm::DrumVoice v;
//   v.Init();
//   v.SetParameter(midm::PARAM_MODEL, midm::MODEL_ANALOG_BASS_DRUM);
//   v.SetParameter(midm::PARAM_ABD_FREQUENCY, 52.0f);   // values in real units
//   v.Trigger(1.0f);                                      // velocity 0..1
//   v.Render(out, n);                                     // mono, any n
//
// The DSP runs at a fixed 48 kHz (Plaits' kSampleRate). Host at 48 kHz, or
// resample around Render.
//
// Every argument each model's Render() takes is a parameter here, including
// the ones the hardware module derives from its three knobs (the FM amounts,
// dirtiness, drive...). The table kParameters gives each one's range, default
// and taper, so a host can build its controls from it.

#ifndef MIDM_DRUM_VOICE_H_
#define MIDM_DRUM_VOICE_H_

#include <cstddef>

#include "plaits/dsp/drums/analog_bass_drum.h"
#include "plaits/dsp/drums/analog_snare_drum.h"
#include "plaits/dsp/drums/hi_hat.h"
#include "plaits/dsp/drums/synthetic_bass_drum.h"
#include "plaits/dsp/drums/synthetic_snare_drum.h"
#include "plaits/dsp/fx/overdrive.h"

namespace midm {

const float kSampleRate = plaits::kSampleRate;

enum Model {
  MODEL_ANALOG_BASS_DRUM,
  MODEL_SYNTHETIC_BASS_DRUM,
  MODEL_ANALOG_SNARE_DRUM,
  MODEL_SYNTHETIC_SNARE_DRUM,
  MODEL_HI_HAT_1,  // square-wave metallic noise, swing VCA, resonant colour
  MODEL_HI_HAT_2,  // ring-modulated metallic noise, linear VCA, two-stage envelope
  NUM_MODELS
};

enum Parameter {
  // shared by every model
  PARAM_MODEL,        // which Model plays
  PARAM_ACCENT,       // Render(accent), scaled by the trigger's velocity
  PARAM_SUSTAIN,      // Render(sustain): 1 = free-running tone, no envelope

  // analog bass drum: Render(f0, tone, decay, attack_fm_amount,
  // self_fm_amount), then the bass drum engine's overdrive
  PARAM_ABD_FREQUENCY,
  PARAM_ABD_TONE,
  PARAM_ABD_DECAY,
  PARAM_ABD_ATTACK_FM,
  PARAM_ABD_SELF_FM,
  PARAM_ABD_DRIVE,

  // synthetic bass drum: Render(f0, tone, decay, dirtiness,
  // fm_envelope_amount, fm_envelope_decay)
  PARAM_SBD_FREQUENCY,
  PARAM_SBD_TONE,
  PARAM_SBD_DECAY,
  PARAM_SBD_DIRTINESS,
  PARAM_SBD_FM_AMOUNT,
  PARAM_SBD_FM_DECAY,

  // analog snare drum: Render(f0, tone, decay, snappy)
  PARAM_ASD_FREQUENCY,
  PARAM_ASD_TONE,
  PARAM_ASD_DECAY,
  PARAM_ASD_SNAPPY,

  // synthetic snare drum: Render(f0, fm_amount, decay, snappy)
  PARAM_SSD_FREQUENCY,
  PARAM_SSD_FM_AMOUNT,
  PARAM_SSD_DECAY,
  PARAM_SSD_SNAPPY,

  // hi-hat 1: Render(f0, tone, decay, noisiness); open decay replaces decay
  // on an open-hat trigger
  PARAM_HH1_FREQUENCY,
  PARAM_HH1_TONE,
  PARAM_HH1_DECAY,
  PARAM_HH1_NOISINESS,
  PARAM_HH1_OPEN_DECAY,

  // hi-hat 2: the same, for the second hi-hat model
  PARAM_HH2_FREQUENCY,
  PARAM_HH2_TONE,
  PARAM_HH2_DECAY,
  PARAM_HH2_NOISINESS,
  PARAM_HH2_OPEN_DECAY,

  NUM_PARAMETERS
};

enum Taper {
  TAPER_LINEAR,
  TAPER_EXPONENTIAL,  // min > 0
  TAPER_STEPPED,      // whole numbers only
};

struct ParameterInfo {
  const char* id;      // short stable name (used in presets)
  const char* label;   // short display name
  float min;
  float max;
  float def;
  Taper taper;
  int model;           // the Model it belongs to, or -1 for shared ones
};

extern const ParameterInfo kParameters[NUM_PARAMETERS];
extern const char* const kModelNames[NUM_MODELS];

class DrumVoice {
 public:
  DrumVoice() { }
  ~DrumVoice() { }

  // Sets every parameter to its default and resets all six models.
  void Init();

  // Starts a hit on the next Render. velocity 0..1 scales the accent.
  // open: for the hi-hat models, use the open decay for this hit.
  void Trigger(float velocity, bool open = false);

  // value in the parameter's real units (Hz for frequencies, 0..1 otherwise);
  // clamped to its range.
  void SetParameter(int parameter, float value);
  float GetParameter(int parameter) const;

  // Renders size mono samples of the current model.
  void Render(float* out, size_t size);

 private:
  void RenderBlock(float* out, size_t size);

  float parameters_[NUM_PARAMETERS];
  bool trigger_pending_;
  bool open_;
  float velocity_;
  int model_;

  plaits::AnalogBassDrum analog_bass_drum_;
  plaits::SyntheticBassDrum synthetic_bass_drum_;
  plaits::AnalogSnareDrum analog_snare_drum_;
  plaits::SyntheticSnareDrum synthetic_snare_drum_;
  plaits::HiHat<plaits::SquareNoise, plaits::SwingVCA, true, false> hi_hat_1_;
  plaits::HiHat<plaits::RingModNoise, plaits::LinearVCA, false, true> hi_hat_2_;
  plaits::Overdrive overdrive_;

  float temp_1_[plaits::kMaxBlockSize];
  float temp_2_[plaits::kMaxBlockSize];

  DrumVoice(const DrumVoice&);
  DrumVoice& operator=(const DrumVoice&);
};

}  // namespace midm

#endif  // MIDM_DRUM_VOICE_H_
