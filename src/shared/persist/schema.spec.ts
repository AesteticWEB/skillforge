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
      featureFlags: v1.featureFlags,
      auth: v1.auth,
      xp: v1.xp,
    });
  });
});
