import type { Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';
export declare const JOINT_NAMES: readonly ["wrist", "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip", "index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip", "middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip", "ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip", "pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"];
export type Handedness = 'left' | 'right';
export type Point = {
    x: number;
    y: number;
    z: number;
};
export type HandFrame = {
    handedness: Handedness;
    joints: Point[];
    radius: number;
};
export declare function handFromLandmarks(handedness: Handedness, image: NormalizedLandmark[], world: Landmark[], reach?: number): HandFrame | null;
