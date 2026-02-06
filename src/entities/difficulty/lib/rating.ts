import {
  DEFAULT_RATING,
  MAX_RATING_DELTA,
  RATING_MAX,
  RATING_MIN,
  RATING_STEP_DOWN,
  RATING_STEP_UP,
  STREAK_CAP,
  type DifficultyState,
} from '../model/types';

export const clampRating = (value: number): number => {
  const safe = Number.isFinite(value) ? value : DEFAULT_RATING;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round(safe)));
};

export const createDefaultDifficultyState = (): DifficultyState => ({
  rating: DEFAULT_RATING,
  failStreak: 0,
  successStreak: 0,
  lastResult: undefined,
});

const clampDelta = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const limit = Math.max(0, MAX_RATING_DELTA);
  return Math.max(-limit, Math.min(limit, value));
};

const streakMultiplier = (streak: number): number => {
  const safe = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
  const capped = Math.min(STREAK_CAP, safe);
  return 1 + capped * 0.1;
};

export const updateRating = (state: DifficultyState, result: 'pass' | 'fail'): DifficultyState => {
  const current = Number.isFinite(state.rating) ? state.rating : DEFAULT_RATING;
  if (result === 'pass') {
    const nextSuccess = Math.min(STREAK_CAP, (state.successStreak ?? 0) + 1);
    const delta = clampDelta(RATING_STEP_UP * streakMultiplier(nextSuccess));
    return {
      rating: clampRating(current + delta),
      successStreak: nextSuccess,
      failStreak: 0,
      lastResult: 'pass',
    };
  }

  const nextFail = Math.min(STREAK_CAP, (state.failStreak ?? 0) + 1);
  const delta = clampDelta(-RATING_STEP_DOWN * streakMultiplier(nextFail));
  return {
    rating: clampRating(current + delta),
    successStreak: 0,
    failStreak: nextFail,
    lastResult: 'fail',
  };
};
