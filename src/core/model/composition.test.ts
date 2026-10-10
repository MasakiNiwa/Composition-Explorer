import { describe, expect, it } from 'vitest';
import { eyeLevelFigureHeight, frameOf, screenToWorld, worldToScreen } from '../geometry/camera';
import { buildScene } from '../scene/buildScene';
import { sceneSvgBody } from '../../render/svg';
import { createEmptyComposition, createSampleComposition, parseComposition } from './composition';

describe('composition schema', () => {
  it('round-trips through JSON', () => {
    const c = createSampleComposition();
    const parsed = parseComposition(JSON.parse(JSON.stringify({ app: 'x', composition: c })));
    expect(parsed.ok && parsed.value).toEqual(c);
  });

  it('rejects malformed input', () => {
    const bad = { ...createEmptyComposition(), horizon: { y: 'high' } };
    expect(parseComposition(bad).ok).toBe(false);
    expect(parseComposition(null).ok).toBe(false);
  });
});

describe('camera', () => {
  it('eye-level rule: a person standing where the camera is at eye height is cut by the horizon at camera height', () => {
    const c = createEmptyComposition();
    c.horizon.y = 0.5;
    c.horizon.cameraHeight = 1.65; // camera at the eye height of a 1.65 m person
    // Feet 0.3 below the horizon → whole body spans exactly 0.3 (horizon at head).
    expect(eyeLevelFigureHeight(c, 0.8)).toBeCloseTo(0.3);
    expect(eyeLevelFigureHeight(c, 0.4)).toBeNull();
  });

  it('roll transform is invertible', () => {
    const c = createEmptyComposition();
    c.horizon.angle = 17;
    const f = frameOf(c);
    const p = { x: 123, y: 456 };
    const back = screenToWorld(f, worldToScreen(f, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });
});

describe('scene', () => {
  it('builds one item per figure and prop', () => {
    const c = createSampleComposition();
    const s = buildScene(c);
    expect(s.items).toHaveLength(c.figures.length + c.props.length);
  });

  it('draws grid lines that reach the canvas in two-point perspective', () => {
    const c = createSampleComposition();
    c.perspective.mode = 'two';
    const s = buildScene(c, { showGrid: true });
    const { W, H } = s.frame;
    const lines = s.environment.filter((p) => p.t === 'line');
    const visible = lines.filter((l) => {
      if (l.t !== 'line') return false;
      const t = (H - l.y1) / (l.y2 - l.y1);
      const x = l.x1 + (l.x2 - l.x1) * t;
      return x >= 0 && x <= W;
    });
    expect(visible.length).toBeGreaterThan(4);
  });

  it('escapes ids in SVG output', () => {
    const c = createSampleComposition();
    c.figures[0].id = '"><script>alert(1)</script>';
    const svg = sceneSvgBody(buildScene(c), { interactive: true });
    expect(svg).not.toContain('<script>');
  });
});
