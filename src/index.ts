// Install before an app creates its WebXR world; use in a desktop development mode.
import { WebcamHands } from './camera';
import { WebcamXRDevice } from './iwer';
import { HandSmoother } from './smoothing';

export function installWebcamXR(): WebcamXRDevice {
  document.documentElement.dataset.webcamXr = 'true';
  const xr = new WebcamXRDevice();
  const camera = new WebcamHands();
  const smoother = new HandSmoother();
  camera.onHands = (hands) => {
    xr.setHands(smoother.update(hands, performance.now()));
    status.textContent = hands.length ? `${hands.length} hand${hands.length === 1 ? '' : 's'}` : 'No hands';
  };

  const panel = document.createElement('aside');
  panel.setAttribute('aria-label', 'Webcam hand tracking');
  panel.style.cssText = 'position:fixed;right:12px;bottom:28vh;z-index:1001;display:flex;align-items:center;gap:9px;padding:7px 9px;border:1px solid #ffffff33;border-radius:12px;background:#191b20e8;color:white;font:12px system-ui;box-shadow:0 5px 22px #0004;';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Start webcam';
  button.title = 'Use your webcam as WebXR hands';
  button.style.cssText = 'border:0;border-radius:7px;background:#fff;color:#111;padding:6px 9px;font:inherit;cursor:pointer;';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.textContent = 'Off';
  status.style.minWidth = '52px';
  const reach = document.createElement('input');
  reach.type = 'range';
  reach.min = '-0.35';
  reach.max = '0.35';
  reach.step = '0.01';
  reach.value = '0';
  reach.title = 'Move virtual hands toward or away from the scene';
  reach.style.cssText = 'width:64px;accent-color:#fff;';
  reach.addEventListener('input', () => { camera.reach = Number(reach.value); });
  const reachLabel = document.createElement('label');
  reachLabel.textContent = 'Distance';
  reachLabel.style.cssText = 'display:flex;align-items:center;gap:6px;';
  reachLabel.append(reach);
  camera.video.style.cssText = 'display:none;width:100px;height:75px;object-fit:cover;border-radius:6px;transform:scaleX(-1);';
  panel.append(button, status, reachLabel, camera.video);
  document.body.append(panel);
  camera.onError = () => {
    button.dataset.active = 'false';
    button.textContent = 'Start webcam';
    camera.video.style.display = 'none';
    status.textContent = 'Tracking stopped';
  };

  let starting = false;
  button.addEventListener('click', async () => {
    if (starting) return;
    if (button.dataset.active === 'true') {
      camera.stop();
      smoother.reset();
      button.dataset.active = 'false';
      button.textContent = 'Start webcam';
      camera.video.style.display = 'none';
      status.textContent = 'Off';
      return;
    }
    starting = true;
    button.disabled = true;
    status.textContent = 'Starting…';
    try {
      await camera.start();
      button.dataset.active = 'true';
      button.textContent = 'Stop webcam';
      camera.video.style.display = 'block';
      status.textContent = 'No hands';
    } catch (error) {
      status.textContent = error instanceof DOMException && error.name === 'NotAllowedError' ? 'Camera denied' : 'Unavailable';
      console.warn('[webcam-xr] Could not start camera', error);
    } finally {
      starting = false;
      button.disabled = false;
    }
  });
  window.addEventListener('pagehide', () => camera.stop(), { once: true });
  (window as Window & { __webcamXR?: WebcamXRDevice }).__webcamXR = xr;
  return xr;
}

export { WebcamHands } from './camera';
export { WebcamXRDevice } from './iwer';
export { handFromLandmarks, JOINT_NAMES } from './landmarks';
export type { HandFrame, Handedness, Point } from './landmarks';
export { HandSmoother } from './smoothing';
