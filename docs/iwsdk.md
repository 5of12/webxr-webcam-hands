# IWSDK/Vite setup

Use this in a desktop development mode. IWSDK must not inject its own IWER on
the same origin. The Playtonik integration uses `127.0.0.1` because its usual
emulator activates only on `localhost`.

```ts
import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { installWebcamXR } from '@5of12/webxr-webcam-hands';

const webcamMode = import.meta.env.DEV && import.meta.env.VITE_WEBCAM_XR === '1';
if (webcamMode) installWebcamXR(); // before World.create

const world = await World.create(document.querySelector('#scene')!, projectOptions);
```

For a Vite script, a dedicated host keeps the normal IWSDK emulator path apart:

```json
{
  "scripts": {
    "dev:webcam": "VITE_WEBCAM_XR=1 IWSDK_DEV_OPEN=0 vite --host 127.0.0.1 --port 5173 --strictPort"
  }
}
```

Set `world.xr.features.handTracking` in your IWSDK project config. The webcam
module installs a WebXR device with articulated hand input sources, so existing
IWSDK input handling can consume them. Your app decides how a pinch affects its
own objects; Playtonik adds an orb cue and far-pinch target test in its own code.

For tests, `installWebcamXR()` returns a `WebcamXRDevice`. Call `setHands()` with
left/right `HandFrame` values containing all 25 joint positions in world space.
Set an empty array to simulate tracking loss.
