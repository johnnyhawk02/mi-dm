// mi/dm master clipper: a one-sided threshold/ratio clipper for the master bus, between a half-wave
// rectifier and a hard, crude compressor. Written for mi/dm (MIT), modelled on how the CHOW
// distortion plugin by Jatin Chowdhury behaves; it contains none of CHOW's code (CHOW is GPL-3.0).
//
// Above the threshold (or below minus the threshold, when flipped) the signal is squashed by the
// ratio; rectify throws away everything past the threshold instead. Only one polarity is touched,
// which is what gives it its lopsided, buzzy sound.
//
// Plain C++, no browser or plugin code. Stereo, any block size, any sample rate.

#ifndef MIDM_MASTER_CLIPPER_H_
#define MIDM_MASTER_CLIPPER_H_

#include <cstddef>

#include "midm/drum_voice.h"  // ParameterInfo, Taper

namespace midm {

enum ClipperParameter {
  CLIP_ON,         // 0 bypass, 1 on
  CLIP_THRESHOLD,  // dB
  CLIP_RATIO,      // 1 = clean, higher squashes harder
  CLIP_INPUT,      // dB before the clipper
  CLIP_OUTPUT,     // dB after it
  CLIP_FLIP,       // 1: work on the negative half instead
  CLIP_RECTIFY,    // 1: hold at the threshold (ratio ignored)
  CLIP_MIX,        // dry/wet
  NUM_CLIPPER_PARAMETERS
};

extern const ParameterInfo kClipperParameters[NUM_CLIPPER_PARAMETERS];

class MasterClipper {
 public:
  MasterClipper() { }
  ~MasterClipper() { }

  void Init();
  void SetParameter(int parameter, float value);
  float GetParameter(int parameter) const;
  // in place, left and right
  void Process(float* left, float* right, size_t size);

 private:
  float Clip(float x) const;

  float parameters_[NUM_CLIPPER_PARAMETERS];
  float threshold_;   // linear
  float slope_;       // 1 / ratio, or 0 when rectifying
  float in_gain_;
  float out_gain_;
  float sign_;        // +1, or -1 when flipped
};

}  // namespace midm

#endif  // MIDM_MASTER_CLIPPER_H_
