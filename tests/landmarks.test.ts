import { describe, expect, it } from 'vitest';
import type { Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { handFromLandmarks } from '../src/landmarks';
import { HandSmoother } from '../src/smoothing';

function sample() {
  const image = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 })) as NormalizedLandmark[];
  const world = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 })) as Landmark[];
  image[5].x = 0.4;
  image[17].x = 0.6;
  world[5].x = -0.05;
  world[17].x = 0.05;
  world[8].y = -0.1;
  return { image, world };
}

describe('webcam landmark mapping', () => {
  it('creates WebXR joints and fills the missing metacarpals', () => {
    const { image, world } = sample();
    const hand = handFromLandmarks('left', image, world)!;
    expect(hand.joints).toHaveLength(25);
    expect(hand.joints[9].y).toBeCloseTo(hand.joints[0].y + 0.1);
    expect(hand.joints[5].x).toBeCloseTo((hand.joints[0].x + hand.joints[6].x) / 2);
  });

  it('mirrors wrist motion for the desktop preview and adjusts reach', () => {
    const { image, world } = sample();
    image[0].x = 0.75;
    const near = handFromLandmarks('right', image, world, -0.2)!;
    const far = handFromLandmarks('right', image, world, 0.2)!;
    expect(near.joints[0].x).toBeLessThan(0);
    expect(far.joints[0].z).toBeLessThan(near.joints[0].z);
  });

  it.each(['left', 'right'] as const)('moves a %s hand toward the scene when it approaches the webcam', (side) => {
    const { image, world } = sample();
    const distant = handFromLandmarks(side, image, world)!;
    image[5].x = 0.3;
    image[17].x = 0.7;
    const nearCamera = handFromLandmarks(side, image, world)!;
    expect(nearCamera.joints[0].z).toBeLessThan(distant.joints[0].z);
    expect(nearCamera.joints[9].z).toBeLessThan(distant.joints[9].z);
  });
});

it('smooths jitter, follows quick motion, and resets when tracking is lost', () => {
  const smoother = new HandSmoother();
  const frame = (x: number) => [{ handedness: 'left' as const, joints: [{ x, y: 0, z: 0 }], radius: 0.01 }];
  smoother.update(frame(0), 0);
  const jitter = smoother.update(frame(0.01), 33)[0].joints[0].x;
  expect(jitter).toBeGreaterThan(0);
  expect(jitter).toBeLessThan(0.01);
  const moved = smoother.update(frame(0.16), 66)[0].joints[0].x;
  expect(moved).toBeGreaterThan(0.1);
  smoother.update([], 99);
  expect(smoother.update(frame(0.5), 132)[0].joints[0].x).toBe(0.5);
});
