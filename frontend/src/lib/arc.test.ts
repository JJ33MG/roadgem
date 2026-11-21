import { describe, expect, it } from 'vitest';
import { greatCircle } from './arc';

describe('greatCircle', () => {
  it('runs from start to end in 64 points along the great circle', () => {
    const brussels: [number, number] = [4.35, 50.85];
    const prague: [number, number] = [14.42, 50.08];
    const line = greatCircle(brussels, prague);
    expect(line).toHaveLength(64);
    expect(line[0][0]).toBeCloseTo(4.35, 5);
    expect(line[0][1]).toBeCloseTo(50.85, 5);
    expect(line[63][0]).toBeCloseTo(14.42, 5);
    expect(line[63][1]).toBeCloseTo(50.08, 5);
    const mid = line[32];
    expect(Math.abs(mid[0] - 9.4)).toBeLessThan(1);
    expect(Math.abs(mid[1] - 50.6)).toBeLessThan(1);
  });
});
