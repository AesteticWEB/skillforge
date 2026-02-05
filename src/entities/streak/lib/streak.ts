import type { DomainEvent } from '@/shared/lib/events';
import { calcStreakMultiplier, createEmptyStreakState, StreakState } from '../model/streak.model';

const normalizeCount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
};

export const increaseStreak = (state: StreakState, occurredAt?: string): StreakState => {
  const nextCount = normalizeCount(state.count) + 1;
  return {
    count: nextCount,
    multiplier: calcStreakMultiplier(nextCount),
    lastUpdatedAt: occurredAt ?? state.lastUpdatedAt,
  };
};

export const resetStreak = (
  state: StreakState,
  _reason?: string,
  occurredAt?: string,
): StreakState => ({
  count: 0,
  multiplier: 1,
  lastUpdatedAt: occurredAt ?? state.lastUpdatedAt,
});

export const applyComboStreakEvent = (
  state: StreakState | null | undefined,
  event: DomainEvent,
): StreakState => {
  const current = state ?? createEmptyStreakState();

  switch (event.type) {
    case 'ScenarioCompleted':
    case 'ExamPassed': {
      return increaseStreak(current, event.occurredAt);
    }
    case 'ExamFailed':
    case 'IncidentDeferred':
    case 'ProgressReset':
    case 'ProfileCreated': {
      return resetStreak(current, event.type, event.occurredAt);
    }
    default:
      return current;
  }
};
