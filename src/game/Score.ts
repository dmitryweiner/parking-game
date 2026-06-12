export interface ScoreInput {
  timeElapsed: number;
  distanceFromEntrance: number;
  maxTime: number;
  maxDistance: number;
}

export const MAX_SCORE = 1000;
const DISTANCE_WEIGHT = 0.5;

export function computeScore(input: ScoreInput): number {
  const t = Math.max(0, input.timeElapsed) / input.maxTime;
  const d = Math.max(0, input.distanceFromEntrance) / input.maxDistance;
  const timeFactor = Math.max(0, 1 - t);
  const distFactor = Math.max(0, 1 - DISTANCE_WEIGHT * Math.min(1, d));
  return Math.round(MAX_SCORE * timeFactor * distFactor);
}
