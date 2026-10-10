export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const deg2rad = (d: number): number => (d * Math.PI) / 180;

/** Rotate point `p` around `c` by `deg` degrees (clockwise in screen space, y down). */
export function rotateAround(p: Vec2, c: Vec2, deg: number): Vec2 {
  const r = deg2rad(deg);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

/** Intersection of segment p→q with the horizontal line y = h (if any). */
export function intersectY(p: Vec2, q: Vec2, h: number): Vec2 | null {
  if (p.y === q.y) return null;
  const t = (h - p.y) / (q.y - p.y);
  if (t < 0 || t > 1) return null;
  return lerp(p, q, t);
}
