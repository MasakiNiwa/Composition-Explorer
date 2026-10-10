/**
 * Shots and camera work: framing a figure as a portrait (medium / bust /
 * close-up) and bold camera moves (inverted world, worm's-eye, bird's-eye,
 * over-the-shoulder). Everything stays consistent with the eye-level rule:
 * the horizon is derived from where the camera is, not the other way round.
 */
import { HUMAN_HEIGHT_M, newId, type Composition, type Figure } from '../model/composition';
import type { Rng } from '../random/prng';
import { clamp, rebaseOnHorizon, resizeFiguresToEyeLevel } from './rebase';

export const SHOTS = ['wide', 'full', 'medium', 'bust', 'closeUp'] as const;
export type Shot = (typeof SHOTS)[number];
export type ShotChoice = 'auto' | Shot;

/** Figure height (as a fraction of the canvas height) per shot. */
const SHOT_HEIGHT: Record<Exclude<Shot, 'wide'>, [number, number]> = {
  full: [0.5, 0.9],
  medium: [1.3, 2.0],
  bust: [2.3, 3.2],
  closeUp: [4.0, 5.5],
};

/** Head center as a fraction of body height (from the feet). */
const HEAD_K = 1.55 / 1.65;

export const CAMERA_MOVES = ['invert', 'extremeDutch', 'wormsEye', 'birdsEye', 'overShoulder'] as const;
export type CameraMove = (typeof CAMERA_MOVES)[number];

function pickWeighted<T extends string>(rng: Rng, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  let r = rng.next() * entries.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries[entries.length - 1][0];
}

/** Shot to use for one candidate. Close shots are common enough to show up in every preset. */
export function pickShot(choice: ShotChoice, portraitBias: boolean, rng: Rng): Shot {
  if (choice !== 'auto') return choice;
  return pickWeighted(
    rng,
    portraitBias
      ? { wide: 0.08, full: 0.17, medium: 0.25, bust: 0.28, closeUp: 0.22 }
      : { wide: 0.5, full: 0.15, medium: 0.14, bust: 0.12, closeUp: 0.09 },
  );
}

/** Camera height: mostly eye level, sometimes low or high angle. */
function pickCameraHeight(rng: Rng): number {
  const r = rng.next();
  if (r < 0.6) return rng.range(1.3, 1.8);
  if (r < 0.8) return rng.range(0.5, 1.1);
  return rng.range(2.2, 3.5);
}

/**
 * Frame the first unlocked figure for the given shot. The horizon follows
 * from the camera height so the background stays consistent.
 */
export function applyShot(c: Composition, shot: Shot, rng: Rng): void {
  if (shot === 'wide') return;
  const fig = c.figures.find((f) => !f.locked);
  if (!fig) return;
  const oldH = c.horizon.y;
  const [lo, hi] = SHOT_HEIGHT[shot];
  fig.height = rng.range(lo, hi);
  c.horizon.cameraHeight = pickCameraHeight(rng);
  if (shot === 'full') {
    fig.y = rng.range(0.78, 0.96);
  } else {
    const headY = rng.range(0.24, shot === 'closeUp' ? 0.5 : 0.42);
    fig.y = headY + fig.height * HEAD_K;
  }
  fig.x = clamp(rng.pick([1 / 3, 2 / 3, 0.5, 0.42, 0.58]) + rng.normal() * 0.04, 0.15, 0.85);
  fig.facing = rng.pick([-40, -25, 0, 0, 25, 40, -70, 70]);
  fig.tilt = 0;
  fig.roll = 0;
  if (shot !== 'full') fig.pose = rng.pick(['standing', 'standing', 'reaching', 'walking'] as const);
  // Eye-level rule solved for the horizon: feet − height·(camera / person).
  c.horizon.y = clamp(fig.y - (fig.height * c.horizon.cameraHeight) / HUMAN_HEIGHT_M, -1, 2);
  rebaseOnHorizon(c, oldH, fig.id);
  resizeFiguresToEyeLevel(c, 1, fig.id);
}

export function applyCameraMove(c: Composition, move: CameraMove, rng: Rng): void {
  const oldH = c.horizon.y;
  switch (move) {
    case 'invert': {
      const a = 180 + rng.normal() * 10;
      c.horizon.angle = Math.round(((a + 540) % 360) - 180);
      break;
    }
    case 'extremeDutch':
      c.horizon.angle = Math.round((rng.chance(0.5) ? 1 : -1) * rng.range(30, 65));
      break;
    case 'wormsEye':
      c.horizon.cameraHeight = rng.range(0.12, 0.4);
      c.horizon.y = rng.range(0.78, 0.95);
      c.horizon.fov = Math.round(rng.range(70, 105));
      rebaseOnHorizon(c, oldH);
      resizeFiguresToEyeLevel(c);
      break;
    case 'birdsEye':
      c.horizon.cameraHeight = rng.range(15, 60);
      c.horizon.y = rng.range(-0.25, 0.15);
      rebaseOnHorizon(c, oldH);
      resizeFiguresToEyeLevel(c);
      break;
    case 'overShoulder': {
      // A large figure seen from behind at one edge, framing a second figure.
      let front = c.figures.find((f) => !f.locked);
      if (!front) return;
      let back = c.figures.find((f) => !f.locked && f !== front);
      if (!back) {
        back = { ...front, id: newId('fig') };
        c.figures.push(back);
      }
      const side = rng.chance(0.5) ? -1 : 1;
      c.horizon.cameraHeight = rng.range(1.4, 1.75);
      front = Object.assign(front, {
        height: rng.range(2.4, 3.4),
        x: 0.5 + side * rng.range(0.32, 0.42),
        facing: 180 + rng.normal() * 15,
        tilt: 0,
        roll: 0,
        pose: 'standing',
      } satisfies Partial<Figure>);
      front.facing = ((front.facing + 540) % 360) - 180;
      front.y = rng.range(0.32, 0.48) + front.height * HEAD_K;
      c.horizon.y = clamp(front.y - (front.height * c.horizon.cameraHeight) / HUMAN_HEIGHT_M, -1, 2);
      rebaseOnHorizon(c, oldH, front.id);
      back.x = 0.5 - side * rng.range(0.1, 0.25);
      back.y = c.horizon.y + rng.range(0.08, 0.3) * Math.max(0.1, 1 - c.horizon.y);
      back.facing = rng.pick([-20, 0, 20]);
      back.tilt = 0;
      back.roll = 0;
      resizeFiguresToEyeLevel(c, 1, front.id);
      break;
    }
  }
}
