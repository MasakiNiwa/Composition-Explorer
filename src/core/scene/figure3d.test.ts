import { describe, expect, it } from 'vitest';
import { frameOf } from '../geometry/camera';
import { createSampleComposition, type Figure } from '../model/composition';
import { exploreSync } from '../exploration/explore';
import { defaultSpec } from '../exploration/spec';
import { projectFigure } from './figure3d';

const base: Figure = {
  id: 'f',
  x: 0.5,
  y: 0.9,
  height: 0.4,
  facing: 0,
  tilt: 0,
  roll: 0,
  pose: 'standing',
  locked: false,
};
const frame = frameOf(createSampleComposition());

describe('3D mannequin', () => {
  it('an upright figure keeps its screen height (head near the top)', () => {
    const p = projectFigure(base, frame, 50);
    const feetY = base.y * frame.H;
    const top = p.joints.head.y - 0.115 * p.scaleAt('head');
    expect(feetY - top).toBeGreaterThan(base.height * frame.H * 0.95);
    expect(feetY - top).toBeLessThan(base.height * frame.H * 1.02);
  });

  it('roll tilts the head to the right for positive angles', () => {
    const p = projectFigure({ ...base, roll: 30 }, frame, 50);
    expect(p.joints.head.x).toBeGreaterThan(p.joints.pelvis.x);
  });

  it('tilting toward the camera foreshortens more with a wide lens', () => {
    const near = { ...base, height: 0.9, tilt: 60 };
    const ratio = (fov: number) => {
      const p = projectFigure(near, frame, fov);
      return p.scaleAt('head') / p.scaleAt('lFoot');
    };
    // Head comes toward the camera → larger than feet; stronger with a wider lens.
    expect(ratio(50)).toBeGreaterThan(1.05);
    expect(ratio(110)).toBeGreaterThan(ratio(50));
  });

  it('exploration never comes back empty, even with a locked off-canvas figure', () => {
    const c = createSampleComposition();
    Object.assign(c.figures[0], { x: -0.5, y: 1.5, locked: true });
    for (const mode of ['explore', 'mutate'] as const) {
      const r = exploreSync(c, { ...defaultSpec(3), mode, candidates: 200 });
      expect(r.candidates.length).toBeGreaterThan(0);
    }
    const strict = createSampleComposition();
    const r = exploreSync(strict, {
      ...defaultSpec(3),
      candidates: 100,
      constraints: { skyMin: 5, avoidCenter: true, keepInFrame: true },
    });
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates.every((x) => x.relaxed)).toBe(true);
  });
});
