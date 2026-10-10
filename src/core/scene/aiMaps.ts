/**
 * Control images for AI image generation (ControlNet-style):
 *  - depth: inverse-depth (disparity) map, near = white. On flat ground the
 *    disparity is proportional to the screen distance below the horizon, so
 *    the ground is a linear gradient and objects take the value at their base.
 *  - segmentation: flat class colors following the ADE20K palette convention
 *    used by common segmentation ControlNets.
 */
import type { Composition, PropKind } from '../model/composition';
import { buildScene, type Scene } from './buildScene';
import type { Primitive } from './primitives';

export type AiMapKind = 'depth' | 'segmentation';

/** ADE20K-style class colors. */
export const SEGMENT_COLORS: Record<'sky' | 'ground' | 'person' | PropKind, string> = {
  sky: '#06e6e6',
  ground: '#787846', // earth
  person: '#96053d',
  building: '#b47878',
  tower: '#b47878',
  tree: '#04c803',
  bush: '#ccff04', // plant
  rock: '#ff290a',
  fence: '#ffb806',
  mountain: '#8fff8c',
  cloud: '#06e6e6', // part of sky
  sun: '#06e6e6',
};

const gray = (v: number) => {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${c}${c}${c}`;
};

function recolor(prims: Primitive[], color: string): Primitive[] {
  return prims.map((p) => ({
    ...p,
    fill: p.t === 'line' || (p.t === 'poly' && !p.closed) ? undefined : color,
    stroke: p.stroke ? color : undefined,
    opacity: undefined,
  }));
}

export function buildAiScene(c: Composition, kind: AiMapKind): Scene {
  const scene = buildScene(c, { showGrid: false, showHorizon: false, guides: [] });
  const { W, H, horizonY: hy } = scene.frame;
  const x0 = -W * 1.5;
  const x1 = W * 2.5;
  const kindOf = new Map<string, 'person' | PropKind>([
    ...c.figures.map((f) => [f.id, 'person'] as const),
    ...c.props.map((p) => [p.id, p.kind] as const),
  ]);
  const baseOf = new Map<string, number>([
    ...c.figures.map((f) => [f.id, f.y * H] as const),
    ...c.props.map((p) => [p.id, p.y * H] as const),
  ]);

  if (kind === 'segmentation') {
    scene.environment = [
      { t: 'poly', closed: true, points: [x0, -H * 2, x1, -H * 2, x1, hy, x0, hy], fill: SEGMENT_COLORS.sky },
      { t: 'poly', closed: true, points: [x0, hy, x1, hy, x1, H * 3, x0, H * 3], fill: SEGMENT_COLORS.ground },
    ];
    scene.items = scene.items.map((it) => ({
      ...it,
      prims: recolor(it.prims, SEGMENT_COLORS[kindOf.get(it.id) ?? 'ground']),
    }));
    return scene;
  }

  // Depth: disparity normalized so the bottom edge of the canvas is 1.
  const span = Math.max(1, H - hy);
  const disparity = (y: number) => (y - hy) / span;
  const env: Primitive[] = [
    { t: 'poly', closed: true, points: [x0, -H * 2, x1, -H * 2, x1, hy, x0, hy], fill: '#000000' },
  ];
  // Fine bands across the visible ground (covers camera roll), then solid near-white.
  const strips = 160;
  const end = H * 1.6;
  for (let i = 0; i < strips; i++) {
    const ya = hy + ((end - hy) * i) / strips;
    const yb = hy + ((end - hy) * (i + 1)) / strips;
    env.push({
      t: 'poly',
      closed: true,
      points: [x0, ya, x1, ya, x1, yb + 0.5, x0, yb + 0.5],
      fill: gray(disparity((ya + yb) / 2)),
    });
  }
  env.push({ t: 'poly', closed: true, points: [x0, end, x1, end, x1, H * 3, x0, H * 3], fill: '#ffffff' });
  scene.environment = env;
  scene.items = scene.items.map((it) => {
    const k = kindOf.get(it.id);
    let v: number;
    if (k === 'cloud' || k === 'sun') v = 0;
    else if (k === 'mountain') v = 0.04;
    else v = Math.max(0.02, disparity(baseOf.get(it.id) ?? hy));
    return { ...it, prims: recolor(it.prims, gray(v)) };
  });
  return scene;
}
