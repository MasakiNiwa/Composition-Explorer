/** Helpers that keep a composition physically consistent after camera changes. */
import { eyeLevelFigureHeight } from '../geometry/camera';
import type { Composition } from '../model/composition';

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Re-size unlocked figures (except `skip`) by the eye-level rule. */
export function resizeFiguresToEyeLevel(c: Composition, k = 1, skip?: string) {
  for (const f of c.figures) {
    if (f.locked || f.id === skip) continue;
    if (f.y <= c.horizon.y + 0.01) f.y = c.horizon.y + 0.02;
    const h = eyeLevelFigureHeight(c, f.y);
    if (h != null) f.height = clamp(h * k, 0.01, 8);
  }
}

/**
 * Move unlocked objects so they keep their relative depth after the horizon
 * moved from `oldH` to the current one. Ground objects keep their fraction of
 * the ground area; distant ones move with the horizon; sky ones stay in the sky.
 */
export function rebaseOnHorizon(c: Composition, oldH: number, skip?: string) {
  const newH = c.horizon.y;
  const gOld = 1 - oldH;
  const gNew = 1 - newH;
  const map = (y: number) => (gOld > 0.05 && gNew > 0.05 ? newH + ((y - oldH) / gOld) * gNew : y + (newH - oldH));
  for (const f of c.figures) if (!f.locked && f.id !== skip) f.y = clamp(map(f.y), -6, 8);
  for (const p of c.props) {
    if (p.locked) continue;
    if (p.kind === 'cloud' || p.kind === 'sun')
      p.y = oldH > 0.05 ? clamp((p.y / oldH) * Math.max(0.05, newH), -0.3, newH) : p.y + (newH - oldH);
    else if (p.layer === 'background' || p.kind === 'mountain' || p.kind === 'tower') p.y = newH + (p.y - oldH);
    else p.y = clamp(map(p.y), -6, 8);
  }
}
