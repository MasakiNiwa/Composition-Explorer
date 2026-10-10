import { describe, expect, it } from 'vitest';
import { createEmptyComposition, type Composition } from '../model/composition';
import { evaluate } from './evaluate';
import { METRIC_KEYS } from './metrics';
import { PRESETS, weightedScore } from './presets';

function withFigure(x: number, y: number, horizon = 0.6): Composition {
  const c = createEmptyComposition();
  c.horizon.y = horizon;
  c.figures.push({ id: 'f', x, y, height: 0.25, facing: 0, tilt: 0, roll: 0, pose: 'standing', locked: false });
  return c;
}

describe('evaluate', () => {
  it('returns all metrics within 0–100', () => {
    const e = evaluate(withFigure(0.4, 0.9));
    for (const k of METRIC_KEYS) {
      expect(e.metrics[k]).toBeGreaterThanOrEqual(0);
      expect(e.metrics[k]).toBeLessThanOrEqual(100);
    }
  });

  it('rewards a horizon on a third line', () => {
    const on = evaluate(createEmptyComposition()).metrics.thirds;
    const c = createEmptyComposition();
    c.horizon.y = 2 / 3;
    expect(evaluate(c).metrics.thirds).toBeGreaterThan(on);
    expect(evaluate(c).metrics.thirds).toBeGreaterThan(90);
  });

  it('rewards a subject near a power point over one near the center', () => {
    // Head of a 0.25-tall figure is ~0.22 above its feet.
    const power = withFigure(1 / 3, 2 / 3 + 0.22, 0.45);
    const center = withFigure(0.5, 0.5 + 0.22, 0.45);
    expect(evaluate(power).metrics.thirds).toBeGreaterThan(evaluate(center).metrics.thirds);
  });

  it('symmetry is high for a centered subject and drops with roll', () => {
    const c = withFigure(0.5, 0.85);
    const sym = evaluate(c).metrics.symmetry;
    expect(sym).toBeGreaterThan(90);
    c.horizon.angle = 15;
    expect(evaluate(c).metrics.symmetry).toBeLessThan(sym);
    expect(evaluate(withFigure(0.15, 0.85)).metrics.symmetry).toBeLessThan(sym);
  });

  it('balance prefers a centered centroid', () => {
    expect(evaluate(withFigure(0.5, 0.9)).metrics.balance).toBeGreaterThan(
      evaluate(withFigure(0.1, 0.9)).metrics.balance,
    );
  });

  it('perspective consistency follows the eye-level rule', () => {
    const c = withFigure(0.5, 0.9, 0.6);
    c.horizon.cameraHeight = 1.65;
    c.figures[0].height = 0.3; // exactly consistent
    expect(evaluate(c).metrics.perspective).toBeGreaterThan(99);
    c.figures[0].height = 0.6; // twice as tall as it should be
    expect(evaluate(c).metrics.perspective).toBeLessThan(30);
    expect(evaluate(c).notes.some((n) => n.key === 'figureScale')).toBe(true);
  });

  it('negative space shrinks as objects are added', () => {
    const c = createEmptyComposition();
    const empty = evaluate(c).metrics.negativeSpace;
    c.props.push({
      id: 'b',
      kind: 'building',
      layer: 'midground',
      x: 0.5,
      y: 0.9,
      width: 0.6,
      height: 0.6,
      flip: false,
      rotation: 0,
      locked: false,
    });
    expect(evaluate(c).metrics.negativeSpace).toBeLessThan(empty);
  });

  it('dynamics increases with tilt', () => {
    const c = withFigure(0.4, 0.9);
    const base = evaluate(c).metrics.dynamics;
    c.horizon.angle = 20;
    expect(evaluate(c).metrics.dynamics).toBeGreaterThan(base);
  });

  it('negative preset weights invert a metric', () => {
    const m = Object.fromEntries(METRIC_KEYS.map((k) => [k, 0])) as Record<(typeof METRIC_KEYS)[number], number>;
    expect(weightedScore(m, { thirds: -1 })).toBe(100);
    expect(weightedScore(m, PRESETS.thirds)).toBe(0);
  });
});
