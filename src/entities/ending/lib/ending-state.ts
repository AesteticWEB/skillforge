import type { EndingState } from '../model/ending.model';

export const createEmptyEndingState = (): EndingState => ({
  last: null,
  finishedAtIso: null,
  history: [],
  isEndingUnlocked: false,
  ngPlusCount: 0,
});
