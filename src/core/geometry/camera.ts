/**
 * Camera / frame helpers shared by the renderer, the editor, and the
 * evaluation engine.
 *
 * "Scene units": the canvas is SCENE_HEIGHT units tall and
 * SCENE_HEIGHT * aspect units wide. World points are normalized ([0,1]) and
 * become scene units by multiplying with (W, H). The camera roll rotates
 * world space around the canvas center to produce the screen.
 */
import { aspectRatio, HUMAN_HEIGHT_M, type Composition } from '../model/composition';
import { rotateAround, type Vec2 } from './vec';

export const SCENE_HEIGHT = 1000;

export interface Frame {
  W: number;
  H: number;
  center: Vec2;
  roll: number;
  /** Horizon y in scene units (world space). */
  horizonY: number;
}

export function frameOf(c: Composition): Frame {
  const H = SCENE_HEIGHT;
  const W = H * aspectRatio(c);
  return {
    W,
    H,
    center: { x: W / 2, y: H / 2 },
    roll: c.horizon.angle,
    horizonY: c.horizon.y * H,
  };
}

/** Normalized world → scene units (world space, before roll). */
export function toUnits(f: Frame, p: Vec2): Vec2 {
  return { x: p.x * f.W, y: p.y * f.H };
}

/** Scene units (world) → normalized world. */
export function fromUnits(f: Frame, p: Vec2): Vec2 {
  return { x: p.x / f.W, y: p.y / f.H };
}

/** World scene units → screen scene units (applies camera roll). */
export function worldToScreen(f: Frame, p: Vec2): Vec2 {
  return rotateAround(p, f.center, f.roll);
}

/** Screen scene units → world scene units. */
export function screenToWorld(f: Frame, p: Vec2): Vec2 {
  return rotateAround(p, f.center, -f.roll);
}

/** Normalized world point → normalized screen point. */
export function worldToScreenNorm(f: Frame, p: Vec2): Vec2 {
  const s = worldToScreen(f, toUnits(f, p));
  return { x: s.x / f.W, y: s.y / f.H };
}

/**
 * Eye-level rule: on flat ground the horizon crosses every standing person
 * at the camera height. Given the feet y (normalized world), returns the body
 * height (fraction of canvas height) that is perspective-consistent, or null
 * when the feet are on/above the horizon (impossible on flat ground).
 */
export function eyeLevelFigureHeight(c: Composition, feetY: number): number | null {
  const d = feetY - c.horizon.y;
  if (d <= 1e-4) return null;
  return (d * HUMAN_HEIGHT_M) / c.horizon.cameraHeight;
}

/** Vanishing points in scene units (world space). */
export function vanishingPoints(c: Composition, f: Frame): Vec2[] {
  const y = f.horizonY;
  switch (c.perspective.mode) {
    case 'one':
      return [{ x: c.perspective.vp * f.W, y }];
    case 'two':
      return [
        { x: c.perspective.vpLeft * f.W, y },
        { x: c.perspective.vpRight * f.W, y },
      ];
    default:
      return [];
  }
}
