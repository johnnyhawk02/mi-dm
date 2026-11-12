// mi/dm — small JS building blocks (the drums themselves are the Plaits C++ in dsp/). No allocation after construction.

// soft clip, cheap tanh-like (exact at 0, saturates to ±1)
export function softclip(x) {
  if (x > 3) return 1;
  if (x < -3) return -1;
  const x2 = x * x;
  return (x * (27 + x2)) / (27 + 9 * x2);
}

// xorshift32 noise, deterministic for a seed
export class Rng {
  constructor(seed = 1) {
    this.s = seed >>> 0 || 0x9e3779b9;
  }
  next() {
    let s = this.s;
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    this.s = s;
    return s;
  }
  // -1..1
  bi() {
    return this.next() / 2147483648 - 1;
  }
  // 0..1
  uni() {
    return this.next() / 4294967296;
  }
}

// Topology-preserving state variable filter (trapezoidal integration)
export class Svf {
  constructor() {
    this.ic1 = 0;
    this.ic2 = 0;
    this.a1 = 0;
    this.a2 = 0;
    this.a3 = 0;
    this.k = 2;
    this.lp = 0;
    this.bp = 0;
    this.hp = 0;
  }
  set(fc, res, sr) {
    const nyq = sr * 0.49;
    if (fc > nyq) fc = nyq;
    if (fc < 10) fc = 10;
    const g = Math.tan((Math.PI * fc) / sr);
    const k = 2 - 1.96 * (res < 0 ? 0 : res > 1 ? 1 : res);
    this.k = k;
    this.a1 = 1 / (1 + g * (g + k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  tick(v0) {
    const v3 = v0 - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2;
    this.bp = v1;
    this.hp = v0 - this.k * v1 - v2;
  }
  reset() {
    this.ic1 = this.ic2 = 0;
  }
}
