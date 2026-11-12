// mi/dm master clipper: see master_clipper.h.

#include "midm/master_clipper.h"

#include <algorithm>

namespace midm {

// CHOW's own ranges and defaults, plus on and mix
const ParameterInfo kClipperParameters[NUM_CLIPPER_PARAMETERS] = {
  { "on", "on", 0.0f, 1.0f, 0.0f, TAPER_STEPPED, -1 },
  { "thresh", "thresh", -100.0f, 0.0f, -27.0f, TAPER_LINEAR, -1 },
  { "ratio", "ratio", 1.0f, 50.0f, 10.0f, TAPER_EXPONENTIAL, -1 },
  { "input", "input", -30.0f, 6.0f, 0.0f, TAPER_LINEAR, -1 },
  { "output", "output", -30.0f, 6.0f, 0.0f, TAPER_LINEAR, -1 },
  { "flip", "flip", 0.0f, 1.0f, 0.0f, TAPER_STEPPED, -1 },
  { "rectify", "rectify", 0.0f, 1.0f, 0.0f, TAPER_STEPPED, -1 },
  { "mix", "mix", 0.0f, 1.0f, 1.0f, TAPER_LINEAR, -1 },
};

void MasterClipper::Init() {
  chow_.Init();
  for (int i = 0; i < NUM_CLIPPER_PARAMETERS; ++i) {
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
  switch (parameter) {
    case CLIP_THRESHOLD: chow_.SetThreshDB(value); break;
    case CLIP_RATIO: chow_.SetRatio(value); break;
    case CLIP_INPUT: chow_.SetInGainDB(value); break;
    case CLIP_OUTPUT: chow_.SetOutGainDB(value); break;
    case CLIP_FLIP: chow_.SetFlip(value >= 0.5f); break;
    case CLIP_RECTIFY: chow_.SetRect(value >= 0.5f); break;
    default: break;
  }
}

float MasterClipper::GetParameter(int parameter) const {
  if (parameter < 0 || parameter >= NUM_CLIPPER_PARAMETERS) {
    return 0.0f;
  }
  return parameters_[parameter];
}

void MasterClipper::Process(float* left, float* right, size_t size) {
  if (parameters_[CLIP_ON] < 0.5f) {
    return;
  }
  const float wet = parameters_[CLIP_MIX];
  if (wet >= 1.0f) {
    chow_.Process(left, right, size);
    return;
  }
  // dry/wet: CHOW on a copy, a block at a time
  const float dry = 1.0f - wet;
  float l[32];
  float r[32];
  while (size) {
    const size_t n = std::min(size, static_cast<size_t>(32));
    std::copy(left, left + n, l);
    std::copy(right, right + n, r);
    chow_.Process(l, r, n);
    for (size_t i = 0; i < n; ++i) {
      left[i] = dry * left[i] + wet * l[i];
      right[i] = dry * right[i] + wet * r[i];
    }
    left += n;
    right += n;
    size -= n;
  }
}

}  // namespace midm
