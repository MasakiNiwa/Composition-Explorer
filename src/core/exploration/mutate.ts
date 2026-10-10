/**
 * Composition mutation (企画書 6.4): keep part of a composition's character
 * while applying one or two bold changes, to meet compositions you would not
 * have imagined — not to fine-tune.
 */
import { eyeLevelFigureHeight } from '../geometry/camera';
import type { Composition } from '../model/composition';
import type { Rng } from '../random/prng';

export const MUTATIONS = [
  'horizonExtreme',
  'shrinkFigures',
  'enlargeFigure',
  'flipVanishingPoint',
  'breakSymmetry',
  'moreSpace',
  'dutchAngle',
  'switchPerspective',
  'mirror',
] as const;
export type Mutation = (typeof MUTATIONS)[number];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function resizeFiguresToEyeLevel(c: Composition, k = 1) {
  for (const f of c.figures) {
    if (f.locked) continue;
    if (f.y <= c.horizon.y + 0.01) f.y = c.horizon.y + 0.02;
    const h = eyeLevelFigureHeight(c, f.y);
    if (h != null) f.height = clamp(h * k, 0.01, 3);
  }
}

/** Move ground-anchored unlocked objects so they keep their relative depth under a new horizon. */
function rebaseOnHorizon(c: Composition, oldH: number) {
  const newH = c.horizon.y;
  const map = (y: number) => newH + ((y - oldH) / Math.max(0.02, 1 - oldH)) * Math.max(0.02, 1 - newH);
  for (const f of c.figures) if (!f.locked) f.y = map(f.y);
  for (const p of c.props) {
    if (p.locked) continue;
    if (p.kind === 'cloud' || p.kind === 'sun') p.y = clamp((p.y / Math.max(0.02, oldH)) * newH, -0.2, newH);
    else if (p.layer === 'background' || p.kind === 'mountain' || p.kind === 'tower') p.y = newH + (p.y - oldH);
    else p.y = map(p.y);
  }
}

export function applyMutation(c: Composition, m: Mutation, rng: Rng): void {
  switch (m) {
    case 'horizonExtreme': {
      const old = c.horizon.y;
      c.horizon.y = old < 0.5 ? rng.range(0.8, 0.93) : rng.range(0.07, 0.2);
      rebaseOnHorizon(c, old);
      resizeFiguresToEyeLevel(c);
      break;
    }
    case 'shrinkFigures':
      for (const f of c.figures) {
        if (f.locked) continue;
        // Push figures far away: feet close to the horizon.
        f.y = c.horizon.y + rng.range(0.02, 0.12) * (1 - c.horizon.y);
      }
      resizeFiguresToEyeLevel(c);
      break;
    case 'enlargeFigure': {
      const f = c.figures.filter((x) => !x.locked)[0];
      if (f) {
        f.y = rng.range(1.0, 1.4);
        f.x = rng.chance(0.5) ? rng.range(0.15, 0.35) : rng.range(0.65, 0.85);
        resizeFiguresToEyeLevel(c);
      }
      break;
    }
    case 'flipVanishingPoint':
      if (c.perspective.mode === 'one') c.perspective.vp = clamp(1 - c.perspective.vp + rng.normal() * 0.05, -0.2, 1.2);
      else if (c.perspective.mode === 'two') {
        const span = c.perspective.vpRight - c.perspective.vpLeft;
        const center = 1 - (c.perspective.vpLeft + c.perspective.vpRight) / 2;
        const k = rng.range(0.5, 0.8);
        c.perspective.vpLeft = center - (span * k) / 2;
        c.perspective.vpRight = center + (span * k) / 2;
      } else {
        c.perspective.mode = 'one';
        c.perspective.vp = rng.chance(0.5) ? rng.range(0.05, 0.25) : rng.range(0.75, 0.95);
      }
      break;
    case 'breakSymmetry':
      for (const f of c.figures) if (!f.locked) f.x = rng.chance(0.5) ? rng.range(0.08, 0.3) : rng.range(0.7, 0.92);
      for (const p of c.props) if (!p.locked && p.kind !== 'cloud') p.x = clamp(p.x + rng.normal() * 0.25, -0.2, 1.2);
      if (c.perspective.mode === 'one') c.perspective.vp = rng.chance(0.5) ? rng.range(0, 0.3) : rng.range(0.7, 1);
      break;
    case 'moreSpace':
      for (const p of c.props) {
        if (p.locked || p.kind === 'cloud' || p.kind === 'sun' || p.kind === 'mountain') continue;
        const k = rng.range(0.4, 0.7);
        p.width *= k;
        p.height *= k;
        p.x = p.x < 0.5 ? clamp(p.x - rng.range(0.1, 0.3), -0.2, 1) : clamp(p.x + rng.range(0.1, 0.3), 0, 1.2);
      }
      for (const f of c.figures) if (!f.locked) f.y = c.horizon.y + (f.y - c.horizon.y) * rng.range(0.3, 0.6);
      resizeFiguresToEyeLevel(c);
      break;
    case 'dutchAngle':
      c.horizon.angle = (rng.chance(0.5) ? 1 : -1) * rng.range(12, 28);
      break;
    case 'switchPerspective':
      c.perspective.mode = c.perspective.mode === 'two' ? 'one' : 'two';
      if (c.perspective.mode === 'two') {
        const center = rng.range(0.2, 0.8);
        const span = rng.range(1, 2.5);
        c.perspective.vpLeft = center - span / 2;
        c.perspective.vpRight = center + span / 2;
      } else c.perspective.vp = rng.range(0.1, 0.9);
      break;
    case 'mirror':
      for (const f of c.figures)
        if (!f.locked) {
          f.x = 1 - f.x;
          f.facing = -f.facing;
        }
      for (const p of c.props)
        if (!p.locked) {
          p.x = 1 - p.x;
          p.flip = !p.flip;
        }
      c.perspective.vp = 1 - c.perspective.vp;
      [c.perspective.vpLeft, c.perspective.vpRight] = [1 - c.perspective.vpRight, 1 - c.perspective.vpLeft];
      c.horizon.angle = -c.horizon.angle;
      break;
  }
}

/** Apply 1–2 bold mutations followed by a light jitter. Returns the applied mutation names. */
export function mutate(
  template: Composition,
  rng: Rng,
  strength: number,
): { composition: Composition; applied: Mutation[] } {
  const c: Composition = structuredClone(template);
  const n = rng.chance(0.25 + 0.5 * strength) ? 2 : 1;
  const applied: Mutation[] = [];
  while (applied.length < n) {
    const m = rng.pick(MUTATIONS);
    if (!applied.includes(m)) applied.push(m);
  }
  for (const m of applied) applyMutation(c, m, rng);
  // Light jitter so repeated mutations of the same kind differ.
  const j = 0.02 + 0.05 * strength;
  for (const f of c.figures) if (!f.locked) f.x = clamp(f.x + rng.normal() * j, -0.2, 1.2);
  c.horizon.y = clamp(c.horizon.y + rng.normal() * j * 0.5, -0.2, 1.2);
  return { composition: c, applied };
}
