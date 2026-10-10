import { describe, expect, it } from 'vitest';
import { createSampleComposition } from '../model/composition';
import { createRng } from '../random/prng';
import { exploreSync } from './explore';
import { applyMutation, MUTATIONS, mutate } from './mutate';
import { defaultSpec } from './spec';

describe('mutation', () => {
  const base = createSampleComposition();

  it('every operator produces a valid, changed composition and leaves the template untouched', () => {
    const snapshot = JSON.stringify(base);
    for (const m of MUTATIONS) {
      const c = structuredClone(base);
      applyMutation(c, m, createRng(1));
      expect(JSON.stringify(c)).not.toBe(snapshot);
      for (const f of c.figures) expect(Number.isFinite(f.height)).toBe(true);
    }
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it('horizonExtreme moves the horizon to the opposite extreme', () => {
    const c = structuredClone(base); // horizon at 0.6
    applyMutation(c, 'horizonExtreme', createRng(2));
    expect(c.horizon.y).toBeLessThan(0.25);
  });

  it('respects locked objects', () => {
    const c = structuredClone(base);
    c.figures[0].locked = true;
    const before = { ...c.figures[0] };
    for (let i = 0; i < 20; i++) {
      const r = mutate(c, createRng(i), 1);
      expect(r.composition.figures[0]).toEqual(before);
    }
  });

  it('mutate mode explores and records applied mutations', () => {
    const r = exploreSync(base, { ...defaultSpec(11), mode: 'mutate', candidates: 300 });
    expect(r.candidates.length).toBeGreaterThan(3);
    for (const c of r.candidates) expect(c.mutations?.length).toBeGreaterThan(0);
  });
});
