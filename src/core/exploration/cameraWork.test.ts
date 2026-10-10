import { describe, expect, it } from 'vitest';
import { eyeLevelFigureHeight } from '../geometry/camera';
import { createSampleComposition } from '../model/composition';
import { createRng } from '../random/prng';
import { extractFeatures } from '../evaluation/features';
import { applyCameraMove, applyShot } from './cameraWork';
import { generateCandidate } from './generate';
import { exploreSync } from './explore';
import { defaultSpec } from './spec';

describe('shots and camera work', () => {
  it('a close-up keeps the face in frame and stays eye-level consistent', () => {
    for (let s = 1; s <= 20; s++) {
      const c = createSampleComposition();
      applyShot(c, 'closeUp', createRng(s));
      const fig = c.figures[0];
      expect(fig.height).toBeGreaterThan(3.9);
      const head = extractFeatures(c).figures[0].subject.focus;
      expect(head.y).toBeGreaterThan(0);
      expect(head.y).toBeLessThan(1);
      const ideal = eyeLevelFigureHeight(c, fig.y);
      // Horizon was derived from the camera, so the size matches the eye-level rule
      // (unless the horizon had to be clamped).
      if (c.horizon.y > -1 && c.horizon.y < 2) expect(ideal).toBeCloseTo(fig.height, 5);
    }
  });

  it('camera moves do what they say', () => {
    const inv = createSampleComposition();
    applyCameraMove(inv, 'invert', createRng(1));
    expect(Math.abs(inv.horizon.angle)).toBeGreaterThan(140);

    const worm = createSampleComposition();
    applyCameraMove(worm, 'wormsEye', createRng(2));
    expect(worm.horizon.cameraHeight).toBeLessThan(0.5);

    const bird = createSampleComposition();
    applyCameraMove(bird, 'birdsEye', createRng(3));
    expect(bird.horizon.cameraHeight).toBeGreaterThan(10);

    const ots = createSampleComposition();
    applyCameraMove(ots, 'overShoulder', createRng(4));
    expect(ots.figures.length).toBe(2);
    expect(Math.abs(ots.figures[0].facing)).toBeGreaterThan(120);
  });

  it('auto shots mix close framings into ordinary exploration', () => {
    const spec = defaultSpec(9);
    const c = createSampleComposition();
    let close = 0;
    for (let i = 0; i < 300; i++) if (generateCandidate(c, spec, createRng(i)).figures[0].height > 1.15) close++;
    expect(close / 300).toBeGreaterThan(0.15);
    // The portrait preset leans further toward close framings.
    const portrait = exploreSync(c, { ...spec, preset: 'portrait', candidates: 300 });
    expect(portrait.candidates.some((x) => x.tags.some((t) => ['closeUp', 'bustShot', 'mediumShot'].includes(t)))).toBe(
      true,
    );
  });
});
