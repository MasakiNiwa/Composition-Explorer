/**
 * Exploration specification (企画書 7章): each parameter can be Fixed (take
 * the value from the current composition), Range (search inside [min,max]) or
 * Free (let the explorer decide inside sensible bounds).
 */
import type { PresetKey } from '../evaluation/presets';

export type ParamMode = 'fixed' | 'range' | 'free';

export interface RangeParam {
  mode: ParamMode;
  min: number;
  max: number;
}

export const NUMERIC_PARAMS = ['horizonY', 'roll', 'vp', 'vpSpan', 'figureX', 'figureDepth', 'figureSize'] as const;
export type NumericParam = (typeof NUMERIC_PARAMS)[number];

/** Bounds used by Free mode and as limits for Range sliders. */
export const FREE_BOUNDS: Record<
  NumericParam,
  { min: number; max: number; step: number; scale: number; unit: string }
> = {
  horizonY: { min: 0.05, max: 0.95, step: 0.01, scale: 100, unit: '%' },
  roll: { min: -30, max: 30, step: 0.5, scale: 1, unit: '°' },
  vp: { min: -0.2, max: 1.2, step: 0.01, scale: 100, unit: '%' },
  vpSpan: { min: 0.8, max: 4, step: 0.05, scale: 100, unit: '%' },
  figureX: { min: 0.03, max: 0.97, step: 0.01, scale: 100, unit: '%' },
  /** Feet position as a fraction of the ground area below the horizon. */
  figureDepth: { min: 0.05, max: 1.05, step: 0.01, scale: 100, unit: '%' },
  /** Body height (fraction of canvas height), used when eye-level sizing is off. */
  figureSize: { min: 0.03, max: 0.8, step: 0.01, scale: 100, unit: '%' },
};

export type PropsMode = 'fixed' | 'jitter' | 'free';

/** explore = sample the parameter space; mutate = bold changes to the current composition. */
export type ExplorationMode = 'explore' | 'mutate';

export interface ExplorationSpec {
  mode: ExplorationMode;
  params: Record<NumericParam, RangeParam>;
  perspectiveMode: 'fixed' | 'free';
  figureCount: { mode: ParamMode; min: number; max: number };
  /** Size figures by the eye-level rule (±15%) instead of figureSize. */
  eyeLevelSizing: boolean;
  props: PropsMode;
  constraints: {
    /** Minimum sky fraction (horizon height); 0 disables. */
    skyMin: number;
    /** Keep the main subject out of the central vertical band. */
    avoidCenter: boolean;
    /** Keep the main subject's focus inside the frame. */
    keepInFrame: boolean;
  };
  /** Number of compositions to generate and evaluate. */
  candidates: number;
  /** Number of candidates to present. */
  present: number;
  /** 0 = pick top scores only, 1 = maximize differences between candidates. */
  diversity: number;
  /** 0 = Masterpiece (classical theory), 1 = Discovery (beyond the rules). */
  discovery: number;
  preset: PresetKey;
  seed: number;
}

const free = (p: NumericParam): RangeParam => ({ mode: 'free', min: FREE_BOUNDS[p].min, max: FREE_BOUNDS[p].max });

export function defaultSpec(seed = 1): ExplorationSpec {
  return {
    mode: 'explore',
    params: {
      horizonY: free('horizonY'),
      roll: { mode: 'range', min: -8, max: 8 },
      vp: free('vp'),
      vpSpan: free('vpSpan'),
      figureX: free('figureX'),
      figureDepth: free('figureDepth'),
      figureSize: free('figureSize'),
    },
    perspectiveMode: 'free',
    figureCount: { mode: 'fixed', min: 1, max: 2 },
    eyeLevelSizing: true,
    props: 'jitter',
    constraints: { skyMin: 0, avoidCenter: false, keepInFrame: true },
    candidates: 1000,
    present: 10,
    diversity: 0.7,
    discovery: 0.3,
    preset: 'balanced',
    seed,
  };
}
