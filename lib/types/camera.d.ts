import { type HandFrame } from './landmarks';
export declare class WebcamHands {
    readonly video: HTMLVideoElement;
    reach: number;
    private landmarker;
    private stream;
    private frameId;
    private lastVideoTime;
    private lastInference;
    private generation;
    onHands: (hands: HandFrame[]) => void;
    onError: (error: unknown) => void;
    constructor();
    start(): Promise<void>;
    stop(): void;
    private tick;
}
