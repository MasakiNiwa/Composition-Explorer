/**
 * Composition data model.
 *
 * Everything in `core/` is pure TypeScript with no DOM dependency so it can run
 * in the UI thread, in Web Workers, in unit tests, and (in the future) be
 * mirrored by the Python side of the Colab edition.
 *
 * Coordinate conventions
 * - Positions are normalized to the canvas: x ∈ [0,1] left→right, y ∈ [0,1] top→bottom.
 * - Lengths (heights/widths of objects) are fractions of the canvas *height*
 *   so shapes keep their proportions when the aspect ratio changes.
 * - Scene objects live in "world" space, which is the screen space before the
 *   camera roll (horizon tilt) is applied around the canvas center.
 */
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

export const PERSPECTIVE_MODES = ['none', 'one', 'two'] as const;
export type PerspectiveMode = (typeof PERSPECTIVE_MODES)[number];

export const POSES = ['standing', 'walking', 'running', 'jumping', 'sitting', 'reaching'] as const;
export type Pose = (typeof POSES)[number];

export const LAYERS = ['background', 'midground', 'foreground'] as const;
export type Layer = (typeof LAYERS)[number];

export const PROP_KINDS = ['mountain', 'building', 'tower', 'tree', 'bush', 'rock', 'fence', 'cloud', 'sun'] as const;
export type PropKind = (typeof PROP_KINDS)[number];

const unit = z.number().min(-6).max(8);

export const figureSchema = z.object({
  id: z.string(),
  /** Center x in world space. */
  x: unit,
  /** Feet (ground contact) y in world space. */
  y: unit,
  /** Body height as a fraction of canvas height. */
  height: z.number().min(0.005).max(8),
  /** Facing direction in degrees. 0 = toward viewer, 90 = right, -90 = left, 180 = away. */
  /** Rotation around the vertical axis (yaw). 0 = toward viewer, 90 = right. */
  facing: z.number().min(-180).max(180),
  /** Rotation around the left–right axis (pitch). + = top leans toward the viewer. */
  tilt: z.number().min(-180).max(180).default(0),
  /** Rotation around the viewing axis (roll), clockwise on screen. */
  roll: z.number().min(-180).max(180).default(0),
  pose: z.enum(POSES),
  locked: z.boolean().default(false),
});
export type Figure = z.infer<typeof figureSchema>;

export const propSchema = z.object({
  id: z.string(),
  kind: z.enum(PROP_KINDS),
  layer: z.enum(LAYERS),
  /** Base center x in world space. */
  x: unit,
  /** Base (ground contact) y in world space. For clouds/sun this is the center. */
  y: unit,
  width: z.number().min(0.005).max(4),
  height: z.number().min(0.005).max(4),
  flip: z.boolean().default(false),
  /** In-plane rotation in degrees (clockwise) around the object's center. */
  rotation: z.number().min(-180).max(180).default(0),
  locked: z.boolean().default(false),
});
export type Prop = z.infer<typeof propSchema>;

export const compositionSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string().default(''),
  seed: z.number().int().nonnegative(),
  canvas: z.object({
    aspectW: z.number().positive().max(100),
    aspectH: z.number().positive().max(100),
  }),
  horizon: z.object({
    /** Horizon y at the canvas center, in world space (0 = top, 1 = bottom). */
    y: z.number().min(-1).max(2),
    /** Camera roll in degrees (positive = clockwise). */
    angle: z.number().min(-180).max(180),
    /** Camera (eye) height in meters, used by the eye-level rule for figures. */
    cameraHeight: z.number().min(0.1).max(1000),
    /** Vertical field of view (lens). Wide angles exaggerate figure foreshortening. */
    fov: z.number().min(10).max(150).default(50),
  }),
  perspective: z.object({
    mode: z.enum(PERSPECTIVE_MODES),
    /** Vanishing point x on the horizon for one-point perspective. */
    vp: z.number().min(-5).max(6),
    /** Left / right vanishing points for two-point perspective. */
    vpLeft: z.number().min(-5).max(6),
    vpRight: z.number().min(-5).max(6),
    /** Ground grid density (number of lines). */
    gridLines: z.number().int().min(2).max(40),
  }),
  figures: z.array(figureSchema),
  props: z.array(propSchema),
});
export type Composition = z.infer<typeof compositionSchema>;

/** Average standing human height in meters (used by the eye-level rule). */
export const HUMAN_HEIGHT_M = 1.65;

export const ASPECT_PRESETS: { label: string; w: number; h: number }[] = [
  { label: '1:1', w: 1, h: 1 },
  { label: '2:3', w: 2, h: 3 },
  { label: '3:2', w: 3, h: 2 },
  { label: '3:4', w: 3, h: 4 },
  { label: '4:3', w: 4, h: 3 },
  { label: '9:16', w: 9, h: 16 },
  { label: '16:9', w: 16, h: 9 },
  { label: '21:9', w: 21, h: 9 },
];

export function aspectRatio(c: Composition): number {
  return c.canvas.aspectW / c.canvas.aspectH;
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter = (idCounter + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** A blank composition: just a horizon and canvas. Used by the Clear button. */
export function createEmptyComposition(seed = 1): Composition {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: '',
    seed,
    canvas: { aspectW: 2, aspectH: 3 },
    horizon: { y: 0.62, angle: 0, cameraHeight: 1.6, fov: 50 },
    perspective: {
      mode: 'none',
      vp: 0.5,
      vpLeft: -0.6,
      vpRight: 1.6,
      gridLines: 12,
    },
    figures: [],
    props: [],
  };
}

/** The starter scene shown on first launch. */
export function createSampleComposition(): Composition {
  const c = createEmptyComposition(20260101);
  c.name = 'Sample';
  c.horizon.y = 0.6;
  c.perspective.mode = 'one';
  c.perspective.vp = 0.62;
  c.figures = [
    {
      id: 'fig-1',
      x: 0.34,
      y: 0.86,
      height: 0.32,
      facing: 30,
      tilt: 0,
      roll: 0,
      pose: 'standing',
      locked: false,
    },
  ];
  c.props = [
    {
      id: 'prop-1',
      kind: 'mountain',
      layer: 'background',
      x: 0.75,
      y: 0.6,
      width: 0.9,
      height: 0.22,
      flip: false,
      rotation: 0,
      locked: false,
    },
    {
      id: 'prop-2',
      kind: 'cloud',
      layer: 'background',
      x: 0.3,
      y: 0.18,
      width: 0.35,
      height: 0.08,
      flip: false,
      rotation: 0,
      locked: false,
    },
    {
      id: 'prop-3',
      kind: 'building',
      layer: 'midground',
      x: 0.86,
      y: 0.68,
      width: 0.12,
      height: 0.22,
      flip: false,
      rotation: 0,
      locked: false,
    },
    {
      id: 'prop-4',
      kind: 'tree',
      layer: 'foreground',
      x: 0.08,
      y: 1.0,
      width: 0.22,
      height: 0.55,
      flip: false,
      rotation: 0,
      locked: false,
    },
  ];
  return c;
}

export type ParseResult = { ok: true; value: Composition } | { ok: false; error: string };

/** Validate (and migrate, once older schema versions exist) untrusted JSON. */
export function parseComposition(input: unknown): ParseResult {
  const raw = (
    input && typeof input === 'object' && 'composition' in input
      ? (input as { composition: unknown }).composition
      : input
  ) as unknown;
  const result = compositionSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: z.prettifyError(result.error) };
}
