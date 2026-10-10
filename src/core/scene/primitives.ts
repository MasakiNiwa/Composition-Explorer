/**
 * Renderer-agnostic drawing primitives. The scene builder emits these and any
 * backend (SVG today; Canvas/WebGL/Python later) can draw them.
 */
export interface Style {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  dash?: number[];
}

export type Primitive =
  | ({ t: 'poly'; points: number[]; closed: boolean } & Style)
  | ({
      t: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      /** degrees, clockwise */ rotate?: number;
    } & Style)
  | ({ t: 'line'; x1: number; y1: number; x2: number; y2: number } & Style)
  | ({ t: 'path'; d: string } & Style);

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A selectable thing in the scene (figure or prop). */
export interface SceneItem {
  id: string;
  kind: 'figure' | 'prop';
  prims: Primitive[];
  /** Axis-aligned bounds in world scene units. */
  bounds: Bounds;
  /** Anchor (base / feet) in world scene units. */
  anchor: { x: number; y: number };
}

export function boundsOfPoints(pts: number[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]);
    maxX = Math.max(maxX, pts[i]);
    minY = Math.min(minY, pts[i + 1]);
    maxY = Math.max(maxY, pts[i + 1]);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Rotate primitives clockwise (screen, y down) by `deg` around (cx, cy). */
export function rotatePrims(prims: Primitive[], cx: number, cy: number, deg: number): Primitive[] {
  if (!deg) return prims;
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const rot = (x: number, y: number): [number, number] => [
    cx + (x - cx) * cos - (y - cy) * sin,
    cy + (x - cx) * sin + (y - cy) * cos,
  ];
  return prims.map((p) => {
    switch (p.t) {
      case 'poly': {
        const pts: number[] = [];
        for (let i = 0; i < p.points.length; i += 2) pts.push(...rot(p.points[i], p.points[i + 1]));
        return { ...p, points: pts };
      }
      case 'line': {
        const [x1, y1] = rot(p.x1, p.y1);
        const [x2, y2] = rot(p.x2, p.y2);
        return { ...p, x1, y1, x2, y2 };
      }
      case 'ellipse': {
        const [ex, ey] = rot(p.cx, p.cy);
        return { ...p, cx: ex, cy: ey, rotate: (p.rotate ?? 0) + deg };
      }
      default:
        return p;
    }
  });
}

/** Points covering a primitive (for bounds). */
export function primitivePoints(p: Primitive): number[] {
  switch (p.t) {
    case 'poly':
      return p.points;
    case 'line':
      return [p.x1, p.y1, p.x2, p.y2];
    case 'ellipse': {
      const r = Math.max(p.rx, p.ry);
      return [p.cx - r, p.cy - r, p.cx + r, p.cy + r];
    }
    default:
      return [];
  }
}
