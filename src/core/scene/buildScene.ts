/**
 * Composition → Scene (pure). The scene is a list of renderer-agnostic
 * primitives split into world-space layers (rotated by the camera roll) and a
 * screen-space overlay (composition guides).
 */
import type { Composition } from '../model/composition';
import { frameOf, vanishingPoints, type Frame } from '../geometry/camera';
import { PALETTES, type PaletteName } from './palette';
import type { Primitive, SceneItem } from './primitives';
import { figureItem, propItem } from './shapes';

export const GUIDE_KINDS = ['thirds', 'golden', 'diagonals', 'center', 'goldenSpiral'] as const;
export type GuideKind = (typeof GUIDE_KINDS)[number];

export interface SceneOptions {
  palette?: PaletteName;
  showGrid?: boolean;
  showHorizon?: boolean;
  guides?: GuideKind[];
}

export interface Scene {
  frame: Frame;
  /** Sky, ground and perspective grid (world space). */
  environment: Primitive[];
  /** Items in painter's order, back → front (world space). */
  items: SceneItem[];
  /** Horizon line (world space). */
  horizon: Primitive[];
  /** Composition guides (screen space). */
  guides: Primitive[];
}

const PHI = (1 + Math.sqrt(5)) / 2;

export function buildScene(c: Composition, opts: SceneOptions = {}): Scene {
  const pal = PALETTES[opts.palette ?? 'color'];
  const f = frameOf(c);
  const { W, H, horizonY: hy } = f;
  const vps = vanishingPoints(c, f);
  const env: Primitive[] = [];

  // Oversized sky/ground so the canvas stays covered under camera roll.
  const x0 = -W * 1.5;
  const x1 = W * 2.5;
  env.push({
    t: 'poly',
    closed: true,
    points: [x0, -H * 2, x1, -H * 2, x1, hy, x0, hy],
    fill: pal.skyTop,
  });
  env.push({
    t: 'poly',
    closed: true,
    points: [x0, hy - H * 0.15, x1, hy - H * 0.15, x1, hy, x0, hy],
    fill: pal.skyBottom,
    opacity: 0.8,
  });
  env.push({
    t: 'poly',
    closed: true,
    points: [x0, hy, x1, hy, x1, H * 3, x0, H * 3],
    fill: pal.ground,
  });
  env.push({
    t: 'poly',
    closed: true,
    points: [x0, hy, x1, hy, x1, hy + H * 0.04, x0, hy + H * 0.04],
    fill: pal.groundFar,
    opacity: 0.8,
  });

  if (opts.showGrid !== false) env.push(...perspectiveGrid(c, f, vps, pal.grid));

  // Painter's order: layer first, then base y (farther = smaller y = earlier).
  const layerRank = { background: 0, midground: 1, foreground: 2 } as const;
  type Entry = { rank: number; y: number; item: () => SceneItem };
  const entries: Entry[] = [
    ...c.props.map((p) => ({
      rank: layerRank[p.layer],
      y: p.kind === 'cloud' || p.kind === 'sun' ? -Infinity : p.y,
      item: () => propItem(p, f, pal, vps),
    })),
    ...c.figures.map((fig) => ({
      rank: 1,
      y: fig.y,
      item: () => figureItem(fig, f, pal, c.horizon.fov),
    })),
  ];
  entries.sort((a, b) => a.rank - b.rank || a.y - b.y);
  const items = entries.map((e) => e.item());

  const horizon: Primitive[] =
    opts.showHorizon === false
      ? []
      : [
          {
            t: 'line',
            x1: x0,
            y1: hy,
            x2: x1,
            y2: hy,
            stroke: pal.horizon,
            strokeWidth: 2,
            opacity: 0.9,
          },
        ];

  return {
    frame: f,
    environment: env,
    items,
    horizon,
    guides: guidePrims(W, H, opts.guides ?? []),
  };
}

function perspectiveGrid(c: Composition, f: Frame, vps: { x: number; y: number }[], stroke: string): Primitive[] {
  const { W, H, horizonY: hy } = f;
  const n = c.perspective.gridLines;
  const prims: Primitive[] = [];
  const style = { stroke, strokeWidth: 1 };
  const far = H * 3; // baseline well below the canvas
  if (vps.length === 0) return prims;

  for (const vp of vps) {
    // Fan of receding lines through evenly spaced points on the canvas bottom
    // edge (extended sideways), continued down to an off-canvas baseline.
    const below = H - vp.y;
    if (below < 1) continue;
    const ext = (far - vp.y) / below;
    for (let i = 0; i <= n * 2; i++) {
      const bx = -W * 1.5 + (W * 4 * i) / (n * 2);
      prims.push({ t: 'line', x1: vp.x, y1: vp.y, x2: vp.x + (bx - vp.x) * ext, y2: far, ...style });
    }
  }
  if (vps.length === 1) {
    // Transverse lines at equal world depth spacing: y = hy + k / d.
    const k = (H - hy) * 1.2;
    for (let d = 1; d <= n * 2; d++) {
      const y = hy + k / (d * 0.5);
      if (y > H * 3) continue;
      prims.push({
        t: 'line',
        x1: -W * 1.5,
        y1: y,
        x2: W * 2.5,
        y2: y,
        ...style,
        opacity: 0.8,
      });
    }
  }
  return prims;
}

function guidePrims(W: number, H: number, kinds: GuideKind[]): Primitive[] {
  const prims: Primitive[] = [];
  const g = (x1: number, y1: number, x2: number, y2: number, stroke: string, dash?: number[]) =>
    prims.push({
      t: 'line',
      x1,
      y1,
      x2,
      y2,
      stroke,
      strokeWidth: 1.5,
      opacity: 0.85,
      dash,
    });
  for (const k of kinds) {
    switch (k) {
      case 'thirds':
        for (const t of [1 / 3, 2 / 3]) {
          g(W * t, 0, W * t, H, '#f03e3e');
          g(0, H * t, W, H * t, '#f03e3e');
        }
        break;
      case 'golden': {
        const a = 1 / PHI ** 2;
        for (const t of [a, 1 - a]) {
          g(W * t, 0, W * t, H, '#f59f00', [8, 6]);
          g(0, H * t, W, H * t, '#f59f00', [8, 6]);
        }
        break;
      }
      case 'diagonals':
        g(0, 0, W, H, '#7048e8', [4, 6]);
        g(W, 0, 0, H, '#7048e8', [4, 6]);
        break;
      case 'center':
        g(W / 2, 0, W / 2, H, '#12b886', [2, 6]);
        g(0, H / 2, W, H / 2, '#12b886', [2, 6]);
        break;
      case 'goldenSpiral':
        prims.push({
          t: 'poly',
          closed: false,
          points: goldenSpiralPoints(W, H),
          stroke: '#f59f00',
          strokeWidth: 1.5,
          opacity: 0.85,
        });
        break;
    }
  }
  return prims;
}

/**
 * Golden spiral: quarter arcs inscribed in nested squares of a golden
 * rectangle, sampled to a polyline and stretched to the canvas (rotated 90°
 * on portrait canvases so it follows the long side).
 */
function goldenSpiralPoints(W: number, H: number): number[] {
  let x = 0;
  let y = 0;
  let w = PHI;
  let h = 1;
  const pts: number[] = [];
  const portrait = H > W;
  const emit = (u: number, v: number) => {
    if (portrait) pts.push((1 - v) * W, (u / PHI) * H);
    else pts.push((u / PHI) * W, v * H);
  };
  for (let i = 0; i < 12; i++) {
    const s = Math.min(w, h);
    let cx = 0;
    let cy = 0;
    let a0 = 0;
    switch (i % 4) {
      case 0: // square on the left
        cx = x + s;
        cy = y + s;
        a0 = Math.PI;
        x += s;
        w -= s;
        break;
      case 1: // square on the top
        cx = x;
        cy = y + s;
        a0 = -Math.PI / 2;
        y += s;
        h -= s;
        break;
      case 2: // square on the right
        cx = x + w - s;
        cy = y;
        a0 = 0;
        w -= s;
        break;
      case 3: // square on the bottom
        cx = x + w;
        cy = y + h - s;
        a0 = Math.PI / 2;
        h -= s;
        break;
    }
    // Sweep 90° (clockwise on screen) from a0.
    const steps = 10;
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const a = a0 + (Math.PI / 2) * (k / steps);
      emit(cx + s * Math.cos(a), cy + s * Math.sin(a));
    }
  }
  return pts;
}
