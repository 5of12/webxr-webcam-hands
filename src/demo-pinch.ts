import type { Point } from './landmarks';

// Match Playtonik's XR pinch hysteresis: close at 2 cm, open at 3.5 cm.
const PINCH_ON = 0.02;
const PINCH_OFF = 0.035;

export class DemoPinch {
  pinched = false;

  update(indexTip: Point | null, thumbTip: Point | null): boolean {
    if (!indexTip || !thumbTip) {
      this.pinched = false;
      return false;
    }
    const distance = Math.hypot(
      indexTip.x - thumbTip.x,
      indexTip.y - thumbTip.y,
      indexTip.z - thumbTip.z,
    );
    this.pinched = distance < (this.pinched ? PINCH_OFF : PINCH_ON);
    return this.pinched;
  }
}
