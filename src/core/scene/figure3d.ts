/**
 * 3D mannequin for figures.
 *
 * A figure is a skeleton of joints (meters, standing height HUMAN_HEIGHT_M)
 * rotated in 3D (yaw = facing, pitch = tilt, roll) around the pelvis and
 * projected with a pinhole camera whose focal length comes from the lens FOV.
 * The figure's distance is chosen so an upright figure has exactly its
 * screen height at its anchor, which keeps it consistent with the 2D editor
 * while giving real foreshortening when it is rotated toward the camera —
 * stronger for close figures and wide lenses.
 *
 * Camera space: X right, Y up, Z away from the camera.
 * Body space (before rotation) matches camera space for a figure facing the
 * viewer: X = viewer's right, Y up, the figure's front is −Z.
 */
import type { Figure, Pose } from '../model/composition';
import { HUMAN_HEIGHT_M } from '../model/composition';
import type { Frame } from '../geometry/camera';

export type V3 = [number, number, number];

export type JointName =
  | 'pelvis'
  | 'chest'
  | 'neck'
  | 'head'
  | 'lShoulder'
  | 'rShoulder'
  | 'lElbow'
  | 'rElbow'
  | 'lHand'
  | 'rHand'
  | 'lHip'
  | 'rHip'
  | 'lKnee'
  | 'rKnee'
  | 'lFoot'
  | 'rFoot';

type Skeleton = Record<JointName, V3>;

/** Segments drawn as capsules: [from, to, radius (m)]. */
export const BONES: [JointName, JointName, number][] = [
  ['pelvis', 'chest', 0.15],
  ['chest', 'neck', 0.12],
  ['lShoulder', 'rShoulder', 0.07],
  ['lHip', 'rHip', 0.09],
  ['lShoulder', 'lElbow', 0.05],
  ['lElbow', 'lHand', 0.04],
  ['rShoulder', 'rElbow', 0.05],
  ['rElbow', 'rHand', 0.04],
  ['lHip', 'lKnee', 0.075],
  ['lKnee', 'lFoot', 0.055],
  ['rHip', 'rKnee', 0.075],
  ['rKnee', 'rFoot', 0.055],
];
export const HEAD_RADIUS = 0.115;

/**
 * Joint positions per pose (body space, meters, feet at y = 0). "Front" is
 * −Z here (toward the camera when facing = 0), so forward steps use −z.
 */
const POSE_SKELETONS: Record<Pose, Skeleton> = {
  standing: {
    pelvis: [0, 0.93, 0],
    chest: [0, 1.3, 0],
    neck: [0, 1.45, 0],
    head: [0, 1.55, 0],
    lShoulder: [-0.19, 1.4, 0],
    rShoulder: [0.19, 1.4, 0],
    lElbow: [-0.23, 1.12, 0.02],
    rElbow: [0.23, 1.12, 0.02],
    lHand: [-0.25, 0.86, -0.02],
    rHand: [0.25, 0.86, -0.02],
    lHip: [-0.1, 0.9, 0],
    rHip: [0.1, 0.9, 0],
    lKnee: [-0.11, 0.48, -0.01],
    rKnee: [0.11, 0.48, -0.01],
    lFoot: [-0.12, 0.05, 0],
    rFoot: [0.12, 0.05, 0],
  },
  walking: {
    pelvis: [0, 0.91, 0],
    chest: [0, 1.28, -0.03],
    neck: [0, 1.43, -0.04],
    head: [0, 1.53, -0.05],
    lShoulder: [-0.19, 1.38, -0.02],
    rShoulder: [0.19, 1.38, -0.02],
    lElbow: [-0.22, 1.12, 0.15],
    rElbow: [0.22, 1.12, -0.17],
    lHand: [-0.23, 0.9, 0.24],
    rHand: [0.22, 0.92, -0.3],
    lHip: [-0.1, 0.88, 0],
    rHip: [0.1, 0.88, 0],
    lKnee: [-0.1, 0.48, -0.2],
    rKnee: [0.1, 0.48, 0.12],
    lFoot: [-0.11, 0.05, -0.32],
    rFoot: [0.11, 0.12, 0.3],
  },
  running: {
    pelvis: [0, 0.88, 0],
    chest: [0, 1.22, -0.14],
    neck: [0, 1.36, -0.2],
    head: [0, 1.46, -0.25],
    lShoulder: [-0.19, 1.31, -0.17],
    rShoulder: [0.19, 1.31, -0.17],
    lElbow: [-0.22, 1.12, 0.06],
    rElbow: [0.22, 1.18, -0.38],
    lHand: [-0.2, 1.24, 0.22],
    rHand: [0.18, 1.38, -0.42],
    lHip: [-0.1, 0.85, 0],
    rHip: [0.1, 0.85, 0],
    lKnee: [-0.1, 0.62, -0.4],
    rKnee: [0.1, 0.45, 0.2],
    lFoot: [-0.11, 0.25, -0.32],
    rFoot: [0.11, 0.42, 0.5],
  },
  jumping: {
    pelvis: [0, 1.05, 0],
    chest: [0, 1.42, 0.02],
    neck: [0, 1.57, 0.02],
    head: [0, 1.67, 0],
    lShoulder: [-0.19, 1.52, 0.02],
    rShoulder: [0.19, 1.52, 0.02],
    lElbow: [-0.34, 1.78, 0],
    rElbow: [0.34, 1.78, 0],
    lHand: [-0.42, 2.05, -0.05],
    rHand: [0.42, 2.05, -0.05],
    lHip: [-0.1, 1.02, 0],
    rHip: [0.1, 1.02, 0],
    lKnee: [-0.16, 0.7, -0.22],
    rKnee: [0.16, 0.7, -0.22],
    lFoot: [-0.18, 0.45, 0.08],
    rFoot: [0.18, 0.45, 0.08],
  },
  sitting: {
    pelvis: [0, 0.48, 0.05],
    chest: [0, 0.86, 0.08],
    neck: [0, 1.01, 0.08],
    head: [0, 1.11, 0.06],
    lShoulder: [-0.19, 0.96, 0.08],
    rShoulder: [0.19, 0.96, 0.08],
    lElbow: [-0.23, 0.7, -0.02],
    rElbow: [0.23, 0.7, -0.02],
    lHand: [-0.2, 0.55, -0.22],
    rHand: [0.2, 0.55, -0.22],
    lHip: [-0.1, 0.46, 0.05],
    rHip: [0.1, 0.46, 0.05],
    lKnee: [-0.12, 0.47, -0.38],
    rKnee: [0.12, 0.47, -0.38],
    lFoot: [-0.12, 0.05, -0.42],
    rFoot: [0.12, 0.05, -0.42],
  },
  reaching: {
    pelvis: [0, 0.92, 0],
    chest: [0, 1.28, -0.08],
    neck: [0, 1.43, -0.12],
    head: [0, 1.53, -0.15],
    lShoulder: [-0.19, 1.38, -0.1],
    rShoulder: [0.19, 1.38, -0.1],
    lElbow: [-0.2, 1.15, 0.0],
    rElbow: [0.22, 1.42, -0.38],
    lHand: [-0.22, 0.9, 0.02],
    rHand: [0.26, 1.48, -0.66],
    lHip: [-0.1, 0.89, 0],
    rHip: [0.1, 0.89, 0],
    lKnee: [-0.1, 0.48, -0.12],
    rKnee: [0.11, 0.49, 0.1],
    lFoot: [-0.11, 0.05, -0.22],
    rFoot: [0.12, 0.05, 0.18],
  },
};

const PIVOT_Y = 0.93;
/** Closest effective camera distance (m) used for foreshortening. */
const MIN_DISTANCE_M = 1.4;
const d2r = (d: number) => (d * Math.PI) / 180;

/**
 * Rotation applied in camera space about the pelvis, in this order:
 * yaw (facing; +90 turns the front toward the viewer's right), tilt (pitch;
 * + leans the top toward the camera), roll (+ = clockwise on screen).
 */
function rotation(yaw: number, tilt: number, roll: number): (v: V3) => V3 {
  const [cy, sy] = [Math.cos(d2r(yaw)), Math.sin(d2r(yaw))];
  const [cp, sp] = [Math.cos(d2r(tilt)), Math.sin(d2r(tilt))];
  const [cr, sr] = [Math.cos(d2r(roll)), Math.sin(d2r(roll))];
  return ([x, y, z]) => {
    const x1 = x * cy - z * sy;
    const z1 = x * sy + z * cy;
    const y2 = y * cp + z1 * sp;
    const z2 = -y * sp + z1 * cp;
    const x3 = x1 * cr + y2 * sr;
    const y3 = -x1 * sr + y2 * cr;
    return [x3, y3, z2];
  };
}

export interface ProjectedFigure {
  /** Joints in scene units (world space, before camera roll). */
  joints: Record<JointName, { x: number; y: number; depth: number }>;
  /** Pixel-space radius for a body-space radius at a joint. */
  scaleAt: (j: JointName) => number;
  /** Front direction marker (nose), with depth. */
  nose: { x: number; y: number; depth: number };
}

/** Focal length in scene units for the composition's lens. */
export function focalLength(f: Frame, fovDeg: number): number {
  return f.H / 2 / Math.tan(d2r(Math.min(150, Math.max(10, fovDeg))) / 2);
}

export function projectFigure(fig: Figure, f: Frame, fovDeg: number): ProjectedFigure {
  const sk = POSE_SKELETONS[fig.pose] ?? POSE_SKELETONS.standing;
  const focal = focalLength(f, fovDeg);
  const hs = Math.max(1e-3, fig.height * f.H);
  const k = HUMAN_HEIGHT_M / 1.65; // skeleton is authored for 1.65 m
  // Distance that makes an upright figure exactly hs tall on screen, limited
  // so very large figures do not swing into the lens; the result is scaled
  // back to hs around the feet, keeping the figure's height setting exact.
  const D = Math.max(MIN_DISTANCE_M, (focal * HUMAN_HEIGHT_M) / hs);
  const fit = hs / ((focal * HUMAN_HEIGHT_M) / D);
  const sx = fig.x * f.W;
  const sy = fig.y * f.H;
  // Feet position in camera space (optical center at the canvas center).
  const X0 = ((sx - f.W / 2) * D) / focal;
  const Y0 = (-(sy - f.H / 2) * D) / focal;
  const R = rotation(fig.facing, fig.tilt ?? 0, fig.roll ?? 0);

  const toCam = (p: V3): V3 => {
    const local: V3 = [p[0] * k, (p[1] - PIVOT_Y) * k, p[2] * k];
    const r = R(local);
    return [X0 + r[0], Y0 + PIVOT_Y * k + r[1], D + r[2]];
  };
  const project = (c: V3) => {
    const z = Math.max(D * 0.25, c[2]); // never behind (or inside) the camera
    const px = f.W / 2 + (focal * c[0]) / z;
    const py = f.H / 2 - (focal * c[1]) / z;
    return { x: sx + (px - sx) * fit, y: sy + (py - sy) * fit, depth: z };
  };

  const joints = {} as ProjectedFigure['joints'];
  for (const name of Object.keys(sk) as JointName[]) joints[name] = project(toCam(sk[name]));
  const head = sk.head;
  const nose = project(toCam([head[0], head[1] - 0.01, head[2] - HEAD_RADIUS * 0.95]));
  return {
    joints,
    scaleAt: (j) => (fit * focal * k) / joints[j].depth,
    nose,
  };
}
