import type { HandFrame, Handedness, Point } from './landmarks';

// Slow small movements to remove landmark jitter; follow deliberate motion and
// pinch quickly. Work on each hand separately so tracking loss has no stale pose.
export class HandSmoother {
  private previous: Partial<Record<Handedness, { joints: Point[]; time: number }>> = {};

  update(frames: HandFrame[], time: number): HandFrame[] {
    for (const side of ['left', 'right'] as const) {
      const frame = frames.find((hand) => hand.handedness === side);
      if (!frame) { delete this.previous[side]; continue; }
      const prior = this.previous[side];
      if (!prior || time - prior.time > 250 || prior.joints.length !== frame.joints.length) {
        this.previous[side] = { joints: frame.joints.map((joint) => ({ ...joint })), time };
        continue;
      }
      const dt = Math.max(0.008, Math.min(0.1, (time - prior.time) / 1000));
      for (let i = 0; i < frame.joints.length; i += 1) {
        const raw = frame.joints[i];
        const old = prior.joints[i];
        const speed = Math.hypot(raw.x - old.x, raw.y - old.y, raw.z - old.z) / dt;
        const tau = Math.max(0.018, 0.11 - speed * 0.15);
        const alpha = 1 - Math.exp(-dt / tau);
        old.x += (raw.x - old.x) * alpha;
        old.y += (raw.y - old.y) * alpha;
        old.z += (raw.z - old.z) * alpha;
        raw.x = old.x;
        raw.y = old.y;
        raw.z = old.z;
      }
      prior.time = time;
    }
    return frames;
  }

  reset(): void { this.previous = {}; }
}
