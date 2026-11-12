#!/bin/sh
# Builds web/wasm/midm.wasm from the plain C++ in dsp/ (needs Emscripten's em++ on the PATH).
# Standalone wasm, no JavaScript glue: src/engine/plaits.js instantiates it directly.
set -e
cd "$(dirname "$0")/../.."
D=dsp
em++ -O3 -DTEST -std=c++14 -fno-exceptions -fno-rtti -I"$D" \
  "$D/midm/drum_voice.cc" "$D/plaits/resources.cc" "$D/stmlib/dsp/units.cc" "$D/stmlib/utils/random.cc" \
  web/wasm/midm_wasm.cc \
  -sSTANDALONE_WASM --no-entry -sINITIAL_MEMORY=1MB -sSTACK_SIZE=64KB -sALLOW_MEMORY_GROWTH=0 -sFILESYSTEM=0 \
  -o web/wasm/midm.wasm
ls -l web/wasm/midm.wasm
