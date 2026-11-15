import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { handFromLandmarks, type HandFrame, type Handedness } from './landmarks';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class WebcamHands {
  readonly video = document.createElement('video');
  reach = 0;
  private landmarker: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private frameId = 0;
  private lastVideoTime = -1;
  private lastInference = 0;
  private generation = 0;
  onHands: (hands: HandFrame[]) => void = () => {};
  onError: (error: unknown) => void = () => {};

  constructor() {
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
  }

  async start(): Promise<void> {
    if (this.stream) return;
    const generation = ++this.generation;
    // Ask for permission during the click, before loading the model.
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
    if (generation !== this.generation) { stream.getTracks().forEach((track) => track.stop()); return; }
    this.stream = stream;
    this.video.srcObject = stream;
    try {
      await this.video.play();
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks(WASM);
      if (generation !== this.generation) return;
      const options = {
        baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' as const },
        runningMode: 'VIDEO' as const,
        numHands: 2,
      };
      let landmarker: HandLandmarker;
      try {
        landmarker = await HandLandmarker.createFromOptions(files, options);
      } catch {
        landmarker = await HandLandmarker.createFromOptions(files, {
          ...options, baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
        });
      }
      if (generation !== this.generation) { landmarker.close(); return; }
      this.landmarker = landmarker;
      this.frameId = requestAnimationFrame(this.tick);
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      throw error;
    }
  }

  stop(): void {
    this.generation += 1;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.lastVideoTime = -1;
    this.landmarker?.close();
    this.landmarker = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.onHands([]);
  }

  private tick = (now: number): void => {
    if (!this.landmarker || !this.stream) return;
    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        this.video.currentTime !== this.lastVideoTime && now - this.lastInference >= 33) {
      this.lastVideoTime = this.video.currentTime;
      this.lastInference = now;
      try {
        const result = this.landmarker.detectForVideo(this.video, now);
        const hands: HandFrame[] = [];
        for (let i = 0; i < result.landmarks.length; i += 1) {
          const label = result.handedness[i]?.[0]?.categoryName;
          if (label !== 'Left' && label !== 'Right') continue;
          const hand = handFromLandmarks(label.toLowerCase() as Handedness,
            result.landmarks[i], result.worldLandmarks[i], this.reach);
          if (hand) hands.push(hand);
        }
        this.onHands(hands);
      } catch (error) {
        console.warn('[webcam-xr] Hand tracking stopped', error);
        this.stop();
        this.onError(error);
        return;
      }
    }
    this.frameId = requestAnimationFrame(this.tick);
  };
}
