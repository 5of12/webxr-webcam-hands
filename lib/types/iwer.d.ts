import { XRDevice } from 'iwer';
import { type HandFrame } from './landmarks';
export declare class WebcamXRDevice {
    readonly device: XRDevice;
    private frames;
    private matrix;
    private from;
    private to;
    private wrist;
    private scale;
    private direction;
    private rotation;
    private inverseHand;
    constructor();
    setHands(frames: readonly HandFrame[]): void;
    stop(): void;
    private writeJoints;
}
