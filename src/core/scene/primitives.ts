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
  | ({ t: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & Style)
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
