// Webcam landmark -> WebXR joint mapping, adapted from mrdoob/webxr-webcam-emulator (MIT).
// MediaPipe gives 21 landmarks; WebXR requires 25 joints. The four metacarpals
// missing from MediaPipe are interpolated between wrist and each finger MCP.
import type { Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';

export const JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
] as const;

export type Handedness = 'left' | 'right';
export type Point = { x: number; y: number; z: number };
export type HandFrame = { handedness: Handedness; joints: Point[]; radius: number };

const MAP = [0, 1, 2, 3, 4, -5, 5, 6, 7, 8, -9, 9, 10, 11, 12, -13, 13, 14, 15, 16, -17, 17, 18, 19, 20];

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function handFromLandmarks(
  handedness: Handedness,
  image: NormalizedLandmark[],
  world: Landmark[],
  reach = 0,
): HandFrame | null {
  if (image.length < 21 || world.length < 21) return null;
  const wrist = image[0];
  // A monocular webcam has no absolute depth. Apparent palm width supplies a
  // bounded estimate; Reach is a manual offset for different camera setups.
  const apparentPalm = Math.hypot(image[5].x - image[17].x, image[5].y - image[17].y);
  const metricPalm = distance(world[5], world[17]);
  const estimatedDepth = metricPalm / Math.max(apparentPalm, 0.025) / (2 * Math.tan(Math.PI / 6));
  const depth = Math.min(0.85, Math.max(0.25, estimatedDepth)) + reach;
  const origin = { x: -(wrist.x - 0.5) * 1.15, y: 1.35 - (wrist.y - 0.5) * 0.85, z: -depth };
  const points = world.map((point) => ({
    x: origin.x - (point.x - world[0].x),
    y: origin.y - (point.y - world[0].y),
    z: origin.z + (point.z - world[0].z),
  }));
  const joints = MAP.map((index) => {
    if (index >= 0) return points[index];
    const mcp = points[-index];
    return { x: (origin.x + mcp.x) / 2, y: (origin.y + mcp.y) / 2, z: (origin.z + mcp.z) / 2 };
  });
  return { handedness, joints, radius: 0.01 };
}
