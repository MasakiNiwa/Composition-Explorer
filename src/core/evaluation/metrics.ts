/**
 * Composition Engine — independent metric functions (0–100).
 *
 * Each metric describes how strongly a composition exhibits a property. They
 * are relative indicators, not measures of beauty. Presets combine them with
 * weights (see presets.ts).
 */
import type { Vec2 } from '../geometry/vec';
import { GRID, type Features } from './features';

export const METRIC_KEYS = [
  'thirds',
  'golden',
  'symmetry',
  'balance',
  'flow',
  'depth',
  'negativeSpace',
  'dynamics',
  'perspective',
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export type Metrics = Record<MetricKey, number>;

const PHI_A = 1 / ((1 + Math.sqrt(5)) / 2) ** 2; // ≈ 0.382
const gauss = (d: number, sigma: number) => Math.exp(-((d / sigma) ** 2) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const pct = (v: number) => Math.round(clamp01(v) * 1000) / 10;

/** Area-preserving distance: wide/tall canvases are not distorted. */
function dist(f: Features, a: Vec2, b: Vec2): number {
  const k = Math.sqrt(f.aspect);
  return Math.hypot((a.x - b.x) * k, (a.y - b.y) / k);
}

/** Alignment score of the primary subject and horizon to a set of lines at fraction `t`. */
function gridAlignment(f: Features, t: number): number {
  const lines = [t, 1 - t];
  const parts: [number, number][] = [];
  if (f.primary) {
    const p = f.primary.focus;
    const points = lines.flatMap((x) => lines.map((y) => ({ x, y })));
    const dPoint = Math.min(...points.map((q) => dist(f, p, q)));
    const dLine = Math.min(...lines.map((l) => Math.abs(p.x - l)), ...lines.map((l) => Math.abs(p.y - l)));
    parts.push([gauss(dPoint, 0.06), 0.45], [gauss(dLine, 0.03), 0.2]);
  }
  if (f.horizonVisible) {
    const dH = Math.min(...lines.map((l) => Math.abs(f.horizonY - l)));
    parts.push([gauss(dH, 0.025), 0.35]);
  }
  if (parts.length === 0) return 0;
  const wsum = parts.reduce((a, [, w]) => a + w, 0);
  return parts.reduce((a, [v, w]) => a + v * w, 0) / wsum;
}

export function thirds(f: Features): number {
  return pct(gridAlignment(f, 1 / 3));
}

export function golden(f: Features): number {
  return pct(gridAlignment(f, PHI_A));
}

/** Left–right mirror similarity of the visual-weight map, reduced by camera roll. */
export function symmetry(f: Features): number {
  let diff = 0;
  let total = 0;
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const a = f.weightGrid[y * GRID + x];
      const b = f.weightGrid[y * GRID + (GRID - 1 - x)];
      diff += Math.abs(a - b);
      total += a + b;
    }
  let s = total > 0 ? 1 - diff / total : 1;
  // A centered one-point VP is the classic symmetric setup.
  if (f.vps.length === 1) s = 0.75 * s + 0.25 * gauss(Math.abs(f.vps[0].x - 0.5), 0.06);
  // An upside-down frame (≈180°) can be just as symmetric as a level one.
  const r = Math.abs(f.roll) % 180;
  return pct(s * gauss(Math.min(r, 180 - r), 6));
}

/** Visual balance: weighted centroid close to the canvas center (horizontal matters most). */
export function balance(f: Features): number {
  if (!f.centroid) return 50;
  const dx = Math.abs(f.centroid.x - 0.5);
  const dy = Math.abs(f.centroid.y - 0.55);
  return pct(0.75 * gauss(dx, 0.12) + 0.25 * gauss(dy, 0.2));
}

/** Visual flow: leading lines toward the subject, diagonal placement, and looking room. */
export function flow(f: Features): number {
  const parts: [number, number][] = [];
  const p = f.primary?.focus;
  if (p && f.vps.length) {
    const d = Math.min(...f.vps.map((v) => dist(f, p, v)));
    parts.push([gauss(d, 0.18), 0.4]);
  }
  if (p) {
    // Distance to the two main diagonals (in normalized space).
    const d1 = Math.abs(p.x - p.y) / Math.SQRT2;
    const d2 = Math.abs(p.x + p.y - 1) / Math.SQRT2;
    parts.push([gauss(Math.min(d1, d2), 0.05), 0.3]);
  }
  const fig = f.figures.find((x) => x.subject === f.primary);
  if (fig) {
    const dir = Math.sin((fig.facing * Math.PI) / 180);
    if (Math.abs(dir) > 0.3) {
      // Looking room: facing toward the side with more space.
      const room = dir > 0 ? 1 - fig.subject.focus.x : fig.subject.focus.x;
      parts.push([clamp01((room - 0.3) / 0.4), 0.3]);
    } else {
      parts.push([0.6, 0.15]);
    }
  }
  if (parts.length === 0) return 0;
  const wsum = parts.reduce((a, [, w]) => a + w, 0);
  return pct(parts.reduce((a, [v, w]) => a + v * w, 0) / wsum);
}

/** Depth: layering, perspective, and scale contrast between near and far subjects. */
export function depth(f: Features): number {
  const visible = f.subjects.filter((s) => s.weight > 0);
  const layers = new Set(visible.map((s) => s.layer));
  const layerScore =
    (layers.has('background') ? 0.3 : 0) + (layers.has('midground') ? 0.3 : 0) + (layers.has('foreground') ? 0.4 : 0);
  const persp = f.vps.length === 0 ? 0 : f.vps.length === 1 ? 0.8 : 1;
  const heights = visible
    .filter((s) => s.kind === 'figure' || s.kind === 'tree' || s.kind === 'building')
    .map((s) => s.height);
  let scale = 0;
  if (heights.length >= 2) scale = clamp01(Math.log(Math.max(...heights) / Math.min(...heights)) / Math.log(5));
  return pct(0.45 * layerScore + 0.3 * persp + 0.25 * scale);
}

/** Negative space: fraction of the frame left empty by solid subjects. */
export function negativeSpace(f: Features): number {
  return pct(f.emptyRatio);
}

/** Dynamics: tilt, asymmetry, diagonal placement and perspective strength. */
export function dynamics(f: Features, sym: number): number {
  // Tilt energy peaks at oblique angles; an inverted world is striking in itself.
  const r = Math.abs(f.roll) % 180;
  const tilt = Math.max(clamp01(Math.min(r, 180 - r) / 20), Math.abs(f.roll) > 135 ? 0.8 : 0);
  const asym = 1 - sym / 100;
  let persp = 0;
  if (f.vps.length === 1) persp = clamp01(Math.abs(f.vps[0].x - 0.5) / 0.5);
  if (f.vps.length === 2) persp = clamp01(1.6 / Math.max(0.1, Math.abs(f.vps[1].x - f.vps[0].x)) - 0.4);
  let diag = 0;
  const p = f.primary?.focus;
  if (p) {
    const d = Math.min(Math.abs(p.x - p.y), Math.abs(p.x + p.y - 1)) / Math.SQRT2;
    diag = gauss(d, 0.06) * clamp01(Math.hypot(p.x - 0.5, p.y - 0.5) / 0.3);
  }
  return pct(0.35 * tilt + 0.25 * asym + 0.2 * persp + 0.2 * diag);
}

/**
 * Perspective consistency: figures follow the eye-level rule and ground
 * objects stand below the horizon. 100 = fully consistent.
 */
export function perspective(f: Features, groundBases: { y: number; layer: string }[]): number {
  const scores: number[] = [];
  for (const fig of f.figures) {
    if (!fig.upright) continue; // tumbling/flying figures are free of the eye-level rule
    if (fig.ideal == null) {
      scores.push(0);
      continue;
    }
    const err = Math.log(fig.subject.height / fig.ideal);
    scores.push(gauss(err, 0.25));
  }
  const hy = f.frame.horizonY / f.frame.H;
  for (const b of groundBases) scores.push(b.y >= hy - 0.005 ? 1 : gauss(hy - b.y, 0.03));
  if (scores.length === 0) return 100;
  return pct(scores.reduce((a, b) => a + b, 0) / scores.length);
}
