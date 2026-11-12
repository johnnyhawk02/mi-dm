// The drum DSP's compiled module, for the Node tests (build it with web/wasm/build.sh).
import { readFileSync } from 'node:fs';
export const WASM = new WebAssembly.Module(readFileSync(new URL('../web/wasm/midm.wasm', import.meta.url)));
