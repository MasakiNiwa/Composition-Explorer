import type { MetricKey } from './metrics';

/**
 * Composition presets (企画書 5.3). Weights are relative; a negative weight
 * rewards the *absence* of a property (100 − metric), which lets presets like
 * "Experimental" deliberately steer away from classical rules.
 */
export const PRESET_KEYS = [
  'balanced',
  'thirds',
  'golden',
  'symmetry',
  'diagonal',
  'leadingLines',
  'negativeSpace',
  'cinematic',
  'experimental',
] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];
export type Weights = Partial<Record<MetricKey, number>>;

export const PRESETS: Record<PresetKey, Weights> = {
  balanced: {
    thirds: 1,
    golden: 0.5,
    balance: 1,
    flow: 1,
    depth: 1,
    negativeSpace: 0.5,
    dynamics: 0.5,
    perspective: 1,
  },
  thirds: { thirds: 3, balance: 0.5, perspective: 1, depth: 0.5 },
  golden: { golden: 3, balance: 0.5, perspective: 1, flow: 0.5 },
  symmetry: { symmetry: 3, balance: 1.5, perspective: 1, dynamics: -0.5 },
  diagonal: { dynamics: 2, flow: 1.5, symmetry: -0.5, perspective: 1 },
  leadingLines: { flow: 3, depth: 1, perspective: 1 },
  negativeSpace: { negativeSpace: 3, thirds: 0.5, perspective: 1 },
  cinematic: { thirds: 1, depth: 1.5, flow: 1, negativeSpace: 1, perspective: 1 },
  experimental: { dynamics: 2, thirds: -1, golden: -0.5, symmetry: -0.5, negativeSpace: 0.5 },
};

export function weightedScore(metrics: Record<MetricKey, number>, weights: Weights): number {
  let sum = 0;
  let wsum = 0;
  for (const [k, w] of Object.entries(weights) as [MetricKey, number][]) {
    if (!w) continue;
    const v = w >= 0 ? metrics[k] : 100 - metrics[k];
    sum += v * Math.abs(w);
    wsum += Math.abs(w);
  }
  return wsum > 0 ? Math.round((sum / wsum) * 10) / 10 : 0;
}
