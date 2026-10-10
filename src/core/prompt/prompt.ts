/**
 * Composition → English prompt fragment for image-generation models.
 * Describes framing only (camera, horizon, placement), so it can be combined
 * with the user's own subject/style prompt.
 */
import { computeMetrics } from '../evaluation/evaluate';
import { extractFeatures } from '../evaluation/features';
import type { Composition } from '../model/composition';

const third = (x: number) => (x < 0.4 ? 'left' : x > 0.6 ? 'right' : 'center');
const vertical = (y: number) => (y < 0.4 ? 'upper' : y > 0.6 ? 'lower' : 'middle');

export function compositionPrompt(c: Composition): string {
  const f = extractFeatures(c);
  const m = computeMetrics(c, f);
  const parts: string[] = [];
  const ar = c.canvas.aspectW / c.canvas.aspectH;
  parts.push(ar > 1.1 ? 'wide landscape shot' : ar < 0.9 ? 'vertical portrait framing' : 'square composition');

  if (f.horizonY > 0.72) parts.push('low horizon', 'vast sky');
  else if (f.horizonY < 0.28) parts.push('high horizon', 'looking down at the ground');
  else if (Math.abs(f.horizonY - 0.5) < 0.05) parts.push('horizon at center');
  else parts.push(`horizon on the ${f.horizonY < 0.5 ? 'upper' : 'lower'} third`);
  if (c.horizon.cameraHeight > 6) parts.push("bird's-eye view", 'high camera');
  else if (c.horizon.cameraHeight < 0.8) parts.push('low angle shot', 'camera near the ground');
  else parts.push('eye-level shot');
  if (Math.abs(c.horizon.angle) >= 6) parts.push('dutch angle', 'tilted horizon');

  if (c.perspective.mode === 'one') parts.push('one-point perspective', `vanishing point ${third(c.perspective.vp)}`);
  if (c.perspective.mode === 'two') {
    parts.push('two-point perspective');
    if (c.perspective.vpRight - c.perspective.vpLeft < 1.5) parts.push('strong perspective', 'wide-angle lens');
  }

  const figs = f.figures.filter((x) => x.subject.area > 0);
  if (figs.length === 1) {
    const s = figs[0].subject;
    const size =
      s.height < 0.1
        ? 'tiny distant figure'
        : s.height < 0.3
          ? 'small figure'
          : s.height < 0.7
            ? 'medium shot of a person'
            : 'close-up of a person';
    parts.push(`${size} in the ${vertical(s.focus.y)} ${third(s.focus.x)} of the frame`);
    const dir = Math.sin((c.figures.find((x) => x.id === s.id)?.facing ?? 0) * (Math.PI / 180));
    if (Math.abs(dir) > 0.5) parts.push(`facing ${dir > 0 ? 'right' : 'left'}`);
  } else if (figs.length > 1) parts.push(`${figs.length} people`);

  const kinds = new Set(c.props.map((p) => p.kind));
  if (kinds.has('mountain')) parts.push('mountains in the distance');
  if (kinds.has('building') || kinds.has('tower')) parts.push('buildings');
  if (kinds.has('tree')) parts.push('trees');
  if (c.props.some((p) => p.layer === 'foreground' && p.kind !== 'cloud')) parts.push('foreground framing elements');
  if (m.negativeSpace > 80) parts.push('minimalist', 'lots of negative space');
  if (m.symmetry > 80) parts.push('symmetrical composition');
  else if (m.thirds > 70) parts.push('rule of thirds');
  if (m.depth > 75) parts.push('strong sense of depth');
  return parts.join(', ');
}
