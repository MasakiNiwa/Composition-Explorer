/**
 * Composition Engine entry point. Pure and synchronous so it can run in the
 * UI thread for live feedback and in Web Workers for exploration.
 */
import type { Composition } from '../model/composition';
import { extractFeatures, type Features } from './features';
import * as M from './metrics';
import { PRESETS, weightedScore, type PresetKey, type Weights } from './presets';

/** Bump when metric definitions change (part of the reproducibility key). */
export const ENGINE_VERSION = 1;

export interface Note {
  /** i18n key under `notes.` */
  key: string;
  params?: Record<string, string | number>;
  tone: 'good' | 'info' | 'warn';
}

export interface Evaluation {
  metrics: M.Metrics;
  overall: number;
  notes: Note[];
  features: Features;
}

const GROUND_KINDS = new Set(['building', 'tree', 'bush', 'rock', 'fence']);

export function computeMetrics(c: Composition, f: Features = extractFeatures(c)): M.Metrics {
  const symmetry = M.symmetry(f);
  return {
    thirds: M.thirds(f),
    golden: M.golden(f),
    symmetry,
    balance: M.balance(f),
    flow: M.flow(f),
    depth: M.depth(f),
    negativeSpace: M.negativeSpace(f),
    dynamics: M.dynamics(f, symmetry),
    perspective: M.perspective(
      f,
      c.props
        .filter((p) => GROUND_KINDS.has(p.kind) && p.layer !== 'background')
        .map((p) => ({ y: p.y, layer: p.layer })),
    ),
  };
}

export function evaluate(c: Composition, preset: PresetKey | Weights = 'balanced'): Evaluation {
  const features = extractFeatures(c);
  const metrics = computeMetrics(c, features);
  const weights = typeof preset === 'string' ? PRESETS[preset] : preset;
  return { metrics, overall: weightedScore(metrics, weights), notes: buildNotes(c, features, metrics), features };
}

function buildNotes(c: Composition, f: Features, m: M.Metrics): Note[] {
  const notes: Note[] = [];
  if (f.horizonVisible) {
    const t = [1 / 3, 2 / 3].find((l) => Math.abs(f.horizonY - l) < 0.03);
    if (t) notes.push({ key: 'horizonThird', tone: 'good' });
    else if (Math.abs(f.horizonY - 0.5) < 0.03 && Math.abs(c.horizon.angle) < 1)
      notes.push({ key: 'horizonCenter', tone: 'info' });
  }
  if (Math.abs(c.horizon.angle) > 0.3 && Math.abs(c.horizon.angle) < 3) notes.push({ key: 'slightTilt', tone: 'warn' });
  for (const [i, fig] of f.figures.entries()) {
    if (fig.ideal == null) notes.push({ key: 'figureAboveHorizon', params: { n: i + 1 }, tone: 'warn' });
    else {
      const r = fig.subject.height / fig.ideal;
      if (r > 1.35 || r < 0.74)
        notes.push({ key: 'figureScale', params: { n: i + 1, pct: Math.round(r * 100) }, tone: 'warn' });
    }
    const dir = Math.sin((fig.facing * Math.PI) / 180);
    const x = fig.subject.focus.x;
    if ((dir > 0.5 && x > 0.72) || (dir < -0.5 && x < 0.28))
      notes.push({ key: 'lookingOut', params: { n: i + 1 }, tone: 'info' });
  }
  if (f.primary && m.thirds > 75) notes.push({ key: 'subjectPowerPoint', tone: 'good' });
  if (f.primary && Math.abs(f.primary.focus.x - 0.5) < 0.04 && m.symmetry < 60)
    notes.push({ key: 'subjectCentered', tone: 'info' });
  if (m.negativeSpace > 80) notes.push({ key: 'lotsOfSpace', tone: 'info' });
  if (m.balance < 35) notes.push({ key: 'unbalanced', tone: 'info' });
  if (f.subjects.length === 0) notes.push({ key: 'empty', tone: 'info' });
  return notes;
}
