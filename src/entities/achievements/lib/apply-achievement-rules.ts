import type { DomainEvent } from '@/shared/lib/events';
import type {
  AchievementId,
  AchievementsState,
  UnlockedAchievement,
} from '../model/achievement.model';

export type AchievementRuleState = {
  unlocked: AchievementsState['unlocked'];
  inventoryOwnedCount: number;
  employeesCount: number;
  techDebt: number;
  streakCurrent: number;
};

const clampCount = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

export const applyAchievementRules = (
  state: AchievementRuleState,
  event: DomainEvent,
): UnlockedAchievement[] => {
  const unlocked = state.unlocked ?? {};
  const results: UnlockedAchievement[] = [];
  const unlockedAt = event.occurredAt;

  const pushUnlock = (id: AchievementId, meta?: Record<string, unknown>): void => {
    if (unlocked[id]) {
      return;
    }
    results.push({ id, unlockedAt, meta });
  };

  const maybeUnlockDebtZero = (): void => {
    if (state.techDebt === 0) {
      pushUnlock('debt_zero_once', { techDebt: state.techDebt });
    }
  };

  const maybeUnlockStreak = (): void => {
    const current = clampCount(state.streakCurrent);
    if (current >= 3) {
      pushUnlock('streak_3', { current });
    }
    if (current >= 10) {
      pushUnlock('streak_10', { current });
    }
  };

  switch (event.type) {
    case 'PurchaseMade': {
      const count = clampCount(state.inventoryOwnedCount);
      if (count >= 1) {
        pushUnlock('shop_first_purchase', { count, itemId: event.payload.itemId });
      }
      if (count >= 5) {
        pushUnlock('shop_collect_5', { count });
      }
      if (count >= 20) {
        pushUnlock('shop_collect_20', { count });
      }
      break;
    }
    case 'EmployeeHired': {
      const count = clampCount(state.employeesCount);
      if (count >= 1) {
        pushUnlock('company_first_hire', { count, employeeId: event.payload.employeeId });
      }
      if (count >= 3) {
        pushUnlock('company_hire_3', { count });
      }
      if (count >= 6) {
        pushUnlock('company_hire_6', { count });
      }
      break;
    }
    case 'ScenarioCompleted':
    case 'ExamPassed':
    case 'CompanyTicked': {
      maybeUnlockDebtZero();
      maybeUnlockStreak();
      break;
    }
    case 'EndingResolved': {
      const endingId = event.payload.endingId;
      pushUnlock('ending_any', { endingId });
      const endingAchievementId = `ending_${endingId}` as AchievementId;
      const validEndingAchievements: AchievementId[] = [
        'ending_ipo',
        'ending_acq',
        'ending_oss',
        'ending_scandal',
        'ending_bankrupt',
      ];
      if (validEndingAchievements.includes(endingAchievementId)) {
        pushUnlock(endingAchievementId, { endingId });
      }
      break;
    }
    default:
      break;
  }

  return results;
};
