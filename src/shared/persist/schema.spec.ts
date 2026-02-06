import { createEmptyFinaleState } from '@/entities/finale';
import { createEmptyEndingState } from '@/entities/ending';
import { createEmptyAchievementsState } from '@/entities/achievements';
import { createEmptyStreakState } from '@/entities/streak';
import { migratePersistedState, PERSIST_SCHEMA_VERSION } from '@/shared/persist/schema';

describe('persist schema migration', () => {
  it('migrates v1 payload to latest version', () => {
    const v1 = {
      version: 1,
      user: {
        role: 'Developer',
        goals: ['Ship MVP'],
        startDate: '2026-02-03',
        isProfileComplete: true,
      },
      progress: {
        skillLevels: { core: 1 },
        decisionHistory: [],
        reputation: 2,
        techDebt: 1,
        scenarioOverrides: {},
        spentXpOnSkills: 3,
        careerStage: 'junior',
      },
      featureFlags: {
        simulatorV2: false,
        demoMode: true,
      },
      auth: {
        login: 'demo',
        profession: 'Developer',
        isRegistered: true,
      },
      xp: 42,
    };

    const migrated = migratePersistedState(v1);

    expect(migrated).toEqual({
      version: PERSIST_SCHEMA_VERSION,
      user: v1.user,
      progress: {
        ...v1.progress,
        coins: 0,
        activeContracts: [],
        completedContractsHistory: [],
        sessionQuests: [],
        sessionQuestSessionId: null,
        candidatesPool: [],
        candidatesRefreshIndex: 0,
        companyTickIndex: 0,
        meta: { isNewGamePlus: false, ngPlusCount: 0, onboardingCompleted: false },
        difficulty: { multiplier: 1, rating: 50, failStreak: 0, successStreak: 0 },
        cosmetics: { earnedBadges: [] },
        achievements: createEmptyAchievementsState(),
        comboStreak: createEmptyStreakState(),
        streak: { lastActiveDate: null, current: 0, best: 0 },
        finale: createEmptyFinaleState(),
        ending: createEmptyEndingState(),
      },
      company: {
        cash: 0,
        level: 'none',
        unlocked: false,
        onboardingSeen: false,
        employees: [],
        ledger: [],
        activeIncident: null,
        incidentsHistory: [],
      },
      inventory: {
        ownedItemIds: [],
      },
      featureFlags: v1.featureFlags,
      auth: v1.auth,
      xp: v1.xp,
    });
  });

  it('deduplicates inventory for v4 payload', () => {
    const v4 = {
      version: 4,
      user: {
        role: 'Developer',
        goals: [],
        startDate: '2026-02-03',
        isProfileComplete: false,
      },
      progress: {
        skillLevels: {},
        decisionHistory: [],
        reputation: 0,
        techDebt: 0,
        coins: 5,
        scenarioOverrides: {},
        spentXpOnSkills: 0,
        careerStage: 'internship',
      },
      company: {
        cash: 10,
      },
      inventory: {
        ownedItemIds: ['shop-a', 'shop-a', 'shop-b'],
      },
    };

    const migrated = migratePersistedState(v4);

    expect(migrated).toEqual({
      version: PERSIST_SCHEMA_VERSION,
      user: v4.user,
      progress: {
        ...v4.progress,
        activeContracts: [],
        completedContractsHistory: [],
        sessionQuests: [],
        sessionQuestSessionId: null,
        candidatesPool: [],
        candidatesRefreshIndex: 0,
        companyTickIndex: 0,
        meta: { isNewGamePlus: false, ngPlusCount: 0, onboardingCompleted: false },
        difficulty: { multiplier: 1, rating: 50, failStreak: 0, successStreak: 0 },
        cosmetics: { earnedBadges: [] },
        achievements: createEmptyAchievementsState(),
        comboStreak: createEmptyStreakState(),
        streak: { lastActiveDate: null, current: 0, best: 0 },
        finale: createEmptyFinaleState(),
        ending: createEmptyEndingState(),
      },
      company: {
        ...v4.company,
        level: 'none',
        unlocked: false,
        onboardingSeen: false,
        employees: [],
        ledger: [],
        activeIncident: null,
        incidentsHistory: [],
      },
      inventory: {
        ownedItemIds: ['shop-a', 'shop-b'],
      },
      featureFlags: undefined,
      auth: undefined,
      xp: undefined,
    });
  });

  it('returns safe defaults for invalid payloads', () => {
    const migrated = migratePersistedState('invalid-json');

    expect(migrated).not.toBeNull();
    if (!migrated) {
      return;
    }

    expect(migrated.version).toBe(PERSIST_SCHEMA_VERSION);
    expect(migrated.user).toMatchObject({
      role: 'Guest',
      goals: [],
      isProfileComplete: false,
    });
    expect(migrated.progress?.achievements?.unlocked ?? {}).toEqual({});
    expect(migrated.progress?.comboStreak?.count).toBe(0);
    expect(migrated.progress?.coins).toBe(0);
    expect(Number.isNaN(migrated.progress?.coins as number)).toBe(false);
  });

  it('fills partial payloads and clamps numeric values', () => {
    const partial = {
      version: PERSIST_SCHEMA_VERSION,
      user: {
        role: 'Developer',
        goals: ['Ship'],
        startDate: '2026-02-04',
        isProfileComplete: true,
      },
      progress: {
        coins: -5,
        reputation: 3,
        techDebt: 0,
        difficulty: {
          multiplier: 99,
          rating: 200,
          failStreak: -2,
          successStreak: 2,
          lastResult: 'pass' as const,
        },
      },
      company: {
        cash: -10,
      },
      inventory: {
        ownedItemIds: ['shop-a', 'shop-a'],
      },
    };

    const migrated = migratePersistedState(partial);

    expect(migrated).not.toBeNull();
    if (!migrated) {
      return;
    }

    expect(migrated.user).toEqual(partial.user);
    expect(migrated.progress?.coins).toBe(0);
    expect(migrated.progress?.difficulty?.multiplier).toBe(3);
    expect(migrated.progress?.difficulty?.rating).toBe(100);
    expect(migrated.progress?.difficulty?.failStreak).toBe(0);
    expect(migrated.progress?.difficulty?.successStreak).toBe(2);
    expect(migrated.progress?.difficulty?.lastResult).toBe('pass');
    expect(migrated.company?.cash).toBe(0);
    expect(migrated.inventory?.ownedItemIds).toEqual(['shop-a']);
  });
});
