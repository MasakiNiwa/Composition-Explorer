/**
 * Shape generators for figures and props. All output is in world scene units.
 */
import type { Figure, Prop } from '../model/composition';
import type { Frame } from '../geometry/camera';
import { lerp, type Vec2 } from '../geometry/vec';
import type { Palette } from './palette';
import { boundsOfPoints, type Primitive, type SceneItem } from './primitives';

const flat = (pts: Vec2[]): number[] => pts.flatMap((p) => [p.x, p.y]);

function lineIntersection(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): Vec2 | null {
  const d = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((a1.x - b1.x) * (b1.y - b2.y) - (a1.y - b1.y) * (b1.x - b2.x)) / d;
  return { x: a1.x + t * (a2.x - a1.x), y: a1.y + t * (a2.y - a1.y) };
}

/** Human silhouette. Proportions follow a ~7.5-head canon. */
export function figureItem(fig: Figure, f: Frame, pal: Palette): SceneItem {
  const h = fig.height * f.H;
  const x = fig.x * f.W;
  const y = fig.y * f.H;
  const rad = (fig.facing * Math.PI) / 180;
  // Side views are narrower; sign tells which way the figure looks.
  const side = Math.sin(rad);
  const widthK = 0.55 + 0.45 * Math.abs(Math.cos(rad));
  const headR = h / 15;
  const style = {
    fill: pal.figure,
    stroke: pal.figureStroke,
    strokeWidth: Math.max(1, h * 0.006),
  };
  const prims: Primitive[] = [];

  const sitting = fig.pose === 'sitting';
  const walking = fig.pose === 'walking';
  // Vertical landmarks (measured upward from the feet).
  const hipY = y - h * (sitting ? 0.28 : 0.5);
  const shoulderY = y - h * (sitting ? 0.6 : 0.82);
  const neckY = shoulderY - h * 0.02;
  const headCY = neckY - headR * 1.05;
  const shoulderW = h * 0.13 * widthK;
  const hipW = h * 0.1 * widthK;
  const lean = walking ? side * h * 0.03 : 0;

  // Torso.
  prims.push({
    t: 'poly',
    closed: true,
    points: flat([
      { x: x - shoulderW + lean, y: shoulderY },
      { x: x + shoulderW + lean, y: shoulderY },
      { x: x + hipW, y: hipY },
      { x: x - hipW, y: hipY },
    ]),
    ...style,
  });
  // Head + a small nose bump showing the facing direction.
  prims.push({
    t: 'ellipse',
    cx: x + lean,
    cy: headCY,
    rx: headR * (0.85 + 0.15 * widthK),
    ry: headR,
    ...style,
  });
  if (Math.abs(side) > 0.3) {
    const nx = x + lean + Math.sign(side) * headR * 0.95;
    prims.push({
      t: 'poly',
      closed: true,
      points: [
        nx,
        headCY - headR * 0.15,
        nx + Math.sign(side) * headR * 0.3,
        headCY + headR * 0.1,
        nx,
        headCY + headR * 0.25,
      ],
      ...style,
    });
  }
  // Legs.
  const legW = h * 0.035;
  const spread = walking ? h * 0.12 : h * 0.03 * widthK;
  if (sitting) {
    const dir = side === 0 ? 1 : Math.sign(side);
    const knee = { x: x + dir * h * 0.2, y: hipY };
    for (const dx of [-legW, legW]) {
      prims.push({
        t: 'poly',
        closed: false,
        points: flat([{ x: x + dx * 0.5, y: hipY }, knee, { x: knee.x + dx * 0.3, y }]),
        stroke: pal.figure,
        strokeWidth: legW * 2,
      });
    }
  } else {
    for (const s of [-1, 1]) {
      prims.push({
        t: 'line',
        x1: x + s * hipW * 0.5,
        y1: hipY,
        x2: x + s * spread,
        y2: y - legW,
        stroke: pal.figure,
        strokeWidth: legW * 2,
      });
    }
  }
  // Arms.
  const armSwing = walking ? h * 0.08 : h * 0.02;
  for (const s of [-1, 1]) {
    prims.push({
      t: 'line',
      x1: x + s * shoulderW * 0.9 + lean,
      y1: shoulderY + legW,
      x2: x + s * (shoulderW + armSwing * 0.5) + lean - s * (walking ? s * side * armSwing : 0),
      y2: shoulderY + h * (sitting ? 0.25 : 0.36),
      stroke: pal.figure,
      strokeWidth: legW * 1.6,
    });
  }

  return {
    id: fig.id,
    kind: 'figure',
    prims,
    bounds: { x: x - h * 0.2, y: y - h, w: h * 0.4, h },
    anchor: { x, y },
  };
}

function propPrims(p: Prop, f: Frame, pal: Palette, vps: Vec2[]): Primitive[] {
  const w = p.width * f.H;
  const h = p.height * f.H;
  const x = p.x * f.W;
  const y = p.y * f.H;
  const s = p.flip ? -1 : 1;
  const col = pal.layer[p.layer];
  const base = { fill: col.fill, stroke: col.stroke, strokeWidth: 1.5 };
  const P = (dx: number, dy: number): Vec2 => ({ x: x + s * dx, y: y + dy });

  switch (p.kind) {
    case 'mountain':
      return [
        {
          t: 'poly',
          closed: true,
          points: flat([
            P(-w / 2, 0),
            P(-w * 0.28, -h * 0.62),
            P(-w * 0.14, -h * 0.5),
            P(w * 0.08, -h),
            P(w * 0.26, -h * 0.68),
            P(w / 2, 0),
          ]),
          ...base,
        },
      ];
    case 'rock':
      return [
        {
          t: 'poly',
          closed: true,
          points: flat([P(-w / 2, 0), P(-w * 0.4, -h * 0.6), P(-w * 0.05, -h), P(w * 0.35, -h * 0.75), P(w / 2, 0)]),
          ...base,
        },
      ];
    case 'tree': {
      const trunkW = w * 0.12;
      return [
        {
          t: 'poly',
          closed: true,
          points: flat([P(-trunkW / 2, 0), P(-trunkW / 2, -h * 0.4), P(trunkW / 2, -h * 0.4), P(trunkW / 2, 0)]),
          ...base,
          fill: col.shade,
        },
        {
          t: 'ellipse',
          cx: x,
          cy: y - h * 0.66,
          rx: w / 2,
          ry: h * 0.34,
          ...base,
        },
      ];
    }
    case 'bush':
      return [
        {
          t: 'ellipse',
          cx: x - s * w * 0.18,
          cy: y - h * 0.45,
          rx: w * 0.32,
          ry: h * 0.45,
          ...base,
        },
        {
          t: 'ellipse',
          cx: x + s * w * 0.15,
          cy: y - h * 0.5,
          rx: w * 0.35,
          ry: h * 0.5,
          ...base,
        },
      ];
    case 'fence': {
      const n = Math.max(2, Math.round(w / Math.max(h, 1) / 0.6) + 1);
      const prims: Primitive[] = [];
      for (let i = 0; i < n; i++) {
        const px = x - w / 2 + (w * i) / (n - 1);
        prims.push({
          t: 'line',
          x1: px,
          y1: y,
          x2: px,
          y2: y - h,
          stroke: col.stroke,
          strokeWidth: Math.max(2, w * 0.012),
        });
      }
      for (const k of [0.35, 0.8]) {
        prims.push({
          t: 'line',
          x1: x - w / 2,
          y1: y - h * k,
          x2: x + w / 2,
          y2: y - h * k,
          stroke: col.stroke,
          strokeWidth: Math.max(2, h * 0.08),
        });
      }
      return prims;
    }
    case 'cloud':
      return [
        {
          t: 'ellipse',
          cx: x - w * 0.22,
          cy: y + h * 0.1,
          rx: w * 0.28,
          ry: h * 0.4,
          fill: pal.cloud,
          opacity: 0.95,
        },
        {
          t: 'ellipse',
          cx: x + w * 0.05,
          cy: y - h * 0.15,
          rx: w * 0.3,
          ry: h * 0.5,
          fill: pal.cloud,
          opacity: 0.95,
        },
        {
          t: 'ellipse',
          cx: x + w * 0.27,
          cy: y + h * 0.12,
          rx: w * 0.23,
          ry: h * 0.36,
          fill: pal.cloud,
          opacity: 0.95,
        },
      ];
    case 'sun':
      return [
        {
          t: 'ellipse',
          cx: x,
          cy: y,
          rx: w / 2,
          ry: w / 2,
          fill: pal.sun,
          opacity: 0.95,
        },
      ];
    case 'tower': {
      const tw = w / 2;
      return [
        {
          t: 'poly',
          closed: true,
          points: flat([P(-tw, 0), P(-tw * 0.6, -h * 0.85), P(tw * 0.6, -h * 0.85), P(tw, 0)]),
          ...base,
        },
        {
          t: 'poly',
          closed: true,
          points: flat([P(-tw * 0.6, -h * 0.85), P(0, -h), P(tw * 0.6, -h * 0.85)]),
          ...base,
          fill: col.shade,
        },
      ];
    }
    case 'building':
      return boxPrims(x, y, w, h, f, vps, col);
  }
}

/**
 * A box drawn in true one/two-point perspective: receding edges converge on
 * the vanishing points so buildings agree with the ground grid.
 */
function boxPrims(
  x: number,
  y: number,
  w: number,
  h: number,
  f: Frame,
  vps: Vec2[],
  col: { fill: string; shade: string; stroke: string },
): Primitive[] {
  const st = { stroke: col.stroke, strokeWidth: 1.5 };
  const quad = (pts: Vec2[], fill: string): Primitive => ({
    t: 'poly',
    closed: true,
    points: flat(pts),
    fill,
    ...st,
  });
  const top = y - h;
  const topVisible = top > f.horizonY;

  if (vps.length === 1) {
    const vp = vps[0];
    const k = 0.22; // depth as a fraction of the distance to the VP
    const fl = { x: x - w / 2, y };
    const fr = { x: x + w / 2, y };
    const tl = { x: x - w / 2, y: top };
    const tr = { x: x + w / 2, y: top };
    const back = (p: Vec2) => lerp(p, vp, k);
    const prims: Primitive[] = [];
    if (vp.x > fr.x) prims.push(quad([fr, back(fr), back(tr), tr], col.shade));
    else if (vp.x < fl.x) prims.push(quad([fl, back(fl), back(tl), tl], col.shade));
    if (topVisible) prims.push(quad([tl, tr, back(tr), back(tl)], col.shade));
    prims.push(quad([fl, fr, tr, tl], col.fill));
    return prims;
  }

  if (vps.length === 2) {
    const [vl, vr] = vps;
    const cb = { x, y };
    const ct = { x, y: top };
    const tL = Math.min(0.85, (w * 0.5) / Math.max(1, Math.abs(vl.x - x)));
    const tR = Math.min(0.85, (w * 0.5) / Math.max(1, Math.abs(vr.x - x)));
    const lb = lerp(cb, vl, tL);
    const lt = lerp(ct, vl, tL);
    const rb = lerp(cb, vr, tR);
    const rt = lerp(ct, vr, tR);
    const prims: Primitive[] = [quad([cb, lb, lt, ct], col.fill), quad([cb, rb, rt, ct], col.shade)];
    if (topVisible) {
      const far = lineIntersection(lt, vr, rt, vl) ?? ct;
      prims.push(quad([ct, lt, far, rt], col.shade));
    }
    return prims;
  }

  return [
    quad(
      [
        { x: x - w / 2, y },
        { x: x + w / 2, y },
        { x: x + w / 2, y: top },
        { x: x - w / 2, y: top },
      ],
      col.fill,
    ),
  ];
}

export function propItem(p: Prop, f: Frame, pal: Palette, vps: Vec2[]): SceneItem {
  const prims = propPrims(p, f, pal, vps);
  const pts: number[] = [];
  for (const pr of prims) {
    if (pr.t === 'poly') pts.push(...pr.points);
    else if (pr.t === 'ellipse') pts.push(pr.cx - pr.rx, pr.cy - pr.ry, pr.cx + pr.rx, pr.cy + pr.ry);
    else if (pr.t === 'line') pts.push(pr.x1, pr.y1, pr.x2, pr.y2);
  }
  return {
    id: p.id,
    kind: 'prop',
    prims,
    bounds: boundsOfPoints(pts),
    anchor: { x: p.x * f.W, y: p.y * f.H },
  };
}
