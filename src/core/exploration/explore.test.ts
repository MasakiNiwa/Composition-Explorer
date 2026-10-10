import { describe, expect, it } from 'vitest';
import { createSampleComposition } from '../model/composition';
import { CHUNK_SIZE, exploreSync, mergePools, poolSize, runChunk, selectDiverse } from './explore';
import { defaultSpec } from './spec';

describe('exploration', () => {
  const template = createSampleComposition();

  it('is reproducible for the same seed', () => {
    const spec = { ...defaultSpec(123), candidates: 300 };
    const a = exploreSync(template, spec).candidates.map((c) => c.index);
    const b = exploreSync(template, spec).candidates.map((c) => c.index);
    expect(a).toEqual(b);
    const other = exploreSync(template, { ...spec, seed: 124 }).candidates.map((c) => c.index);
    expect(other).not.toEqual(a);
  });

  it('gives the same result regardless of how the work is chunked', () => {
    const spec = { ...defaultSpec(7), candidates: CHUNK_SIZE * 2 };
    const k = poolSize(spec);
    const chunks = [0, 1].map(
      (i) => runChunk({ template, spec, start: i * CHUNK_SIZE, count: CHUNK_SIZE, keep: k }).pool,
    );
    const parallel = selectDiverse(mergePools(chunks, k), spec.present, spec.diversity).map((c) => c.index);
    expect(parallel).toEqual(exploreSync(template, spec).candidates.map((c) => c.index));
  });

  it('presents the requested number of distinct candidates', () => {
    const r = exploreSync(template, { ...defaultSpec(1), candidates: 400 });
    expect(r.candidates).toHaveLength(10);
    expect(new Set(r.candidates.map((c) => c.index)).size).toBe(10);
  });

  it('respects fixed parameters and constraints', () => {
    const spec = defaultSpec(5);
    spec.candidates = 300;
    spec.params.roll = { mode: 'fixed', min: 0, max: 0 };
    spec.constraints.skyMin = 0.5;
    const r = exploreSync(template, spec);
    for (const c of r.candidates) {
      expect(c.composition.horizon.angle).toBe(template.horizon.angle);
      expect(c.composition.horizon.y).toBeGreaterThanOrEqual(0.5);
    }
    expect(r.rejected).toBeGreaterThan(0);
  });

  it('higher diversity spreads candidates further apart', () => {
    const spread = (div: number) => {
      const cs = exploreSync(template, { ...defaultSpec(9), candidates: 500, diversity: div }).candidates;
      let s = 0;
      for (const a of cs) for (const b of cs) s += Math.hypot(...a.descriptor.map((v, i) => v - b.descriptor[i]));
      return s;
    };
    expect(spread(0.9)).toBeGreaterThan(spread(0));
  });

  it('keeps figures below the horizon (eye-level sizing)', () => {
    const r = exploreSync(template, { ...defaultSpec(3), candidates: 200 });
    for (const c of r.candidates)
      for (const f of c.composition.figures) expect(f.y).toBeGreaterThan(c.composition.horizon.y);
  });
});
