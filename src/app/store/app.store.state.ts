import type { Company } from '@/entities/company';
import { createDefaultDifficultyState } from '@/entities/difficulty';
import { createEmptyAchievementsState } from '@/entities/achievements';
import { createEmptyEndingState } from '@/entities/ending';
import { createEmptyFinaleState } from '@/entities/finale';
import type { Inventory } from '@/entities/inventory';
import type { Progress } from '@/entities/progress';
import { createEmptyStreakState } from '@/entities/streak';
import type { User } from '@/entities/user';
import { BALANCE, FeatureFlags, SkillStageId } from '@/shared/config';
import type { PersistedStateLatest } from '@/shared/persist/schema';

export type AuthState = {
  login: string;
  profession: string;
  isRegistered: boolean;
};

export type AuthResult = {
  ok: boolean;
  error?: string;
};

export type AppStateExport = {
  version: number;
  exportedAt: string;
  user: User;
  progress: Progress;
  company: Company;
  inventory: Inventory;
  featureFlags: FeatureFlags;
  auth: AuthState;
  xp: number;
};

export type ImportResult = {
  ok: boolean;
  error?: string;
};

export type StorageReadResult = {
  state: PersistedStateLatest;
  isLegacy: boolean;
};

export const EXAM_PROFESSION_IDS = [
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'qa',
  'devops',
  'data-engineer',
  'data-scientist-ml',
  'security',
  'gamedev',
] as const;

export type ExamProfessionId = (typeof EXAM_PROFESSION_IDS)[number];

export const EXAM_PROFESSION_LABELS: Record<ExamProfessionId, string> = {
  frontend: '\u0424\u0440\u043e\u043d\u0442\u0435\u043d\u0434',
  backend: '\u0411\u044d\u043a\u0435\u043d\u0434',
  fullstack: '\u0424\u0443\u043b\u043b\u0441\u0442\u0435\u043a',
  mobile: '\u041c\u043e\u0431\u0430\u0439\u043b',
  qa: '\u0422\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 (QA)',
  devops: 'DevOps / SRE',
  'data-engineer': '\u0414\u0430\u0442\u0430-\u0438\u043d\u0436\u0435\u043d\u0435\u0440',
  'data-scientist-ml':
    '\u0414\u0430\u0442\u0430-\u0441\u0430\u0439\u0435\u043d\u0442\u0438\u0441\u0442 / ML',
  security: '\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c',
  gamedev: '\u0413\u0435\u0439\u043c\u0434\u0435\u0432',
};

export const CERT_STAGE_LABELS: Record<SkillStageId, string> = {
  internship: '\u0421\u0442\u0430\u0436\u0438\u0440\u043e\u0432\u043a\u0430',
  junior: '\u0414\u0436\u0443\u043d\u0438\u043e\u0440',
  middle: '\u041c\u0438\u0434\u0434\u043b',
  senior: '\u0421\u0435\u043d\u044c\u043e\u0440',
};

export const createEmptyAuth = (): AuthState => ({
  login: '',
  profession: '',
  isRegistered: false,
});

export const createEmptyUser = (): User => ({
  role: '\\u0411\\u0435\\u0437 \\u0440\\u043e\\u043b\\u0438',
  goals: [],
  startDate: new Date().toISOString().slice(0, 10),
  isProfileComplete: false,
});

export const createEmptyCompany = (): Company => ({
  cash: 0,
  unlocked: false,
  level: 'none',
  onboardingSeen: false,
  employees: [],
  ledger: [],
  activeIncident: null,
  incidentsHistory: [],
});

export const createEmptyInventory = (): Inventory => ({
  ownedItemIds: [],
});

export const createEmptyProgress = (): Progress => ({
  skillLevels: {},
  decisionHistory: [],
  examHistory: [],
  activeExamRun: null,
  certificates: [],
  activeContracts: [],
  completedContractsHistory: [],
  sessionQuests: [],
  sessionQuestSessionId: null,
  candidatesPool: [],
  candidatesRefreshIndex: 0,
  companyTickIndex: 0,
  meta: {
    isNewGamePlus: false,
    ngPlusCount: 0,
    onboardingCompleted: false,
  },
  difficulty: {
    multiplier: 1,
    ...createDefaultDifficultyState(),
  },
  cosmetics: {
    earnedBadges: [],
  },
  achievements: createEmptyAchievementsState(),
  comboStreak: createEmptyStreakState(),
  streak: {
    lastActiveDate: null,
    current: 0,
    best: 0,
  },
  finale: createEmptyFinaleState(),
  ending: createEmptyEndingState(),
  specializationId: null,
  reputation: BALANCE.newGame?.startReputation ?? 0,
  techDebt: BALANCE.newGame?.startTechDebt ?? 0,
  coins: BALANCE.newGame?.startCoins ?? 0,
  scenarioOverrides: {},
  spentXpOnSkills: 0,
  careerStage: 'internship',
});
