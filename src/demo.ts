import * as THREE from 'three';
import { installWebcamXR, JOINT_NAMES } from './index';
import { DemoPinch } from './demo-pinch';

installWebcamXR();

document.body.style.cssText = 'margin:0;background:#0d0f13;color:#fff;font:15px system-ui;overflow:hidden';
const main = document.querySelector('main')!;
main.style.cssText = 'position:fixed;left:20px;top:16px;z-index:2;max-width:340px';
const title = main.querySelector('h1')!;
title.style.cssText = 'font-size:20px;font-weight:600;margin:0 0 8px';
const intro = main.querySelector('p')!;
intro.style.cssText = 'color:#aeb6c1;line-height:1.5;margin:0 0 14px';
const button = document.querySelector<HTMLButtonElement>('#enter-vr')!;
button.style.cssText = 'border:0;border-radius:8px;padding:10px 14px;background:#fff;color:#111;font:inherit;cursor:pointer';
const status = document.querySelector('#session-status')!;
status.setAttribute('aria-live', 'polite');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f13);
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 20);
camera.position.set(0, 1.6, 0);
scene.add(new THREE.GridHelper(4, 16, 0x56606d, 0x29313a));
const target = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.18, 1),
  new THREE.MeshNormalMaterial({ wireframe: true }),
);
target.position.set(0, 1.35, -0.6);
scene.add(target);

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

button.addEventListener('click', async () => {
  if (renderer.xr.isPresenting) {
    await renderer.xr.getSession()?.end();
    return;
  }
  try {
    const session = await navigator.xr!.requestSession('immersive-vr', { requiredFeatures: ['hand-tracking', 'local-floor'] });
    await renderer.xr.setSession(session);
    button.textContent = 'Exit VR';
    status.textContent = 'VR live';
    session.addEventListener('end', () => {
      button.textContent = 'Enter VR';
      status.textContent = 'Ready';
      for (const hand of joints) for (const joint of hand) joint.visible = false;
      for (const cue of pinchCues) { cue.detector.update(null, null); cue.ring.visible = false; }
    });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Could not enter VR';
  }
});

renderer.setAnimationLoop((_time, frame) => {
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
      }
      cue.lastPinched = pinched;
    }
  }
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
