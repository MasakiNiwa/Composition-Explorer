import { describe, expect, it } from 'vitest';
import { createEmptyComposition, createSampleComposition } from '../model/composition';
import { buildAiScene } from '../scene/aiMaps';
import { compositionPrompt } from './prompt';

describe('AI outputs', () => {
  it('describes horizon and perspective in the prompt', () => {
    const c = createEmptyComposition();
    c.horizon.y = 0.85;
    c.horizon.angle = 15;
    c.perspective.mode = 'one';
    const p = compositionPrompt(c);
    expect(p).toContain('low horizon');
    expect(p).toContain('dutch angle');
    expect(p).toContain('one-point perspective');
  });

  it('depth map: nearer objects are brighter', () => {
    const c = createSampleComposition();
    c.props = [];
    c.figures = [
      { id: 'near', x: 0.3, y: 0.95, height: 0.3, facing: 0, tilt: 0, roll: 0, pose: 'standing', locked: false },
      { id: 'far', x: 0.7, y: 0.65, height: 0.05, facing: 0, tilt: 0, roll: 0, pose: 'standing', locked: false },
    ];
    const s = buildAiScene(c, 'depth');
    const v = (id: string) =>
      parseInt(((p) => (p.fill ?? p.stroke)!)(s.items.find((i) => i.id === id)!.prims[0]).slice(1, 3), 16);
    expect(v('near')).toBeGreaterThan(v('far'));
  });

  it('segmentation uses one flat color per class', () => {
    const s = buildAiScene(createSampleComposition(), 'segmentation');
    const fig = s.items.find((i) => i.kind === 'figure')!;
    const fills = new Set(fig.prims.map((p) => p.fill).filter(Boolean));
    expect([...fills]).toEqual(['#96053d']);
  });
});
