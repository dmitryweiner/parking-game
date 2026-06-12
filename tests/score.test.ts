import { describe, it, expect } from 'vitest';
import { computeScore } from '../src/game/Score';

describe('Score', () => {
  it('returns max score when parked instantly at the entrance', () => {
    const s = computeScore({
      timeElapsed: 0,
      distanceFromEntrance: 0,
      maxTime: 60,
      maxDistance: 100,
    });
    expect(s).toBe(1000);
  });

  it('returns 0 when time runs out', () => {
    const s = computeScore({
      timeElapsed: 60,
      distanceFromEntrance: 0,
      maxTime: 60,
      maxDistance: 100,
    });
    expect(s).toBe(0);
  });

  it('clamps to 0 (never negative) when over time', () => {
    const s = computeScore({
      timeElapsed: 9999,
      distanceFromEntrance: 9999,
      maxTime: 60,
      maxDistance: 100,
    });
    expect(s).toBe(0);
  });

  it('higher when parked closer to the entrance, time held constant', () => {
    const near = computeScore({ timeElapsed: 10, distanceFromEntrance: 5, maxTime: 60, maxDistance: 100 });
    const far = computeScore({ timeElapsed: 10, distanceFromEntrance: 80, maxTime: 60, maxDistance: 100 });
    expect(near).toBeGreaterThan(far);
  });

  it('higher when parked faster, distance held constant', () => {
    const fast = computeScore({ timeElapsed: 5, distanceFromEntrance: 30, maxTime: 60, maxDistance: 100 });
    const slow = computeScore({ timeElapsed: 50, distanceFromEntrance: 30, maxTime: 60, maxDistance: 100 });
    expect(fast).toBeGreaterThan(slow);
  });

  it('returns an integer', () => {
    const s = computeScore({ timeElapsed: 17.3, distanceFromEntrance: 22.7, maxTime: 60, maxDistance: 100 });
    expect(Number.isInteger(s)).toBe(true);
  });
});
