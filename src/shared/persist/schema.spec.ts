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
      },
      company: {
        cash: 0,
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
      progress: v4.progress,
      company: v4.company,
      inventory: {
        ownedItemIds: ['shop-a', 'shop-b'],
      },
      featureFlags: undefined,
      auth: undefined,
      xp: undefined,
    });
  });
});
