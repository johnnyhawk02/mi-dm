# mi/dm drum DSP: plain C++ (no browser, Emscripten or plugin code), as a static library.
# A JUCE plugin can add_subdirectory(dsp) and link midm_dsp; the web build compiles the same files
# with em++ (web/wasm/build.sh).
cmake_minimum_required(VERSION 3.15)
project(midm_dsp CXX)

add_library(midm_dsp STATIC
  midm/drum_voice.cc
  midm/master_clipper.cc
  plaits/resources.cc
  stmlib/dsp/units.cc
  stmlib/utils/random.cc
)
target_include_directories(midm_dsp PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
# TEST selects stmlib's portable code paths instead of the ARM (Cortex-M) assembly
target_compile_definitions(midm_dsp PUBLIC TEST)
target_compile_features(midm_dsp PUBLIC cxx_std_11)

if(PROJECT_IS_TOP_LEVEL)
  add_executable(midm_render_test test/render_test.cc)
  target_link_libraries(midm_render_test midm_dsp)
endif()
