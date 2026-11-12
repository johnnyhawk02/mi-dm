// mi/dm drum voice: see drum_voice.h.

#include "midm/drum_voice.h"

#include <algorithm>

namespace midm {

using namespace plaits;

// [id, label, min, max, default, taper, model]
const ParameterInfo kParameters[NUM_PARAMETERS] = {
  { "model", "model", 0.0f, NUM_MODELS - 1, 0.0f, TAPER_STEPPED, -1 },
  { "accent", "accent", 0.0f, 1.0f, 0.8f, TAPER_LINEAR, -1 },
  { "sustain", "sustain", 0.0f, 1.0f, 0.0f, TAPER_STEPPED, -1 },

  { "abdFreq", "freq", 20.0f, 250.0f, 52.0f, TAPER_EXPONENTIAL, MODEL_ANALOG_BASS_DRUM },
  { "abdTone", "tone", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_ANALOG_BASS_DRUM },
  { "abdDecay", "decay", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_ANALOG_BASS_DRUM },
  { "abdAtkFm", "attack fm", 0.0f, 1.0f, 0.8f, TAPER_LINEAR, MODEL_ANALOG_BASS_DRUM },
  { "abdSelfFm", "self fm", 0.0f, 1.0f, 0.3f, TAPER_LINEAR, MODEL_ANALOG_BASS_DRUM },
  { "abdDrive", "drive", 0.0f, 1.0f, 0.0f, TAPER_LINEAR, MODEL_ANALOG_BASS_DRUM },

  { "sbdFreq", "freq", 20.0f, 250.0f, 55.0f, TAPER_EXPONENTIAL, MODEL_SYNTHETIC_BASS_DRUM },
  { "sbdTone", "tone", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_SYNTHETIC_BASS_DRUM },
  { "sbdDecay", "decay", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_SYNTHETIC_BASS_DRUM },
  { "sbdDirt", "dirtiness", 0.0f, 1.0f, 0.34f, TAPER_LINEAR, MODEL_SYNTHETIC_BASS_DRUM },
  { "sbdFmAmt", "fm amount", 0.0f, 1.0f, 0.8f, TAPER_LINEAR, MODEL_SYNTHETIC_BASS_DRUM },
  { "sbdFmDec", "fm decay", 0.0f, 1.0f, 0.2f, TAPER_LINEAR, MODEL_SYNTHETIC_BASS_DRUM },

  { "asdFreq", "freq", 60.0f, 800.0f, 200.0f, TAPER_EXPONENTIAL, MODEL_ANALOG_SNARE_DRUM },
  { "asdTone", "tone", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_ANALOG_SNARE_DRUM },
  { "asdDecay", "decay", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_ANALOG_SNARE_DRUM },
  { "asdSnappy", "snappy", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_ANALOG_SNARE_DRUM },

  { "ssdFreq", "freq", 60.0f, 800.0f, 200.0f, TAPER_EXPONENTIAL, MODEL_SYNTHETIC_SNARE_DRUM },
  { "ssdFm", "fm amount", 0.0f, 1.0f, 0.4f, TAPER_LINEAR, MODEL_SYNTHETIC_SNARE_DRUM },
  { "ssdDecay", "decay", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_SYNTHETIC_SNARE_DRUM },
  { "ssdSnappy", "snappy", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_SYNTHETIC_SNARE_DRUM },

  { "hh1Freq", "freq", 50.0f, 2000.0f, 400.0f, TAPER_EXPONENTIAL, MODEL_HI_HAT_1 },
  { "hh1Tone", "tone", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_HI_HAT_1 },
  { "hh1Decay", "decay", 0.0f, 1.0f, 0.3f, TAPER_LINEAR, MODEL_HI_HAT_1 },
  { "hh1Noise", "noisiness", 0.0f, 1.0f, 0.3f, TAPER_LINEAR, MODEL_HI_HAT_1 },
  { "hh1Open", "open decay", 0.0f, 1.0f, 0.7f, TAPER_LINEAR, MODEL_HI_HAT_1 },

  { "hh2Freq", "freq", 50.0f, 2000.0f, 400.0f, TAPER_EXPONENTIAL, MODEL_HI_HAT_2 },
  { "hh2Tone", "tone", 0.0f, 1.0f, 0.5f, TAPER_LINEAR, MODEL_HI_HAT_2 },
  { "hh2Decay", "decay", 0.0f, 1.0f, 0.3f, TAPER_LINEAR, MODEL_HI_HAT_2 },
  { "hh2Noise", "noisiness", 0.0f, 1.0f, 0.3f, TAPER_LINEAR, MODEL_HI_HAT_2 },
  { "hh2Open", "open decay", 0.0f, 1.0f, 0.7f, TAPER_LINEAR, MODEL_HI_HAT_2 },
};

const char* const kModelNames[NUM_MODELS] = {
  "analog bd",
  "synth bd",
  "analog sd",
  "synth sd",
  "hihat 1",
  "hihat 2",
};

void DrumVoice::Init() {
  for (int i = 0; i < NUM_PARAMETERS; ++i) {
    parameters_[i] = kParameters[i].def;
  }
  trigger_pending_ = false;
  open_ = false;
  velocity_ = 1.0f;
  model_ = 0;

  analog_bass_drum_.Init();
  synthetic_bass_drum_.Init();
  analog_snare_drum_.Init();
  synthetic_snare_drum_.Init();
  hi_hat_1_.Init();
  hi_hat_2_.Init();
  overdrive_.Init();
}

void DrumVoice::Trigger(float velocity, bool open) {
  velocity_ = std::min(std::max(velocity, 0.0f), 1.0f);
  open_ = open;
  trigger_pending_ = true;
}

void DrumVoice::SetParameter(int parameter, float value) {
  if (parameter < 0 || parameter >= NUM_PARAMETERS) {
    return;
  }
  const ParameterInfo& info = kParameters[parameter];
  value = std::min(std::max(value, info.min), info.max);
  if (info.taper == TAPER_STEPPED) {
    value = static_cast<float>(static_cast<int>(value + 0.5f));
  }
  parameters_[parameter] = value;
  if (parameter == PARAM_MODEL) {
    model_ = static_cast<int>(value);
  }
}

float DrumVoice::GetParameter(int parameter) const {
  if (parameter < 0 || parameter >= NUM_PARAMETERS) {
    return 0.0f;
  }
  return parameters_[parameter];
}

void DrumVoice::Render(float* out, size_t size) {
  while (size) {
    size_t n = std::min(size, kMaxBlockSize);
    RenderBlock(out, n);
    out += n;
    size -= n;
  }
}

void DrumVoice::RenderBlock(float* out, size_t size) {
  const float* p = parameters_;
  const bool trigger = trigger_pending_;
  trigger_pending_ = false;
  const bool sustain = p[PARAM_SUSTAIN] >= 0.5f;
  const float accent = p[PARAM_ACCENT] * velocity_;
  const float to_f0 = 1.0f / kSampleRate;

  switch (model_) {
    case MODEL_ANALOG_BASS_DRUM:
      analog_bass_drum_.Render(
          sustain, trigger, accent,
          p[PARAM_ABD_FREQUENCY] * to_f0,
          p[PARAM_ABD_TONE],
          p[PARAM_ABD_DECAY],
          p[PARAM_ABD_ATTACK_FM],
          p[PARAM_ABD_SELF_FM],
          out, size);
      // as the bass drum engine does after the analog model
      overdrive_.Process(0.5f + 0.5f * p[PARAM_ABD_DRIVE], out, size);
      break;

    case MODEL_SYNTHETIC_BASS_DRUM:
      synthetic_bass_drum_.Render(
          sustain, trigger, accent,
          p[PARAM_SBD_FREQUENCY] * to_f0,
          p[PARAM_SBD_TONE],
          p[PARAM_SBD_DECAY],
          p[PARAM_SBD_DIRTINESS],
          p[PARAM_SBD_FM_AMOUNT],
          p[PARAM_SBD_FM_DECAY],
          out, size);
      break;

    case MODEL_ANALOG_SNARE_DRUM:
      analog_snare_drum_.Render(
          sustain, trigger, accent,
          p[PARAM_ASD_FREQUENCY] * to_f0,
          p[PARAM_ASD_TONE],
          p[PARAM_ASD_DECAY],
          p[PARAM_ASD_SNAPPY],
          out, size);
      break;

    case MODEL_SYNTHETIC_SNARE_DRUM:
      synthetic_snare_drum_.Render(
          sustain, trigger, accent,
          p[PARAM_SSD_FREQUENCY] * to_f0,
          p[PARAM_SSD_FM_AMOUNT],
          p[PARAM_SSD_DECAY],
          p[PARAM_SSD_SNAPPY],
          out, size);
      break;

    case MODEL_HI_HAT_1:
      hi_hat_1_.Render(
          sustain, trigger, accent,
          p[PARAM_HH1_FREQUENCY] * to_f0,
          p[PARAM_HH1_TONE],
          open_ ? p[PARAM_HH1_OPEN_DECAY] : p[PARAM_HH1_DECAY],
          p[PARAM_HH1_NOISINESS],
          temp_1_, temp_2_,
          out, size);
      break;

    case MODEL_HI_HAT_2:
      hi_hat_2_.Render(
          sustain, trigger, accent,
          p[PARAM_HH2_FREQUENCY] * to_f0,
          p[PARAM_HH2_TONE],
          open_ ? p[PARAM_HH2_OPEN_DECAY] : p[PARAM_HH2_DECAY],
          p[PARAM_HH2_NOISINESS],
          temp_1_, temp_2_,
          out, size);
      break;

    default:
      std::fill(&out[0], &out[size], 0.0f);
      break;
  }
}

}  // namespace midm
