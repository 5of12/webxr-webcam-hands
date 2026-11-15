import type { HandFrame } from './landmarks';
export declare class HandSmoother {
    private previous;
    update(frames: HandFrame[], time: number): HandFrame[];
    reset(): void;
}
