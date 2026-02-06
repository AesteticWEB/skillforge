export type PlayerSkillRating = number;

export type DifficultyState = {
  rating: PlayerSkillRating;
  failStreak: number;
  successStreak: number;
  lastResult?: 'pass' | 'fail';
};

export const RATING_MIN = 0;
export const RATING_MAX = 100;
export const RATING_STEP_UP = 4;
export const RATING_STEP_DOWN = 6;
export const STREAK_CAP = 5;
export const MAX_RATING_DELTA = 8;
export const DEFAULT_RATING = 50;
