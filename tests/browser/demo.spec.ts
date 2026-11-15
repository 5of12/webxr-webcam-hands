import { expect, test } from '@playwright/test';

test('synthetic joints become a WebXR hand in the standalone demo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('slider', { name: 'Distance' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter VR' })).toHaveCount(0);
  await page.evaluate(async () => {
    const cameraModule = '/src/camera.ts';
    const { WebcamHands } = await import(cameraModule);
    WebcamHands.prototype.start = async () => {};
  });
  await page.getByRole('button', { name: 'Start webcam' }).click();
  await expect.poll(() => page.evaluate(() => !!(window as Window & {
    __webcamXR?: { device: { activeSession?: XRSession } };
  }).__webcamXR?.device.activeSession)).toBe(true);
  await page.getByRole('button', { name: 'Move video to scene' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & {
    __demoVideoCard?: { group: { visible: boolean } };
  }).__demoVideoCard?.group.visible)).toBe(true);
  await page.getByRole('slider', { name: 'Video opacity' }).fill('0.25');
  await expect.poll(() => page.evaluate(() => (window as Window & {
    __demoVideoCard?: { material: { opacity: number } };
  }).__demoVideoCard?.material.opacity)).toBe(0.25);
  await page.getByRole('button', { name: 'Dock video' }).click();
  await expect(page.locator('.demo-controls video')).toHaveCSS('opacity', '0.25');
  await expect.poll(() => page.evaluate(() => (window as Window & {
    __demoVideoCard?: { group: { visible: boolean } };
  }).__demoVideoCard?.group.visible)).toBe(false);

  await page.evaluate(() => {
    const xr = (window as Window & { __webcamXR?: {
      setHands: (hands: unknown[]) => void;
      device: { activeSession?: XRSession };
    } }).__webcamXR!;
    const joints = Array.from({ length: 25 }, (_, i) => ({ x: (i % 5) * 0.025, y: 1.25 + Math.floor(i / 5) * 0.035, z: -0.7 }));
    joints[4] = { ...joints[9], x: joints[9].x + 0.01 };
    xr.setHands([
      { handedness: 'left', joints, radius: 0.01 },
      { handedness: 'right', joints: joints.map((joint) => ({ ...joint, x: joint.x + 0.2 })), radius: 0.01 },
    ]);
  });
  await expect.poll(() => page.evaluate(() => (window as Window & { __webcamXR?: {
    device: { activeSession?: XRSession };
  } }).__webcamXR!.device.activeSession?.inputSources.length)).toBe(2);
  await expect.poll(() => page.evaluate(() => (window as Window & {
    __demoPinches?: { detector: { pinched: boolean }; ring: { visible: boolean } }[];
  }).__demoPinches?.every((cue) => cue.detector.pinched && cue.ring.visible))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as Window & {
    __demoTarget?: { activeHand: number };
  }).__demoTarget?.activeHand)).toBe(0);
  const beforeTurn = await page.evaluate(() => (window as Window & {
    __demoTarget?: { group: { rotation: { y: number } } };
  }).__demoTarget!.group.rotation.y);
  await page.evaluate(() => {
    const xr = (window as Window & { __webcamXR?: { setHands: (hands: unknown[]) => void } }).__webcamXR!;
    const joints = Array.from({ length: 25 }, (_, i) => ({ x: 0.08 + (i % 5) * 0.025, y: 1.25 + Math.floor(i / 5) * 0.035, z: -0.7 }));
    joints[4] = { ...joints[9], x: joints[9].x + 0.01 };
    xr.setHands([{ handedness: 'left', joints, radius: 0.01 }]);
  });
  await expect.poll(() => page.evaluate(() => (window as Window & {
    __demoTarget?: { group: { rotation: { y: number } } };
  }).__demoTarget!.group.rotation.y)).toBeGreaterThan(beforeTurn + 0.35);
  await page.evaluate(() => (window as Window & { __webcamXR?: { setHands: (hands: unknown[]) => void } }).__webcamXR!.setHands([]));
  await expect.poll(() => page.evaluate(() => (window as Window & { __webcamXR?: {
    device: { activeSession?: XRSession };
  } }).__webcamXR!.device.activeSession?.inputSources.length)).toBe(0);
  await expect.poll(() => page.evaluate(() => (window as Window & {
    __demoPinches?: { detector: { pinched: boolean }; ring: { visible: boolean } }[];
  }).__demoPinches?.every((cue) => !cue.detector.pinched && !cue.ring.visible))).toBe(true);
  await page.getByRole('button', { name: 'Stop webcam' }).click();
  await expect.poll(() => page.evaluate(() => !(window as Window & {
    __webcamXR?: { device: { activeSession?: XRSession } };
  }).__webcamXR?.device.activeSession)).toBe(true);
  expect(errors).toEqual([]);
});

test('mobile camera controls stay above the scene', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await page.evaluate(async () => {
    const cameraModule = '/src/camera.ts';
    const { WebcamHands } = await import(cameraModule);
    WebcamHands.prototype.start = async () => {};
  });
  await page.getByRole('button', { name: 'Start webcam' }).click();
  await expect(page.getByRole('button', { name: 'Stop webcam' })).toBeVisible();
  const panel = await page.getByLabel('Webcam hand tracking').boundingBox();
  const main = await page.locator('main').boundingBox();
  expect(panel).not.toBeNull();
  expect(main).not.toBeNull();
  expect(panel!.y + panel!.height).toBeLessThan(main!.y);
  expect(panel!.y + panel!.height).toBeLessThan(230);
  expect(panel!.x).toBeGreaterThanOrEqual(0);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(393);
  await page.getByRole('button', { name: 'Move video to scene' }).click();
  const cardModePanel = await page.getByLabel('Webcam hand tracking').boundingBox();
  expect(cardModePanel!.y + cardModePanel!.height).toBeLessThan(main!.y);
});

test('desktop controls can be dragged without moving the scene', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByLabel('Webcam hand tracking');
  const before = await panel.boundingBox();
  const handle = await page.getByRole('button', { name: 'Drag webcam controls' }).boundingBox();
  expect(before).not.toBeNull();
  expect(handle).not.toBeNull();
  await page.mouse.move(handle!.x + 30, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x - 90, handle!.y + 60, { steps: 5 });
  await page.mouse.up();
  const after = await panel.boundingBox();
  expect(after!.x).toBeLessThan(before!.x - 80);
  expect(after!.y).toBeGreaterThan(before!.y + 40);
  await page.getByRole('button', { name: 'Drag webcam controls' }).press('ArrowLeft');
  const nudged = await panel.boundingBox();
  expect(nudged!.x).toBeLessThan(after!.x);
});
