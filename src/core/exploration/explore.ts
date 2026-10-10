/**
 * Exploration pipeline (pure; runs inside Web Workers or the main thread).
 *
 *   generate N candidates (seeded per index → independent of worker count)
 *   → evaluate → reject constraint violations → objective
 *   (Masterpiece ⇔ Discovery blend) → keep a pool → diversity-aware selection (MMR)
 */
import { computeMetrics } from '../evaluation/evaluate';
import { extractFeatures, type Features } from '../evaluation/features';
import type { Metrics } from '../evaluation/metrics';
import { PRESETS, weightedScore } from '../evaluation/presets';
import type { Composition } from '../model/composition';
import { createRng } from '../random/prng';
import { generateCandidate } from './generate';
import { mutate, type Mutation } from './mutate';
import type { ExplorationSpec } from './spec';

export interface Candidate {
  index: number;
  composition: Composition;
  metrics: Metrics;
  /** Preset score (classical). */
  score: number;
  /** Blended objective actually optimized. */
  objective: number;
  novelty: number;
  descriptor: number[];
  tags: string[];
  /** Mutations applied (mutate mode only). */
  mutations?: Mutation[];
}

export interface ChunkResult {
  pool: Candidate[];
  generated: number;
  rejected: number;
}

/** Deterministic per-candidate seed. */
export function candidateSeed(seed: number, index: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (index + 0x7f4a7c15), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Feature vector used for similarity (all components roughly in [0,1]). */
export function describe(c: Composition, f: Features, m: Metrics): number[] {
  const p = f.primary?.focus ?? { x: 0.5, y: 0.5 };
  const maxFig = Math.max(0, ...c.figures.map((x) => x.height));
  return [
    f.horizonY,
    (c.horizon.angle + 30) / 60,
    p.x,
    p.y,
    f.centroid?.x ?? 0.5,
    m.negativeSpace / 100,
    m.dynamics / 100,
    m.symmetry / 100,
    c.perspective.mode === 'one' ? 1 : 0,
    c.perspective.mode === 'two' ? 1 : 0,
    Math.min(1, maxFig / 0.6),
    Math.min(1, c.figures.length / 3),
  ];
}

export function distance(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s / a.length);
}

/** Short archetype labels (i18n keys under `tags.`). */
export function tagsFor(c: Composition, f: Features, m: Metrics): string[] {
  const t: string[] = [];
  // Photographic convention: a "low horizon" sits low in the frame (big sky).
  if (f.horizonY > 0.7) t.push('lowHorizon');
  else if (f.horizonY < 0.3) t.push('highHorizon');
  if (Math.abs(c.horizon.angle) >= 8) t.push('dutchAngle');
  if (c.perspective.mode === 'two' && c.perspective.vpRight - c.perspective.vpLeft < 1.5) t.push('strongPerspective');
  else if (c.perspective.mode === 'one') t.push('onePoint');
  if (m.negativeSpace > 80) t.push('vastSpace');
  if (m.symmetry > 80) t.push('symmetric');
  if (m.thirds > 75) t.push('thirds');
  if (m.golden > 75) t.push('golden');
  const maxFig = Math.max(0, ...c.figures.map((x) => x.height));
  if (c.figures.length && maxFig < 0.1) t.push('tinyFigure');
  if (maxFig > 0.6) t.push('closeUp');
  if (m.dynamics > 60) t.push('dynamic');
  if (c.figures.length >= 2) t.push('group');
  return t.slice(0, 4);
}

function violates(spec: ExplorationSpec, f: Features): boolean {
  const { skyMin, avoidCenter, keepInFrame } = spec.constraints;
  if (skyMin > 0 && f.horizonY < skyMin) return true;
  const p = f.primary?.focus;
  if (p && avoidCenter && Math.abs(p.x - 0.5) < 0.08) return true;
  if (p && keepInFrame && (p.x < 0.03 || p.x > 0.97 || p.y < 0.03 || p.y > 0.97)) return true;
  // Every figure must be at least partly visible.
  if (f.figures.some((x) => x.subject.area <= 0)) return true;
  return false;
}

export interface ChunkRequest {
  template: Composition;
  spec: ExplorationSpec;
  start: number;
  count: number;
  /** Pool size to keep from this chunk. */
  keep: number;
}

export function runChunk({ template, spec, start, count, keep }: ChunkRequest): ChunkResult {
  const weights = PRESETS[spec.preset];
  const tf = extractFeatures(template);
  const tDesc = describe(template, tf, computeMetrics(template, tf));
  const d = spec.discovery;
  const pool: Candidate[] = [];
  let rejected = 0;
  for (let i = start; i < start + count; i++) {
    const rng = createRng(candidateSeed(spec.seed, i));
    let c: Composition;
    let mutations: Mutation[] | undefined;
    if (spec.mode === 'mutate') {
      const r = mutate(template, rng, spec.discovery);
      c = r.composition;
      mutations = r.applied;
    } else c = generateCandidate(template, spec, rng);
    const f = extractFeatures(c);
    if (violates(spec, f)) {
      rejected++;
      continue;
    }
    const m = computeMetrics(c, f);
    const score = weightedScore(m, weights);
    const descriptor = describe(c, f, m);
    const novelty = Math.min(1, distance(descriptor, tDesc) / 0.35);
    const experimental = weightedScore(m, PRESETS.experimental);
    const objective = (1 - d) * score + d * (0.5 * experimental + 0.5 * novelty * 100);
    pool.push({
      index: i,
      composition: c,
      metrics: m,
      score,
      objective,
      novelty,
      descriptor,
      tags: tagsFor(c, f, m),
      mutations,
    });
  }
  pool.sort((a, b) => b.objective - a.objective || a.index - b.index);
  return { pool: pool.slice(0, keep), generated: count, rejected };
}

/**
 * Maximal Marginal Relevance: greedily pick the candidate maximizing
 * (1-λ)·objective + λ·(distance to the closest already-picked candidate).
 * λ = diversity. Near-duplicates are always skipped.
 */
export function selectDiverse(pool: Candidate[], n: number, diversity: number): Candidate[] {
  const sorted = [...pool].sort((a, b) => b.objective - a.objective || a.index - b.index);
  if (sorted.length === 0) return [];
  const maxObj = sorted[0].objective || 1;
  const minObj = sorted[sorted.length - 1].objective;
  const norm = (v: number) => (maxObj - minObj > 1e-9 ? (v - minObj) / (maxObj - minObj) : 1);
  const picked: Candidate[] = [sorted[0]];
  const minDist = new Map<Candidate, number>(sorted.map((c) => [c, distance(c.descriptor, sorted[0].descriptor)]));
  while (picked.length < n) {
    let best: Candidate | null = null;
    let bestVal = -Infinity;
    for (const c of sorted) {
      if (picked.includes(c)) continue;
      const dmin = minDist.get(c)!;
      if (dmin < 0.02) continue; // near-duplicate
      const val = (1 - diversity) * norm(c.objective) + diversity * Math.min(1, dmin / 0.3);
      if (val > bestVal) {
        bestVal = val;
        best = c;
      }
    }
    if (!best) break;
    picked.push(best);
    for (const c of sorted) minDist.set(c, Math.min(minDist.get(c)!, distance(c.descriptor, best.descriptor)));
  }
  return picked;
}

/** Pool size kept per chunk and globally (fixed so results do not depend on the worker count). */
export const poolSize = (spec: ExplorationSpec) => Math.max(50, spec.present * 30);
/** Fixed chunk size: the unit of parallel work and of progress reporting. */
export const CHUNK_SIZE = 250;

/** Merge chunk pools into the global top-K pool. */
export function mergePools(pools: Candidate[][], k: number): Candidate[] {
  return pools
    .flat()
    .sort((a, b) => b.objective - a.objective || a.index - b.index)
    .slice(0, k);
}

/** Single-threaded exploration (tests, fallback when Workers are unavailable). */
export function exploreSync(
  template: Composition,
  spec: ExplorationSpec,
): { candidates: Candidate[]; generated: number; rejected: number } {
  const k = poolSize(spec);
  const r = runChunk({ template, spec, start: 0, count: spec.candidates, keep: k });
  return {
    candidates: selectDiverse(r.pool, spec.present, spec.diversity),
    generated: r.generated,
    rejected: r.rejected,
  };
}
