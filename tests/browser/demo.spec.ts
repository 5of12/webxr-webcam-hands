import { expect, test } from '@playwright/test';

test('synthetic joints become a WebXR hand in the standalone demo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('slider', { name: 'Distance' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter VR' }).click();
  await expect(page.locator('#session-status')).toHaveText('VR live');

  await page.evaluate(() => {
    const xr = (window as Window & { __webcamXR?: {
      setHands: (hands: unknown[]) => void;
      device: { activeSession?: XRSession };
    } }).__webcamXR!;
    const joints = Array.from({ length: 25 }, (_, i) => ({ x: (i % 5) * 0.025, y: 1.25 + Math.floor(i / 5) * 0.035, z: -0.45 }));
    xr.setHands([{ handedness: 'left', joints, radius: 0.01 }]);
  });
  await expect.poll(() => page.evaluate(() => (window as Window & { __webcamXR?: {
    device: { activeSession?: XRSession };
  } }).__webcamXR!.device.activeSession?.inputSources.length)).toBe(1);
  await page.evaluate(() => (window as Window & { __webcamXR?: { setHands: (hands: unknown[]) => void } }).__webcamXR!.setHands([]));
  await expect.poll(() => page.evaluate(() => (window as Window & { __webcamXR?: {
    device: { activeSession?: XRSession };
  } }).__webcamXR!.device.activeSession?.inputSources.length)).toBe(0);
  expect(errors).toEqual([]);
});
