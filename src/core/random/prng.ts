/**
 * Small, fast, seedable PRNG (sfc32 seeded via splitmix32).
 * Deterministic across JS engines so a (params, seed, engine version) triple
 * always reproduces the same exploration result.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Pick one element. */
  pick<T>(items: readonly T[]): T;
  /** Standard normal sample (Box–Muller). */
  normal(): number;
  /** Bernoulli trial. */
  chance(p: number): boolean;
}

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export function createRng(seed: number): Rng {
  const init = splitmix32(seed);
  let a = init();
  let b = init();
  let c = init();
  let d = init();
  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  // Warm up.
  for (let i = 0; i < 12; i++) next();
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: (items) => items[Math.floor(next() * items.length)],
    normal: () => {
      const u = Math.max(next(), 1e-12);
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    chance: (p) => next() < p,
  };
}

/** Random 32-bit seed from the platform RNG (for "new seed" buttons). */
export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 2 ** 32);
}
