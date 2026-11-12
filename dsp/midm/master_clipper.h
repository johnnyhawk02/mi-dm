// mi/dm master clipper: CHOW, Jatin Chowdhury's distortion (dsp/chow, GPL-3.0), on the master bus,
// with an on switch and a dry/wet mix added. Parameters follow the plugin's: threshold, ratio,
// input and output gain, flip and rect(ify). Above the threshold (or below minus the threshold,
// when flipped) the signal is squashed by the ratio; rectify holds it at the threshold. Only one
// polarity is touched.
//
// Plain C++, no browser or plugin code. Stereo, any block size, any sample rate.

#ifndef MIDM_MASTER_CLIPPER_H_
#define MIDM_MASTER_CLIPPER_H_

#include <cstddef>

#include "chow/chow.h"
#include "midm/drum_voice.h"  // ParameterInfo, Taper

namespace midm {

enum ClipperParameter {
  CLIP_ON,         // 0 bypass, 1 on
  CLIP_THRESHOLD,  // dB (CHOW: threshDB)
  CLIP_RATIO,      // 1 = clean, higher squashes harder (CHOW: ratio)
  CLIP_INPUT,      // dB before the clipper (CHOW: inGainDB)
  CLIP_OUTPUT,     // dB after it (CHOW: outGainDB)
  CLIP_FLIP,       // 1: work on the negative half instead (CHOW: flip)
  CLIP_RECTIFY,    // 1: hold at the threshold, ratio ignored (CHOW: rect)
  CLIP_MIX,        // dry/wet (mi/dm)
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
  float parameters_[NUM_CLIPPER_PARAMETERS];
  chow::ChowProcessor chow_;
};

}  // namespace midm

#endif  // MIDM_MASTER_CLIPPER_H_
