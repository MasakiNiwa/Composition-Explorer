/**
 * Feature extraction: Composition → screen-space numeric description.
 * Kept analytic (no scene/primitives) so it is cheap enough to run thousands
 * of times per second inside exploration workers.
 */
import { eyeLevelFigureHeight, frameOf, worldToScreen, type Frame } from '../geometry/camera';
import type { Vec2 } from '../geometry/vec';
import type { Composition, Layer, PropKind } from '../model/composition';

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Subject {
  id: string;
  kind: 'figure' | PropKind;
  layer: Layer;
  /** Visible screen bounds, normalized to [0,1] and clipped to the canvas. */
  box: Box | null;
  /** Visible area fraction of the canvas. */
  area: number;
  /** Visual weight (area × saliency). */
  weight: number;
  /** Point of interest (figure head / prop center), normalized screen space. */
  focus: Vec2;
  /** Height in world (fraction of canvas height). */
  height: number;
  /** True when the subject counts as "content" for negative space. */
  solid: boolean;
}

export interface Features {
  frame: Frame;
  aspect: number;
  subjects: Subject[];
  /** Most salient subject (figures preferred), if any. */
  primary: Subject | null;
  /** Weighted centroid of visual weight (normalized screen). */
  centroid: Vec2 | null;
  totalWeight: number;
  /** Horizon y at the canvas center (normalized screen). */
  horizonY: number;
  horizonVisible: boolean;
  roll: number;
  /** Vanishing points in normalized screen space. */
  vps: Vec2[];
  /** Fraction of the canvas not covered by solid subjects. */
  emptyRatio: number;
  /** Coarse occupancy grid of visual weight (GRID × GRID), row-major. */
  weightGrid: Float32Array;
  /** Figures with their eye-level consistency information. */
  figures: { subject: Subject; facing: number; ideal: number | null }[];
}

export const GRID = 24;

const SALIENCY: Record<'figure' | PropKind, number> = {
  figure: 4,
  building: 1.2,
  tower: 1.4,
  tree: 1,
  bush: 0.6,
  rock: 0.7,
  fence: 0.5,
  mountain: 0.35,
  cloud: 0.25,
  sun: 1.5,
};
const LAYER_K: Record<Layer, number> = { background: 0.6, midground: 1, foreground: 1.1 };
/** Kinds that read as sky/landscape rather than "content" for negative space. */
const NON_SOLID = new Set<string>(['cloud', 'mountain', 'sun']);

function clipBox(b: Box): Box | null {
  const x0 = Math.max(0, b.x0);
  const y0 = Math.max(0, b.y0);
  const x1 = Math.min(1, b.x1);
  const y1 = Math.min(1, b.y1);
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null;
}

/** World-space rect (scene units) → normalized screen AABB after roll. */
function screenBox(f: Frame, x0: number, y0: number, x1: number, y1: number): Box {
  const pts = [
    worldToScreen(f, { x: x0, y: y0 }),
    worldToScreen(f, { x: x1, y: y0 }),
    worldToScreen(f, { x: x0, y: y1 }),
    worldToScreen(f, { x: x1, y: y1 }),
  ];
  const xs = pts.map((p) => p.x / f.W);
  const ys = pts.map((p) => p.y / f.H);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

const toScreenNorm = (f: Frame, p: Vec2): Vec2 => {
  const s = worldToScreen(f, p);
  return { x: s.x / f.W, y: s.y / f.H };
};

export function extractFeatures(c: Composition): Features {
  const f = frameOf(c);
  const { W, H } = f;
  const subjects: Subject[] = [];
  const figures: Features['figures'] = [];

  for (const fig of c.figures) {
    const h = fig.height * H;
    const x = fig.x * W;
    const y = fig.y * H;
    const raw = screenBox(f, x - h * 0.2, y - h, x + h * 0.2, y);
    const box = clipBox(raw);
    // Silhouette fills roughly 45% of its bounding box.
    const area = box ? (box.x1 - box.x0) * (box.y1 - box.y0) * 0.45 : 0;
    const s: Subject = {
      id: fig.id,
      kind: 'figure',
      layer: 'midground',
      box,
      area,
      weight: area * SALIENCY.figure,
      focus: toScreenNorm(f, { x, y: y - h * 0.88 }),
      height: fig.height,
      solid: true,
    };
    subjects.push(s);
    figures.push({ subject: s, facing: fig.facing, ideal: eyeLevelFigureHeight(c, fig.y) });
  }

  for (const p of c.props) {
    const w = p.width * H;
    const h = p.height * H;
    const x = p.x * W;
    const y = p.y * H;
    const centered = p.kind === 'cloud' || p.kind === 'sun';
    const hh = p.kind === 'sun' ? w : h;
    const raw = centered
      ? screenBox(f, x - w / 2, y - hh / 2, x + w / 2, y + hh / 2)
      : screenBox(f, x - w / 2, y - h, x + w / 2, y);
    const box = clipBox(raw);
    const fill = p.kind === 'fence' ? 0.3 : p.kind === 'mountain' ? 0.55 : 0.75;
    const area = box ? (box.x1 - box.x0) * (box.y1 - box.y0) * fill : 0;
    subjects.push({
      id: p.id,
      kind: p.kind,
      layer: p.layer,
      box,
      area,
      weight: area * SALIENCY[p.kind] * LAYER_K[p.layer],
      focus: box ? { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 } : toScreenNorm(f, { x, y }),
      height: p.height,
      solid: !NON_SOLID.has(p.kind),
    });
  }

  // Weight grid + coverage.
  const grid = new Float32Array(GRID * GRID);
  const covered = new Uint8Array(GRID * GRID);
  for (const s of subjects) {
    if (!s.box || s.area <= 0) continue;
    const gx0 = Math.floor(s.box.x0 * GRID);
    const gx1 = Math.min(GRID - 1, Math.floor(s.box.x1 * GRID - 1e-9));
    const gy0 = Math.floor(s.box.y0 * GRID);
    const gy1 = Math.min(GRID - 1, Math.floor(s.box.y1 * GRID - 1e-9));
    const cells = (gx1 - gx0 + 1) * (gy1 - gy0 + 1);
    const per = s.weight / cells;
    for (let gy = gy0; gy <= gy1; gy++)
      for (let gx = gx0; gx <= gx1; gx++) {
        grid[gy * GRID + gx] += per;
        if (s.solid) covered[gy * GRID + gx] = 1;
      }
  }
  let coveredCount = 0;
  for (const v of covered) coveredCount += v;

  let totalWeight = 0;
  let cx = 0;
  let cy = 0;
  for (const s of subjects) {
    if (s.weight <= 0) continue;
    totalWeight += s.weight;
    const bx = s.box ? (s.box.x0 + s.box.x1) / 2 : s.focus.x;
    const by = s.box ? (s.box.y0 + s.box.y1) / 2 : s.focus.y;
    cx += bx * s.weight;
    cy += by * s.weight;
  }
  const centroid = totalWeight > 0 ? { x: cx / totalWeight, y: cy / totalWeight } : null;

  const visible = subjects.filter((s) => s.weight > 0);
  const figs = visible.filter((s) => s.kind === 'figure');
  const pool = figs.length ? figs : visible.filter((s) => s.solid || s.kind === 'sun');
  const primary = pool.reduce<Subject | null>((best, s) => (!best || s.weight > best.weight ? s : best), null);

  const hc = toScreenNorm(f, { x: W / 2, y: f.horizonY });
  const vps =
    c.perspective.mode === 'one'
      ? [toScreenNorm(f, { x: c.perspective.vp * W, y: f.horizonY })]
      : c.perspective.mode === 'two'
        ? [
            toScreenNorm(f, { x: c.perspective.vpLeft * W, y: f.horizonY }),
            toScreenNorm(f, { x: c.perspective.vpRight * W, y: f.horizonY }),
          ]
        : [];

  return {
    frame: f,
    aspect: W / H,
    subjects,
    primary,
    centroid,
    totalWeight,
    horizonY: hc.y,
    horizonVisible: hc.y > 0.02 && hc.y < 0.98,
    roll: c.horizon.angle,
    vps,
    emptyRatio: 1 - coveredCount / (GRID * GRID),
    weightGrid: grid,
    figures,
  };
}
