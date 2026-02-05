export type StreakState = {
  count: number;
  multiplier: number;
  lastUpdatedAt?: string;
};

export const STREAK_CAP_MULT = 1.5;
const STREAK_STEP = 0.05;
const STREAK_STEP_CAP = 10;

const normalizeCount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
};

const roundToHundredth = (value: number): number => Math.round(value * 100) / 100;

export const calcStreakMultiplier = (count: number): number => {
  const safeCount = normalizeCount(count);
  const raw = 1 + Math.min(safeCount, STREAK_STEP_CAP) * STREAK_STEP;
  const rounded = roundToHundredth(raw);
  if (!Number.isFinite(rounded)) {
    return 1;
  }
  return Math.min(STREAK_CAP_MULT, Math.max(1, rounded));
};

export const createEmptyStreakState = (): StreakState => ({
  count: 0,
  multiplier: 1,
});
