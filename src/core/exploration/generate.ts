/**
 * Candidate generation: template composition + spec + rng → new composition.
 * Locked objects and Fixed parameters keep the template's values.
 */
import { eyeLevelFigureHeight } from '../geometry/camera';
import { PROP_DEFAULTS } from '../model/propDefaults';
import type { Composition, Figure, PerspectiveMode } from '../model/composition';
import type { Rng } from '../random/prng';
import type { ExplorationSpec, NumericParam } from './spec';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Sample one numeric parameter. In Free mode, Discovery occasionally pushes
 * values to the extremes of the allowed range (bold horizons, hard tilts…).
 */
export function sampleParam(spec: ExplorationSpec, key: NumericParam, templateValue: number, rng: Rng): number {
  const p = spec.params[key];
  if (p.mode === 'fixed') return templateValue;
  const lo = Math.min(p.min, p.max);
  const hi = Math.max(p.min, p.max);
  if (p.mode === 'free' && rng.chance(0.45 * spec.discovery)) {
    const t = rng.range(0, 0.15);
    return rng.chance(0.5) ? lo + (hi - lo) * t : hi - (hi - lo) * t;
  }
  return rng.range(lo, hi);
}

function pickPerspective(spec: ExplorationSpec, template: PerspectiveMode, rng: Rng): PerspectiveMode {
  if (spec.perspectiveMode === 'fixed') return template;
  const r = rng.next();
  return r < 0.25 ? 'none' : r < 0.65 ? 'one' : 'two';
}

const GROUND = new Set(['building', 'tree', 'bush', 'rock', 'fence']);

export function generateCandidate(template: Composition, spec: ExplorationSpec, rng: Rng): Composition {
  const c: Composition = structuredClone(template);
  c.seed = spec.seed;

  c.horizon.y = sampleParam(spec, 'horizonY', template.horizon.y, rng);
  c.horizon.angle = clamp(sampleParam(spec, 'roll', template.horizon.angle, rng), -45, 45);
  // Small accidental tilts read as mistakes: snap |roll| < 1.5° to level.
  if (spec.params.roll.mode !== 'fixed' && Math.abs(c.horizon.angle) < 1.5) c.horizon.angle = 0;

  c.perspective.mode = pickPerspective(spec, template.perspective.mode, rng);
  if (c.perspective.mode === 'one') c.perspective.vp = sampleParam(spec, 'vp', template.perspective.vp, rng);
  if (c.perspective.mode === 'two') {
    const tSpan = template.perspective.vpRight - template.perspective.vpLeft;
    const span = sampleParam(spec, 'vpSpan', tSpan, rng);
    const center =
      spec.params.vpSpan.mode === 'fixed'
        ? (template.perspective.vpLeft + template.perspective.vpRight) / 2
        : rng.range(0.2, 0.8);
    c.perspective.vpLeft = center - span / 2;
    c.perspective.vpRight = center + span / 2;
  }

  // Figures: count, position, size.
  const locked = template.figures.filter((f) => f.locked);
  const unlocked = template.figures.filter((f) => !f.locked);
  let count = unlocked.length;
  if (spec.figureCount.mode !== 'fixed') {
    const lo = spec.figureCount.mode === 'free' ? 0 : spec.figureCount.min;
    const hi = spec.figureCount.mode === 'free' ? 3 : spec.figureCount.max;
    count = Math.max(0, rng.int(Math.min(lo, hi), Math.max(lo, hi)) - locked.length);
  }
  const figures: Figure[] = [...locked];
  for (let i = 0; i < count; i++) {
    const base: Figure = unlocked[i] ?? {
      id: `fig-x${i}`,
      x: 0.5,
      y: 0.9,
      height: 0.25,
      facing: 0,
      pose: 'standing',
      locked: false,
    };
    const f: Figure = { ...base };
    f.x = sampleParam(spec, 'figureX', base.x, rng);
    const ground = Math.max(0.02, 1 - c.horizon.y);
    const tDepth = clamp((base.y - template.horizon.y) / Math.max(0.02, 1 - template.horizon.y), 0, 1.2);
    f.y = c.horizon.y + 0.01 + sampleParam(spec, 'figureDepth', tDepth, rng) * ground;
    const ideal = eyeLevelFigureHeight(c, f.y);
    if (spec.eyeLevelSizing && ideal != null) f.height = clamp(ideal * rng.range(0.88, 1.12), 0.01, 3);
    else f.height = sampleParam(spec, 'figureSize', base.height, rng);
    if (spec.params.figureX.mode !== 'fixed' && rng.chance(0.5)) f.facing = rng.pick([-90, -45, 0, 0, 45, 90]);
    figures.push(f);
  }
  c.figures = figures;

  // Props.
  if (spec.props !== 'fixed') {
    c.props = template.props.map((p) => {
      if (p.locked) return p;
      const q = { ...p };
      const sky = p.kind === 'cloud' || p.kind === 'sun';
      if (spec.props === 'jitter') {
        q.x = clamp(p.x + rng.normal() * 0.12, -0.3, 1.3);
        const s = Math.exp(rng.normal() * 0.2);
        q.width = clamp(p.width * s, 0.01, 4);
        q.height = clamp(p.height * s, 0.01, 4);
      } else {
        q.x = rng.range(-0.1, 1.1);
        const s = Math.exp(rng.normal() * 0.4);
        q.width = clamp(p.width * s, 0.01, 4);
        q.height = clamp(p.height * s, 0.01, 4);
        q.flip = rng.chance(0.5);
      }
      // Keep vertical anchoring consistent with the new horizon.
      const anchor = PROP_DEFAULTS[p.kind].anchor;
      if (sky) q.y = clamp(c.horizon.y * (p.y / Math.max(0.02, template.horizon.y)), -0.2, c.horizon.y);
      else if (anchor === 'horizon' || p.layer === 'background') q.y = c.horizon.y + (p.y - template.horizon.y);
      else if (GROUND.has(p.kind)) {
        const tDepth = (p.y - template.horizon.y) / Math.max(0.02, 1 - template.horizon.y);
        const depth = spec.props === 'free' ? rng.range(0.05, 1.1) : clamp(tDepth + rng.normal() * 0.08, 0.02, 1.2);
        q.y = c.horizon.y + depth * Math.max(0.02, 1 - c.horizon.y);
      }
      return q;
    });
  }
  return c;
}
