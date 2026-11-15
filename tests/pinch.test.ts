import { describe, expect, it } from 'vitest';
import { DemoPinch } from '../src/demo-pinch';

const tip = (x: number) => ({ x, y: 0, z: 0 });

describe('demo pinch detection', () => {
  it('uses Playtonik thresholds with hysteresis', () => {
    const pinch = new DemoPinch();
    expect(pinch.update(tip(0), tip(0.025))).toBe(false);
    expect(pinch.update(tip(0), tip(0.015))).toBe(true);
    expect(pinch.update(tip(0), tip(0.03))).toBe(true);
    expect(pinch.update(tip(0), tip(0.04))).toBe(false);
  });

  it('releases on tracking loss', () => {
    const pinch = new DemoPinch();
    pinch.update(tip(0), tip(0.01));
    expect(pinch.update(null, tip(0.01))).toBe(false);
    expect(pinch.update(tip(0), tip(0.03))).toBe(false);
  });
});
