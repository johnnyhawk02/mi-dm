// mi/dm master clipper: see master_clipper.h.

#include "midm/master_clipper.h"

#include <algorithm>
#include <cmath>

namespace midm {

const ParameterInfo kClipperParameters[NUM_CLIPPER_PARAMETERS] = {
  { "on", "on", 0.0f, 1.0f, 0.0f, TAPER_STEPPED, -1 },
  { "thresh", "thresh", -60.0f, 0.0f, -18.0f, TAPER_LINEAR, -1 },
  { "ratio", "ratio", 1.0f, 50.0f, 10.0f, TAPER_EXPONENTIAL, -1 },
  { "input", "input", -30.0f, 18.0f, 0.0f, TAPER_LINEAR, -1 },
  { "output", "output", -30.0f, 12.0f, 0.0f, TAPER_LINEAR, -1 },
  { "flip", "flip", 0.0f, 1.0f, 0.0f, TAPER_STEPPED, -1 },
  { "rectify", "rectify", 0.0f, 1.0f, 0.0f, TAPER_STEPPED, -1 },
  { "mix", "mix", 0.0f, 1.0f, 1.0f, TAPER_LINEAR, -1 },
};

namespace {
inline float DbToGain(float db) { return std::pow(10.0f, db * 0.05f); }
}  // namespace

void MasterClipper::Init() {
  for (int i = 0; i < NUM_CLIPPER_PARAMETERS; ++i) {
    parameters_[i] = -1e9f;  // force every update below
    SetParameter(i, kClipperParameters[i].def);
  }
}

void MasterClipper::SetParameter(int parameter, float value) {
  if (parameter < 0 || parameter >= NUM_CLIPPER_PARAMETERS) {
    return;
  }
  const ParameterInfo& info = kClipperParameters[parameter];
  value = std::min(std::max(value, info.min), info.max);
  if (info.taper == TAPER_STEPPED) {
    value = static_cast<float>(static_cast<int>(value + 0.5f));
  }
  parameters_[parameter] = value;
  const float* p = parameters_;
  threshold_ = DbToGain(p[CLIP_THRESHOLD]);
  slope_ = p[CLIP_RECTIFY] >= 0.5f ? 0.0f : 1.0f / std::max(p[CLIP_RATIO], 1.0f);
  in_gain_ = DbToGain(p[CLIP_INPUT]);
  out_gain_ = DbToGain(p[CLIP_OUTPUT]);
  sign_ = p[CLIP_FLIP] >= 0.5f ? -1.0f : 1.0f;
}

float MasterClipper::GetParameter(int parameter) const {
  if (parameter < 0 || parameter >= NUM_CLIPPER_PARAMETERS) {
    return 0.0f;
  }
  return parameters_[parameter];
}

inline float MasterClipper::Clip(float x) const {
  // work on the chosen polarity only; the other half passes untouched
  const float s = x * sign_;
  if (s <= threshold_) {
    return x;
  }
  return sign_ * (threshold_ + (s - threshold_) * slope_);
}

void MasterClipper::Process(float* left, float* right, size_t size) {
  if (parameters_[CLIP_ON] < 0.5f) {
    return;
  }
  const float wet = parameters_[CLIP_MIX];
  const float dry = 1.0f - wet;
  for (size_t i = 0; i < size; ++i) {
    const float l = left[i];
    const float r = right[i];
    left[i] = dry * l + wet * Clip(l * in_gain_) * out_gain_;
    right[i] = dry * r + wet * Clip(r * in_gain_) * out_gain_;
  }
}

}  // namespace midm
