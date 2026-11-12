// CHOW, a maximally truculent distortion effect, by Jatin Chowdhury.
// https://github.com/Chowdhury-DSP/CHOW (Source/PluginProcessor.cpp), GPL-3.0: see LICENSE and
// SOURCE.txt in this folder for the licence and what was changed for mi/dm.
//
// This program is free software: you can redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version. This program is distributed in the hope that it
// will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
//
// Plain C++, no JUCE: input gain, the chow() clipper on every sample, output gain.

#ifndef CHOW_CHOW_H_
#define CHOW_CHOW_H_

#include <cmath>
#include <cstddef>

namespace chow {

class ChowProcessor {
 public:
  // the plugin's parameters, with its ranges and defaults
  //   threshDB  -100..0 dB   (-27)
  //   ratio        1..50     (10)
  //   inGainDB   -30..6 dB   (0)
  //   outGainDB  -30..6 dB   (0)
  //   flip, rect               (false)
  void Init() {
    SetThreshDB(-27.0f);
    ratio_ = 10.0f;
    SetInGainDB(0.0f);
    SetOutGainDB(0.0f);
    flip_ = false;
    rect_ = false;
  }

  void SetThreshDB(float db) { threshGain_ = DecibelsToGain(db); }
  void SetRatio(float ratio) { ratio_ = ratio; }
  void SetInGainDB(float db) { inGain_ = DecibelsToGain(db); }
  void SetOutGainDB(float db) { outGain_ = DecibelsToGain(db); }
  void SetFlip(bool flip) { flip_ = flip; }
  void SetRect(bool rect) { rect_ = rect; }

  // ChowAudioProcessor::chow(), unchanged apart from the parameter reads
  float chow(float x) const {
    float y = x;

    const float threshGain = threshGain_;

    if (! flip_ && x > threshGain)
    {
        y = threshGain;

        if (! rect_)
            y += ((x - threshGain) / ratio_);
    }

    else if (flip_ && x < -threshGain)
    {
        y = -threshGain;

        if (! rect_)
            y += ((x + threshGain) / ratio_);
    }

    //set y
    return y;
  }

  // ChowAudioProcessor::processBlock(): input gain, chow() on every sample, output gain
  void Process(float* left, float* right, size_t size) const {
    for (size_t n = 0; n < size; n++) {
      left[n] = chow(left[n] * inGain_) * outGain_;
      right[n] = chow(right[n] * inGain_) * outGain_;
    }
  }

 private:
  static float DecibelsToGain(float db) {
    // as juce::Decibels::decibelsToGain with its default -100 dB floor
    return db > -100.0f ? std::pow(10.0f, db * 0.05f) : 0.0f;
  }

  float threshGain_;
  float ratio_;
  float inGain_;
  float outGain_;
  bool flip_;
  bool rect_;
};

}  // namespace chow

#endif  // CHOW_CHOW_H_
