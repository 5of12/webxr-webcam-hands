import * as THREE from 'three';
import { installWebcamXR, JOINT_NAMES } from './index';
import { DemoPinch } from './demo-pinch';
import { createDemoScene } from './demo-scene';

document.body.style.cssText = 'margin:0;background:#0d0f13;color:#fff;font:15px system-ui;overflow:hidden';
const main = document.querySelector('main')!;
main.style.cssText = 'position:fixed;left:20px;top:16px;z-index:2;max-width:340px';
const title = main.querySelector('h1')!;
title.style.cssText = 'font-size:20px;font-weight:600;margin:0 0 8px';
const intro = main.querySelector('p')!;
intro.style.cssText = 'color:#aeb6c1;line-height:1.5;margin:0 0 14px';
const status = document.querySelector('#session-status')!;
status.setAttribute('aria-live', 'polite');
status.setAttribute('hidden', '');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.append(renderer.domElement);

const { scene, target } = createDemoScene(renderer);
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 20);
camera.position.set(0, 1.6, 0);

const jointGeometry = new THREE.SphereGeometry(0.009, 8, 6);
const jointMaterials = [new THREE.MeshBasicMaterial({ color: 0x85d9ff }), new THREE.MeshBasicMaterial({ color: 0xffb5d6 })];
const joints = jointMaterials.map((material) => JOINT_NAMES.map(() => {
  const mesh = new THREE.Mesh(jointGeometry, material);
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}));
const pinchCues = jointMaterials.map((material) => {
  const ringMaterial = new THREE.MeshBasicMaterial({ color: material.color, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.015, 0.022, 24), ringMaterial);
  ring.visible = false;
  ring.renderOrder = 10;
  scene.add(ring);
  return { detector: new DemoPinch(), ring, lastPinched: false };
});
if (import.meta.env.DEV) (window as Window & { __demoPinches?: typeof pinchCues }).__demoPinches = pinchCues;
if (import.meta.env.DEV) (window as Window & { __demoTarget?: typeof target }).__demoTarget = target;
const pinchPoints: (THREE.Vector3 | null)[] = [null, null];
let lastFrameTime = 0;

async function startPreview(): Promise<void> {
  if (renderer.xr.isPresenting) return;
  try {
    const session = await navigator.xr!.requestSession('immersive-vr', { requiredFeatures: ['hand-tracking', 'local-floor'] });
    await renderer.xr.setSession(session);
    status.textContent = '';
    status.setAttribute('hidden', '');
    session.addEventListener('end', () => {
      for (const hand of joints) for (const joint of hand) joint.visible = false;
      for (const cue of pinchCues) { cue.detector.update(null, null); cue.ring.visible = false; }
    });
  } catch (error) {
    status.textContent = 'Could not start the 3D preview';
    status.removeAttribute('hidden');
    console.warn('[webcam-xr] Could not start 3D preview', error);
  }
}

installWebcamXR({
  onStarted: () => { void startPreview(); },
  onStopped: () => { void renderer.xr.getSession()?.end(); },
});

renderer.setAnimationLoop((time, frame) => {
  const dt = lastFrameTime ? (time - lastFrameTime) / 1000 : 0;
  lastFrameTime = time;
  pinchPoints[0] = pinchPoints[1] = null;
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    for (const [index, side] of ['left', 'right'].entries()) {
      const source = [...(renderer.xr.getSession()?.inputSources ?? [])].find((input) => input.handedness === side && input.hand);
      for (let i = 0; i < JOINT_NAMES.length; i += 1) {
        const mesh = joints[index][i];
        const jointSpace = source?.hand?.get(JOINT_NAMES[i]);
        const pose = referenceSpace && jointSpace ? frame.getJointPose?.(jointSpace, referenceSpace) : null;
        mesh.visible = !!pose;
        if (pose) {
          const { position } = pose.transform;
          mesh.position.set(position.x, position.y, position.z);
        }
      }
      const cue = pinchCues[index];
      const indexTip = joints[index][9];
      const thumbTip = joints[index][4];
      const pinched = cue.detector.update(indexTip.visible ? indexTip.position : null, thumbTip.visible ? thumbTip.position : null);
      cue.ring.visible = pinched;
      if (pinched) {
        cue.ring.position.copy(indexTip.position).add(thumbTip.position).multiplyScalar(0.5);
        renderer.xr.getCamera().getWorldQuaternion(cue.ring.quaternion);
        cue.ring.scale.setScalar(cue.lastPinched ? 1 : 1.4);
        pinchPoints[index] = cue.ring.position;
      }
      cue.lastPinched = pinched;
    }
  }
  target.update(dt, pinchPoints);
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
