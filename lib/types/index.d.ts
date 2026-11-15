import { WebcamXRDevice } from './iwer';
export type WebcamXRHooks = {
    onStarted?: () => void;
    onStopped?: () => void;
};
export declare function installWebcamXR(hooks?: WebcamXRHooks): WebcamXRDevice;
export { WebcamHands } from './camera';
export { WebcamXRDevice } from './iwer';
export { handFromLandmarks, JOINT_NAMES } from './landmarks';
export type { HandFrame, Handedness, Point } from './landmarks';
export { HandSmoother } from './smoothing';
