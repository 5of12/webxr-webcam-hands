// IWSDK-compatible WebXR runtime for webcam development. IWER owns sessions,
// views and input sources; only its joint poses come from the webcam.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { XRDevice, metaQuest3, P_JOINT_SPACE, P_SPACE } from 'iwer';
import type { XRHandInput } from 'iwer/lib/device/XRHandInput.js';
import type { XRHandJoint } from 'iwer/lib/input/XRHand.js';
import { JOINT_NAMES, type HandFrame, type Handedness } from './landmarks';

const NEXT = [6, 2, 3, 4, 3, 6, 7, 8, 9, 8, 11, 12, 13, 14, 13, 16, 17, 18, 19, 18, 21, 22, 23, 24, 23];
const FORWARD = new Vector3(0, 0, -1);

export class WebcamXRDevice {
  readonly device = new XRDevice(metaQuest3);
  private frames: Record<Handedness, HandFrame | null> = { left: null, right: null };
  private matrix = new Matrix4();
  private from = new Vector3();
  private to = new Vector3();
  private wrist = new Vector3();
  private scale = new Vector3(1, 1, 1);
  private direction = new Vector3();
  private rotation = new Quaternion();
  private inverseHand = new Quaternion();

  constructor() {
    this.device.primaryInputMode = 'hand';
    for (const side of ['left', 'right'] as const) {
      const hand = this.device.hands[side]!;
      hand.connected = false;
      // IWER 2.5 exposes joint spaces but no streaming-joint setter. Override
      // its per-frame preset-pose update in this one adapter, pinned to 2.5.0.
      hand.updateHandPose = () => this.writeJoints(hand, this.frames[side]);
    }
    this.device.installRuntime({ forceInstall: true });
  }

  setHands(frames: readonly HandFrame[]): void {
    for (const side of ['left', 'right'] as const) {
      const frame = frames.find((candidate) => candidate.handedness === side) ?? null;
      this.frames[side] = frame;
      const hand = this.device.hands[side]!;
      hand.connected = !!frame;
      if (frame) {
        const wrist = frame.joints[0];
        hand.position.set(wrist.x, wrist.y, wrist.z);
        const thumb = frame.joints[4];
        const index = frame.joints[9];
        // A forward ray from wrist through index fingertip approximates Quest's
        // hand pointer for app-level far targeting.
        this.direction.set(index.x - wrist.x, index.y - wrist.y, index.z - wrist.z);
        if (this.direction.lengthSq() > 1e-6) {
          this.rotation.setFromUnitVectors(FORWARD, this.direction.normalize());
          hand.quaternion.set(this.rotation.x, this.rotation.y, this.rotation.z, this.rotation.w);
        }
        const pinch = Math.hypot(thumb.x - index.x, thumb.y - index.y, thumb.z - index.z) < 0.028;
        hand.updatePinchValue(pinch ? 1 : 0);
      } else {
        hand.setPinchValueImmediate(0);
      }
    }
  }

  stop(): void {
    this.setHands([]);
    this.device.activeSession?.end();
    this.device.uninstallRuntime();
  }

  private writeJoints(hand: XRHandInput, frame: HandFrame | null): void {
    if (!frame) return;
    const wrist = frame.joints[0];
    this.wrist.set(wrist.x, wrist.y, wrist.z);
    this.inverseHand.set(hand.quaternion.x, hand.quaternion.y, hand.quaternion.z, hand.quaternion.w).invert();
    for (let i = 0; i < JOINT_NAMES.length; i += 1) {
      const space = hand.inputSource.hand?.get(JOINT_NAMES[i] as XRHandJoint);
      if (!space) continue;
      const point = frame.joints[i];
      const next = frame.joints[NEXT[i]];
      this.from.set(point.x, point.y, point.z);
      this.to.set(next.x, next.y, next.z);
      this.direction.subVectors(this.to, this.from);
      if (this.direction.lengthSq() > 1e-8) this.rotation.setFromUnitVectors(FORWARD, this.direction.normalize());
      else this.rotation.identity();
      this.from.sub(this.wrist).applyQuaternion(this.inverseHand);
      this.rotation.premultiply(this.inverseHand);
      this.matrix.compose(this.from, this.rotation, this.scale);
      const offset = space[P_SPACE].offsetMatrix;
      for (let n = 0; n < 16; n += 1) offset[n] = this.matrix.elements[n];
      space[P_JOINT_SPACE].radius = frame.radius;
    }
  }
}
