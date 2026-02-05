import {
  applyComboStreakEvent,
  calcStreakMultiplier,
  createEmptyStreakState,
  increaseStreak,
  STREAK_CAP_MULT,
} from '@/entities/streak';
import {
  createExamFailedEvent,
  createIncidentDeferredEvent,
  createScenarioCompletedEvent,
} from '@/shared/lib/events';

describe('combo streak', () => {
  it('increments count on success', () => {
    const next = applyComboStreakEvent(
      createEmptyStreakState(),
      createScenarioCompletedEvent('scenario-1', 'decision-1'),
    );

    expect(next.count).toBe(1);
  });

  it('caps multiplier at max', () => {
    expect(calcStreakMultiplier(99)).toBe(STREAK_CAP_MULT);
  });

  it('resets on incident deferred', () => {
    const boosted = increaseStreak(increaseStreak(createEmptyStreakState()));
    const reset = applyComboStreakEvent(
      boosted,
      createIncidentDeferredEvent({ incidentId: 'inc-1', templateId: 'template', decisionId: 'c' }),
    );

    expect(reset.count).toBe(0);
    expect(reset.multiplier).toBe(1);
  });

  it('resets on exam failed', () => {
    const boosted = increaseStreak(createEmptyStreakState());
    const reset = applyComboStreakEvent(boosted, createExamFailedEvent('exam-1'));

    expect(reset.count).toBe(0);
    expect(reset.multiplier).toBe(1);
  });
});
