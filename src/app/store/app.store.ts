import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  applyDecisionEffects,
  createDecisionEntry,
  createProgressSnapshot,
  Progress,
  ProgressSnapshot,
  undoLastDecision,
} from '@/entities/progress';
import type {
  ExamAnswer,
  ExamAttempt,
  ExamConfig,
  ExamQuestion,
  ExamRun,
  ExamSession,
} from '@/entities/exam';
import type { Certificate } from '@/entities/certificates';
import { hasCertificate, makeCertificateId, upsertCertificate } from '@/entities/certificates';
import {
  applyScenarioAvailabilityEffects,
  createScenarioGateContext,
  getScenarioGateResult,
  getScenarioGateResultWithContext,
  Scenario,
} from '@/entities/scenario';
import {
  changeSkillLevel,
  clampSkillLevel,
  getDecreaseBlockReason,
  getSkillUpgradeMeta as resolveSkillUpgradeMeta,
  Skill,
} from '@/entities/skill';
import {
  Company,
  CompanyLedgerEntry,
  CompanyLedgerReason,
  CompanyLevel,
  COMPANY_LEDGER_REASONS,
  COMPANY_LEVELS,
  CompanyTickReason,
  EMPLOYEE_ASSIGNMENTS,
  Employee,
  EmployeeAssignment,
  ASSIGNMENT_LABELS,
  createEmployeeFromCandidate,
  resolveHireCostForCandidate,
  runCompanyTick,
} from '@/entities/company';
import {
  ActiveIncident,
  IncidentDecision,
  IncidentDecisionId,
  IncidentHistoryEntry,
  IncidentSeverity,
  IncidentTemplate,
  INCIDENT_DECISION_IDS,
  INCIDENT_SEVERITIES,
  INCIDENT_SOURCES,
  createIncidentFromRoll,
} from '@/entities/incidents';
import {
  FinaleChoiceId,
  FinaleHistoryEntry,
  FinaleState,
  FinaleStep,
  FinaleStepId,
  FINALE_CHAIN_IDS,
  FINALE_CHOICE_IDS,
  FINALE_STEP_IDS,
  createEmptyFinaleState,
  resolveFinaleEndingId,
  resolveFinaleStep,
} from '@/entities/finale';
import {
  EndingHistoryEntry,
  EndingResult,
  EndingState,
  ResolveEndingInput,
  ENDING_IDS,
  createEmptyEndingState,
  resolveEnding,
} from '@/entities/ending';
import {
  CompletedContractEntry,
  Contract,
  ContractProgressEvent,
  RewardSummary,
  canAcceptContract,
  ensureQuickFixContract,
  generateAvailableContracts,
  QUICK_FIX_CONTRACT_ID,
  isQuickFixContract,
  resolveQuickFixCompletion,
  isStuck,
} from '@/entities/contracts';
import { EarnedBadge, getBadgeById, grantBadgeOnce } from '@/entities/cosmetics';
import { Quest, QuestProgressEvent, generateSessionQuests } from '@/entities/quests';
import { Candidate, generateCandidates } from '@/features/hiring';
import { getTotalBuffs } from '@/entities/buffs';
import { addItem, Inventory, normalizeOwnedItemIds, ownsItem } from '@/entities/inventory';
import { calcScenarioReward, calcScenarioXp } from '@/entities/rewards';
import {
  clampRating,
  createDefaultDifficultyState,
  updateRating,
  DEFAULT_RATING,
} from '@/entities/difficulty';
import type { DecisionEffects } from '@/entities/decision';
import {
  AchievementRuleState,
  applyAchievementRules,
  createEmptyAchievementsState,
} from '@/entities/achievements';
import {
  applyComboStreakEvent,
  calcStreakMultiplier,
  createEmptyStreakState,
} from '@/entities/streak';
import { User } from '@/entities/user';
import {
  BALANCE,
  DEFAULT_FEATURE_FLAGS,
  DEMO_PROFILE,
  FeatureFlagKey,
  FeatureFlags,
  PROFESSION_OPTIONS,
  PROFESSION_STAGE_SKILLS,
  PROFESSION_STAGE_SCENARIOS,
  SKILL_STAGE_LABELS,
  SKILL_STAGE_ORDER,
  SHOP_ITEMS,
  ShopItemId,
  ShopItem,
  SkillStageId,
  SPECIALIZATIONS,
} from '@/shared/config';
import { NotificationsStore } from '@/features/notifications';
import { AchievementsStore } from '@/features/achievements';
import { ScenariosApi } from '@/shared/api/scenarios/scenarios.api';
import { SkillsApi } from '@/shared/api/skills/skills.api';
import {
  ContentApi,
  ExamContent,
  ExamQuestionEntry,
  QuickFixContent,
} from '@/shared/api/content/content.api';
import { ErrorLogStore } from '@/shared/lib/errors';
import {
  createPurchaseMadeEvent,
  createCompanyTickedEvent,
  createEmployeeHiredEvent,
  createEndingResolvedEvent,
  createProfileCreatedEvent,
  createScenarioCompletedEvent,
  createExamPassedEvent,
  createExamFailedEvent,
  createIncidentDeferredEvent,
  createProgressResetEvent,
  createStagePromotedEvent,
  createSkillUpgradedEvent,
  DomainEvent,
  DomainEventBus,
} from '@/shared/lib/events';
import {
  migratePersistedState,
  migratePersistedStateStrict,
  PERSIST_BACKUP_KEY,
  PERSIST_LEGACY_BACKUP_KEYS,
  PERSIST_LEGACY_KEYS,
  PERSIST_SCHEMA_VERSION,
  PERSIST_STORAGE_KEY,
  type PersistedStateLatest,
} from '@/shared/persist/schema';
import {
  getCareerStageProgress,
  getStagePromotionStatus,
  selectCoreSkillsForStage,
} from '@/shared/lib/stage';

declare const ngDevMode: boolean | undefined;
type ScenarioAccess = {
  scenario: Scenario;
  available: boolean;
  reasons: string[];
  status: 'active' | 'completed';
};

type StagePromotionGate = {
  ok: boolean;
  reason?: string;
  requiredCert?: {
    professionId: string;
    stage: SkillStageId;
  };
};

type AuthState = {
  login: string;
  profession: string;
  isRegistered: boolean;
};

type AppStateExport = {
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

type ImportResult = {
  ok: boolean;
  error?: string;
};

type StorageReadResult = {
  state: PersistedStateLatest;
  isLegacy: boolean;
};

const EXAM_PROFESSION_IDS = [
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

type ExamProfessionId = (typeof EXAM_PROFESSION_IDS)[number];

const EXAM_PROFESSION_LABELS: Record<ExamProfessionId, string> = {
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

const CERT_STAGE_LABELS: Record<SkillStageId, string> = {
  internship: '\u0421\u0442\u0430\u0436\u0438\u0440\u043e\u0432\u043a\u0430',
  junior: '\u0414\u0436\u0443\u043d\u0438\u043e\u0440',
  middle: '\u041c\u0438\u0434\u0434\u043b',
  senior: '\u0421\u0435\u043d\u044c\u043e\u0440',
};
const createEmptyAuth = (): AuthState => ({
  login: '',
  profession: '',
  isRegistered: false,
});

const createEmptyUser = (): User => ({
  role: '\\u0411\\u0435\\u0437 \\u0440\\u043e\\u043b\\u0438',
  goals: [],
  startDate: new Date().toISOString().slice(0, 10),
  isProfileComplete: false,
});

const createEmptyCompany = (): Company => ({
  cash: 0,
  unlocked: false,
  level: 'none',
  onboardingSeen: false,
  employees: [],
  ledger: [],
  activeIncident: null,
  incidentsHistory: [],
});

const createEmptyInventory = (): Inventory => ({
  ownedItemIds: [],
});

const createEmptyProgress = (): Progress => ({
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

@Injectable({ providedIn: 'root' })
export class AppStore {
  private static readonly STORAGE_KEY = PERSIST_STORAGE_KEY;
  private static readonly STORAGE_VERSION = PERSIST_SCHEMA_VERSION;
  private static readonly LEGACY_STORAGE_KEYS = PERSIST_LEGACY_KEYS;
  private static readonly BACKUP_STORAGE_KEY = PERSIST_BACKUP_KEY;
  private static readonly LEGACY_BACKUP_KEYS = PERSIST_LEGACY_BACKUP_KEYS;

  private readonly skillsApi = inject(SkillsApi);
  private readonly scenariosApi = inject(ScenariosApi);
  private readonly contentApi = inject(ContentApi);
  private readonly eventBus = inject(DomainEventBus);
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly errorLogStore = inject(ErrorLogStore);
  private readonly achievementsStore = inject(AchievementsStore);
  private readonly numberFormatter = new Intl.NumberFormat('ru-RU');
  private readonly sessionId = this.resolveSessionId();

  private hasHydrated = false;
  private remoteProgressEnabled = false;
  private remoteSaveTimer: number | null = null;
  private remotePendingPayload: PersistedStateLatest | null = null;
  private remoteLastSerialized: string | null = null;
  private remoteSaveInFlight = false;
  private readonly _user = signal<User>(createEmptyUser());
  private readonly _skills = signal<Skill[]>([]);
  private readonly _scenarios = signal<Scenario[]>([]);
  private readonly _shopItems = signal<ShopItem[]>([]);
  private readonly _examDefinitions = signal<ExamContent[]>([]);
  private readonly _examQuestions = signal<ExamQuestionEntry[]>([]);
  private readonly _incidentTemplates = signal<IncidentTemplate[]>([]);
  private readonly _quickFixes = signal<QuickFixContent[]>([]);
  private readonly _skillsLoading = signal<boolean>(false);
  private readonly _scenariosLoading = signal<boolean>(false);
  private readonly _skillsError = signal<string | null>(null);
  private readonly _scenariosError = signal<string | null>(null);
  private readonly _featureFlags = signal<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  private readonly _auth = signal<AuthState>(createEmptyAuth());
  private readonly _xp = signal(0);
  private readonly _progress = signal<Progress>(createEmptyProgress());
  private readonly _company = signal<Company>(createEmptyCompany());
  private readonly _inventory = signal<Inventory>(createEmptyInventory());
  private readonly _availableContracts = signal<Contract[]>([]);
  private readonly _backupAvailable = signal(false);

  readonly user = this._user.asReadonly();
  readonly skills = this._skills.asReadonly();
  readonly scenarios = this._scenarios.asReadonly();
  readonly shopItems = this._shopItems.asReadonly();
  readonly incidentTemplates = this._incidentTemplates.asReadonly();
  readonly quickFixTemplates = this._quickFixes.asReadonly();
  readonly quickFixTemplate = computed(() => {
    const quickFixes = this._quickFixes();
    return quickFixes.find((item) => item.id === QUICK_FIX_CONTRACT_ID) ?? quickFixes[0] ?? null;
  });
  readonly exams = computed(() => this.buildExamConfigs());
  readonly examsById = computed(() => {
    const map: Record<string, ExamConfig> = {};
    for (const exam of this.exams()) {
      map[exam.id] = exam;
    }
    return map;
  });
  readonly examQuestionsById = computed(() => {
    const map: Record<string, ExamQuestion> = {};
    for (const entry of this._examQuestions()) {
      map[entry.question.id] = entry.question;
    }
    return map;
  });
  readonly skillsLoading = this._skillsLoading.asReadonly();
  readonly scenariosLoading = this._scenariosLoading.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly company = this._company.asReadonly();
  readonly inventory = this._inventory.asReadonly();
  readonly availableContracts = this._availableContracts.asReadonly();
  readonly quickFixContract = computed(() => {
    const available = this._availableContracts();
    const active = this._progress().activeContracts ?? [];
    return (
      available.find((contract) => isQuickFixContract(contract)) ??
      active.find((contract) => isQuickFixContract(contract)) ??
      null
    );
  });
  readonly hasQuickFixContract = computed(() => Boolean(this.quickFixContract()));
  readonly achievements = computed(() => this._progress().achievements);
  readonly featureFlags = this._featureFlags.asReadonly();
  readonly auth = this._auth.asReadonly();
  readonly xp = this._xp.asReadonly();
  readonly backupAvailable = this._backupAvailable.asReadonly();
  readonly activeContracts = computed(() => this._progress().activeContracts);
  readonly sessionQuests = computed(() => this._progress().sessionQuests);
  readonly candidatesPool = computed(() => this._progress().candidatesPool);
  readonly finale = computed(() => this._progress().finale);
  readonly ending = computed(() => this._progress().ending);
  readonly spentXpOnSkills = computed(() => this._progress().spentXpOnSkills);
  readonly availableXpForSkills = computed(() =>
    Math.max(0, this._xp() - this._progress().spentXpOnSkills),
  );
  readonly professionId = computed(() => this._auth().profession || this._user().role);
  readonly examProfessionId = computed(() => this.resolveExamProfessionId());
  readonly careerStage = computed(() => this._progress().careerStage);
  readonly stageLabel = computed(() => SKILL_STAGE_LABELS[this.careerStage()]);
  readonly stageSkillIds = computed(() => {
    const profession = this.professionId();
    const stage = this.careerStage();
    return selectCoreSkillsForStage(profession, stage);
  });
  readonly stageSkills = computed(() => {
    const ids = this.stageSkillIds();
    const byId = new Map(this._skills().map((skill) => [skill.id, skill]));
    return ids.map((id) => byId.get(id)).filter((skill): skill is Skill => Boolean(skill));
  });
  readonly stageScenarioIds = computed(() => {
    const profession = this.professionId();
    const stage = this.careerStage();
    const scenarios = this._scenarios();
    if (scenarios.length > 0) {
      return scenarios
        .filter(
          (scenario) =>
            scenario.stage === stage && this.matchesScenarioProfession(scenario, profession),
        )
        .map((scenario) => scenario.id);
    }
    const mapping =
      PROFESSION_STAGE_SCENARIOS[profession as keyof typeof PROFESSION_STAGE_SCENARIOS];
    return mapping?.[stage] ?? [];
  });
  readonly stageScenarioIdSet = computed(() => new Set(this.stageScenarioIds()));
  readonly completedScenarioIds = computed(
    () => new Set(this._progress().decisionHistory.map((entry) => entry.scenarioId)),
  );
  readonly stageScenarioPool = computed(() => {
    const ids = this.stageScenarioIdSet();
    const stage = this.careerStage();
    const profession = this.professionId();
    return this._scenarios().filter(
      (scenario) =>
        ids.has(scenario.id) &&
        scenario.stage === stage &&
        this.matchesScenarioProfession(scenario, profession),
    );
  });
  readonly activeStageScenarios = computed(() => {
    const completed = this.completedScenarioIds();
    return this.stageScenarioPool().filter((scenario) => !completed.has(scenario.id));
  });
  readonly stageScenarioIdsForProgress = computed(() =>
    this.stageScenarioPool().length > 0
      ? this.stageScenarioPool().map((scenario) => scenario.id)
      : this.stageScenarioIds(),
  );
  readonly stagePromotion = computed(() =>
    getStagePromotionStatus(
      this._progress(),
      this._skills(),
      this.professionId(),
      this.stageScenarioIdsForProgress(),
    ),
  );
  readonly stageSkillProgress = computed(() => this.stagePromotion().skills);
  readonly stageScenarioProgress = computed(() => this.stagePromotion().scenarios);
  readonly nextSkillStage = computed(() => this.stagePromotion().nextStage);
  readonly nextStageLabel = computed(() => {
    const next = this.nextSkillStage();
    return next ? SKILL_STAGE_LABELS[next] : null;
  });
  readonly canAdvanceSkillStage = computed(() => this.stagePromotion().canPromote);
  readonly stagePromotionGate = computed(() => this.canPromoteStage());
  readonly stagePromotionReasons = computed(() => {
    const status = this.stagePromotion();
    if (!status.nextStage || status.canPromote) {
      return [];
    }
    const reasons: string[] = [];
    if (status.skills.completed < status.skills.total) {
      reasons.push(
        '\\u041f\\u0440\\u043e\\u043a\\u0430\\u0447\\u0430\\u0439 \\u0432\\u0441\\u0435 4 \\u043d\\u0430\\u0432\\u044b\\u043a\\u0430 \\u044d\\u0442\\u0430\\u043f\\u0430 \\u0434\\u043e \\u043c\\u0430\\u043a\\u0441\\u0438\\u043c\\u0443\\u043c\\u0430',
      );
    }
    return reasons;
  });
  readonly skillsError = this._skillsError.asReadonly();
  readonly scenariosError = this._scenariosError.asReadonly();
  readonly hasProfile = computed(() => this._user().isProfileComplete);
  readonly isRegistered = computed(() => this._auth().isRegistered);
  readonly onboardingCompleted = computed(
    () => this._progress().meta?.onboardingCompleted ?? false,
  );
  readonly careerProgress = computed(() => getCareerStageProgress(this.careerStage()));

  readonly skillsCount = computed(() => this._skills().length);
  readonly scenariosCount = computed(() => this._scenarios().length);
  readonly decisionCount = computed(() => this._progress().decisionHistory.length);
  readonly examHistory = computed(() => this._progress().examHistory);
  readonly activeExamRun = computed(() => this._progress().activeExamRun);
  readonly certificates = computed(() => this._progress().certificates);
  readonly specializationId = computed(() => this._progress().specializationId);
  readonly reputation = computed(() => this._progress().reputation);
  readonly techDebt = computed(() => this._progress().techDebt);
  readonly coins = computed(() => this._progress().coins);
  readonly comboStreakCount = computed(() => this._progress().comboStreak?.count ?? 0);
  readonly comboStreakMultiplier = computed(() => this._progress().comboStreak?.multiplier ?? 1);
  readonly difficultyMultiplier = computed(() => this._progress().difficulty?.multiplier ?? 1);
  readonly playerSkillRating = computed(() =>
    clampRating(this._progress().difficulty?.rating ?? DEFAULT_RATING),
  );
  readonly cosmetics = computed(() => this._progress().cosmetics);
  readonly earnedBadges = computed(() => this._progress().cosmetics.earnedBadges);
  readonly totalBuffs = computed(() => {
    const owned = new Set(this._inventory().ownedItemIds);
    const sources = this._shopItems()
      .filter((item) => owned.has(item.id))
      .map((item) => ({
        effects: {
          coinBonus:
            'coins' in item.effects && typeof item.effects.coins === 'number'
              ? item.effects.coins
              : 0,
        },
      }));
    return getTotalBuffs(
      sources,
      this.resolveExamProfessionId(),
      this.normalizeSpecializationId(this._progress().specializationId),
    );
  });
  readonly companyCash = computed(() => this._company().cash);
  readonly companyUnlocked = computed(() => Boolean(this._company().unlocked));
  readonly companyOnboardingSeen = computed(() => Boolean(this._company().onboardingSeen));
  readonly canUndoDecision = computed(() => {
    const history = this._progress().decisionHistory;
    const lastEntry = history[history.length - 1];
    return Boolean(lastEntry?.snapshot);
  });
  readonly completedScenarioCount = computed(() => {
    return this.completedScenarioIds().size;
  });
  readonly topSkillsByLevel = computed(() => {
    return [...this._skills()]
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
      .slice(0, 3);
  });
  readonly progressSeries = computed(() => {
    let count = 0;
    return this._progress().decisionHistory.map((entry) => {
      count += 1;
      return { decidedAt: entry.decidedAt, value: count };
    });
  });
  readonly progressChart = computed(() => {
    const width = 120;
    const height = 40;
    const values = this.progressSeries().map((point) => point.value);
    const series = values.length > 0 ? [0, ...values] : [];

    if (series.length === 0) {
      return { points: '', latest: 0 };
    }

    const max = Math.max(...series, 1);
    const lastIndex = series.length - 1;
    const points = series
      .map((value, index) => {
        const x = (index / lastIndex) * width;
        const y = height - (value / max) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return {
      points,
      latest: series[series.length - 1],
    };
  });
  readonly decisionHistoryDetailed = computed(() => {
    const scenarios = new Map(this._scenarios().map((scenario) => [scenario.id, scenario]));

    return this._progress().decisionHistory.map((entry) => {
      const scenario = scenarios.get(entry.scenarioId);
      const decision = scenario?.decisions.find((item) => item.id === entry.decisionId);

      return {
        ...entry,
        scenarioTitle:
          scenario?.title ??
          '\u041d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0439 \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0439',
        decisionText:
          decision?.text ??
          '\u041d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0435 \u0440\u0435\u0448\u0435\u043d\u0438\u0435',
        effects: decision?.effects ?? {},
      };
    });
  });
  readonly scenarioAccessList = computed<ScenarioAccess[]>(() => {
    const skills = this._skills();
    const progress = this._progress();
    const context = createScenarioGateContext(skills, progress);
    return this.activeStageScenarios().map((scenario) => {
      const gate = getScenarioGateResultWithContext(scenario, context);
      return {
        scenario,
        available: gate.available,
        reasons: gate.reasons,
        status: 'active',
      };
    });
  });
  private readonly scenarioAccessMap = computed(() => {
    return new Map(this.scenarioAccessList().map((entry) => [entry.scenario.id, entry]));
  });

  constructor() {
    this.hydrateFromStorage();
    this.syncBackupAvailability();
    this.load();
    this.ensureSessionQuests();
    this.hasHydrated = true;
    void this.hydrateFromRemote();
    effect(() => {
      if (!this.hasHydrated) {
        return;
      }
      this.persistProgress();
    });
    effect(() => {
      if (!this.hasHydrated) {
        return;
      }
      this.ensureSafetyNetContract();
    });
    this.eventBus.subscribe('ScenarioCompleted', (event) => {
      this.updateDailyStreak();
      const progressEvent: ContractProgressEvent = {
        type: 'ScenarioCompleted',
        scenarioId: event.payload.scenarioId,
      };
      this.applyEventToContracts(progressEvent);
      this.applyEventToSessionQuests(progressEvent);
      this.applyCompanyTick('scenario');
    });
    this.eventBus.subscribe('PurchaseMade', (event) => {
      const progressEvent: ContractProgressEvent = {
        type: 'PurchaseMade',
        itemId: event.payload.itemId,
        currency: event.payload.currency,
      };
      this.applyEventToContracts(progressEvent);
      this.applyEventToSessionQuests(progressEvent);
    });
    this.eventBus.subscribe('ExamPassed', (event) => {
      this.updateDailyStreak();
      const progressEvent: ContractProgressEvent = {
        type: 'ExamPassed',
        examId: event.payload.examId,
        stage: event.payload.stage,
      };
      this.applyEventToContracts(progressEvent);
      this.applyEventToSessionQuests(progressEvent);
      this.applyCompanyTick('exam');
      this.updateDifficultyAfterExam('pass');
    });
    this.eventBus.subscribe('ExamFailed', () => {
      this.updateDifficultyAfterExam('fail');
    });
  }

  load(): void {
    this._skillsError.set(null);
    this._scenariosError.set(null);
    this._skillsLoading.set(true);
    this._scenariosLoading.set(true);

    this.skillsApi.getSkills().subscribe({
      next: (skills) => {
        const mergedLevels = this.mergeSkillLevels(
          skills,
          this._progress().skillLevels,
          !this._auth().isRegistered,
        );
        const hydratedSkills = skills.map((skill) => ({
          ...skill,
          level: mergedLevels[skill.id],
        }));

        this._skills.set(hydratedSkills);
        this._progress.update((progress) => ({
          ...progress,
          skillLevels: mergedLevels,
        }));
        this._skillsLoading.set(false);
      },
      error: () => {
        this._skillsError.set(
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043d\u0430\u0432\u044b\u043a\u0438.',
        );
        this._skills.set([]);
        this._skillsLoading.set(false);
      },
    });

    this.scenariosApi.getScenarios().subscribe({
      next: (scenarios) => {
        this._scenarios.set(scenarios);
        this._scenariosLoading.set(false);
      },
      error: () => {
        this._scenariosError.set(
          '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u0446\u0435\u043d\u0430\u0440\u0438\u0438.',
        );
        this._scenarios.set([]);
        this._scenariosLoading.set(false);
      },
    });

    this.contentApi.getItems().subscribe({
      next: (items) => {
        this._shopItems.set(items);
      },
      error: (error) => {
        this.logDevError('content-items-load-failed', error);
        this._shopItems.set([]);
      },
    });

    this.contentApi.getExams().subscribe({
      next: (exams) => {
        this._examDefinitions.set(exams);
      },
      error: (error) => {
        this.logDevError('content-exams-load-failed', error);
        this._examDefinitions.set([]);
      },
    });

    this.contentApi.getQuestions().subscribe({
      next: (questions) => {
        this._examQuestions.set(questions);
      },
      error: (error) => {
        this.logDevError('content-questions-load-failed', error);
        this._examQuestions.set([]);
      },
    });

    this.contentApi.getIncidents().subscribe({
      next: (incidents) => {
        this._incidentTemplates.set(incidents);
      },
      error: (error) => {
        this.logDevError('content-incidents-load-failed', error);
        this._incidentTemplates.set([]);
      },
    });

    this.contentApi.getQuickFixes().subscribe({
      next: (quickFixes) => {
        this._quickFixes.set(quickFixes);
      },
      error: (error) => {
        this.logDevError('content-quickfix-load-failed', error);
        this._quickFixes.set([]);
      },
    });
  }

  refreshAvailableContracts(): void {
    const seed = this.resolveContractSeed();
    const generated = generateAvailableContracts({
      stage: this.careerStage(),
      reputation: this.reputation(),
      techDebt: this.techDebt(),
      seed,
      count: 5,
    });
    const activeIds = new Set(this._progress().activeContracts.map((contract) => contract.id));
    const existingQuickFix = this._availableContracts().find((contract) =>
      isQuickFixContract(contract),
    );
    const nextAvailable = generated.filter((contract) => !activeIds.has(contract.id));
    this._availableContracts.set(
      existingQuickFix ? [existingQuickFix, ...nextAvailable] : nextAvailable,
    );
  }

  private ensureSafetyNetContract(): void {
    if (!this._auth().isRegistered || !this._user().isProfileComplete) {
      return;
    }
    if (this._skillsLoading() || this._scenariosLoading()) {
      return;
    }

    const available = this._availableContracts();
    const active = this._progress().activeContracts ?? [];
    const availableContractsCount = available.filter(
      (contract) => !isQuickFixContract(contract),
    ).length;
    const companyCash = this.companyUnlocked() ? this.companyCash() : 0;
    const stageGate = this.stagePromotionGate();
    const canPromote = this.canAdvanceSkillStage() && stageGate.ok;
    const examAvailable = this.isExamAvailableForSafetyNet(stageGate.requiredCert !== undefined);
    const quickFixTemplate = this.quickFixTemplate();

    const stuck = isStuck({
      coins: this.coins(),
      companyCash,
      activeScenariosCount: this.activeStageScenarios().length,
      stageSkillIds: this.stageSkillIds(),
      skills: this._skills(),
      availableXp: this.availableXpForSkills(),
      canPromote,
      availableContractsCount,
      examAvailable,
    });

    const { available: nextAvailable, added } = ensureQuickFixContract({
      available,
      active,
      stuck,
      stage: this.careerStage(),
      seed: `${this.resolveContractSeed()}:quick-fix`,
      rewardCoins: quickFixTemplate?.rewardCoins,
      title: quickFixTemplate?.title,
      description: quickFixTemplate?.description,
    });

    if (added) {
      this._availableContracts.set(nextAvailable);
    }
  }

  private isExamAvailableForSafetyNet(needsCertificate: boolean): boolean {
    if (!needsCertificate) {
      return false;
    }
    const professionId = this.examProfessionId();
    if (!professionId) {
      return false;
    }
    return Boolean(this.getExamByProfessionStage(professionId, this.careerStage()));
  }

  initCandidatesIfEmpty(): void {
    if (!this.isCompanyUnlocked()) {
      return;
    }
    const progress = this._progress();
    if (progress.candidatesPool.length > 0) {
      return;
    }
    const refreshIndex = this.normalizeCandidatesRefreshIndex(progress.candidatesRefreshIndex);
    const pool = this.buildCandidatesPool(refreshIndex);
    this._progress.update((current) => ({
      ...current,
      candidatesPool: pool,
      candidatesRefreshIndex: refreshIndex,
    }));
  }

  refreshCandidates(): void {
    if (!this.isCompanyUnlocked()) {
      return;
    }
    const cost = BALANCE.hiring?.refreshCostCoins ?? 200;
    const currentCoins = this.coins();
    if (currentCoins < cost) {
      this.notificationsStore.error(
        '\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 coins.',
      );
      return;
    }
    const nextIndex = this.normalizeCandidatesRefreshIndex(
      this._progress().candidatesRefreshIndex + 1,
    );
    const pool = this.buildCandidatesPool(nextIndex);
    this._progress.update((current) => ({
      ...current,
      coins: this.normalizeCoins(current.coins - cost),
      candidatesPool: pool,
      candidatesRefreshIndex: nextIndex,
    }));
    this.notificationsStore.success(
      `\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442\u044b \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b (-${cost} coins)`,
    );
  }

  hireCandidate(candidateId: string): { ok: boolean; reason?: string } {
    if (!this.isCompanyUnlocked()) {
      return {
        ok: false,
        reason:
          '\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f \u0437\u0430\u043a\u0440\u044b\u0442\u0430',
      };
    }
    const trimmedId = candidateId?.trim();
    if (!trimmedId) {
      this.logDevError('candidate-missing-id', { candidateId });
      return {
        ok: false,
        reason:
          '\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442 \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d',
      };
    }
    const progress = this._progress();
    const candidate = progress.candidatesPool.find((entry) => entry.id === trimmedId);
    if (!candidate) {
      this.logDevError('candidate-not-found', { candidateId: trimmedId });
      return {
        ok: false,
        reason:
          '\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442 \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d',
      };
    }

    const company = this._company();
    if (company.employees.some((employee) => employee.id === candidate.id)) {
      return {
        ok: false,
        reason:
          '\u041a\u0430\u043d\u0434\u0438\u0434\u0430\u0442 \u0443\u0436\u0435 \u043d\u0430\u043d\u044f\u0442',
      };
    }

    const hireCost = resolveHireCostForCandidate(candidate);
    if (company.cash < hireCost) {
      return { ok: false, reason: '\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 cash' };
    }

    const hiredAtIso = new Date().toISOString();
    const employee = createEmployeeFromCandidate(candidate, hiredAtIso);

    this._company.update((current) => ({
      ...current,
      cash: this.normalizeCash(current.cash - hireCost),
      employees: [...current.employees, employee],
    }));
    this._progress.update((current) => ({
      ...current,
      candidatesPool: current.candidatesPool.filter((entry) => entry.id !== candidate.id),
    }));

    this.notificationsStore.success(
      `\u041d\u043e\u0432\u044b\u0439 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a: ${candidate.name} (-${this.formatNumber(hireCost)} cash)`,
    );

    this.publishEvent(
      createEmployeeHiredEvent({
        employeeId: employee.id,
        name: employee.name,
        role: employee.role,
      }),
    );

    return { ok: true };
  }

  setEmployeeAssignment(employeeId: string, assignment: EmployeeAssignment): void {
    if (!this.isEmployeeAssignment(assignment)) {
      this.logDevWarn('employee-assignment-invalid', { assignment });
      return;
    }
    const company = this._company();
    const index = company.employees.findIndex((employee) => employee.id === employeeId);
    if (index === -1) {
      this.logDevError('employee-not-found', { employeeId });
      return;
    }
    const employee = company.employees[index];
    if (employee.assignment === assignment) {
      return;
    }
    const nextEmployees = [...company.employees];
    nextEmployees[index] = {
      ...employee,
      assignment,
    };
    this._company.update((current) => ({
      ...current,
      employees: nextEmployees,
    }));
    const label = ASSIGNMENT_LABELS[assignment] ?? assignment;
    this.notificationsStore.success(
      `\u041d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u0438\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e: ${employee.name} -> ${label}`,
    );
  }

  ensureSessionQuests(force = false): void {
    if (!this._user().isProfileComplete) {
      if (
        this._progress().sessionQuests.length > 0 ||
        this._progress().sessionQuestSessionId !== null
      ) {
        this._progress.update((progress) => ({
          ...progress,
          sessionQuests: [],
          sessionQuestSessionId: null,
        }));
      }
      return;
    }

    const currentSessionId = this.sessionId;
    const progress = this._progress();
    const needsRefresh =
      force ||
      progress.sessionQuestSessionId !== currentSessionId ||
      progress.sessionQuests.length !== 3;

    if (!needsRefresh) {
      return;
    }

    const seed = this.resolveSessionQuestSeed();
    const quests = generateSessionQuests({ seed, sessionId: currentSessionId });
    if (quests.length !== 3) {
      return;
    }

    this._progress.update((current) => ({
      ...current,
      sessionQuests: quests,
      sessionQuestSessionId: currentSessionId,
    }));
  }

  acceptContract(contractId: string): void {
    const active = this._progress().activeContracts;
    if (active.some((contract) => contract.id === contractId)) {
      return;
    }
    if (contractId === QUICK_FIX_CONTRACT_ID) {
      this.completeQuickFixContract();
      return;
    }
    if (!canAcceptContract(active.length)) {
      this.notificationsStore.error(
        '\u041c\u043e\u0436\u043d\u043e \u043c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 3 \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442\u0430',
      );
      return;
    }
    const available = this._availableContracts();
    const contract = available.find((item) => item.id === contractId);
    if (!contract) {
      this.logDevError('contract-not-found', { contractId });
      return;
    }

    this._progress.update((progress) => ({
      ...progress,
      activeContracts: [...progress.activeContracts, contract],
    }));
    this._availableContracts.set(available.filter((item) => item.id !== contractId));
  }

  abandonContract(contractId: string): void {
    const active = this._progress().activeContracts;
    if (!active.some((contract) => contract.id === contractId)) {
      this.logDevError('contract-not-found', { contractId });
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      activeContracts: progress.activeContracts.filter((contract) => contract.id !== contractId),
    }));
  }

  completeQuickFixContract(): boolean {
    const available = this._availableContracts();
    const active = this._progress().activeContracts;
    const completedAtIso = new Date().toISOString();
    const completion = resolveQuickFixCompletion({
      available,
      active,
      completedAtIso,
    });
    if (!completion) {
      return false;
    }

    const reward = completion.reward;
    const rewardCoins = this.normalizeCoins(reward.coins);
    const rewardCash = typeof reward.cash === 'number' ? this.normalizeCash(reward.cash) : 0;
    const reputationDelta = typeof reward.reputationDelta === 'number' ? reward.reputationDelta : 0;
    const techDebtDelta = typeof reward.techDebtDelta === 'number' ? reward.techDebtDelta : 0;

    this._availableContracts.set(completion.available);
    this._progress.update((progress) => ({
      ...progress,
      activeContracts: completion.active,
      completedContractsHistory: [...progress.completedContractsHistory, completion.completedEntry],
      coins: this.normalizeCoins(progress.coins + rewardCoins),
      reputation: this.normalizeReputation(progress.reputation + reputationDelta),
      techDebt: this.normalizeTechDebt(progress.techDebt + techDebtDelta),
    }));

    if (rewardCash > 0) {
      this._company.update((company) => ({
        ...company,
        cash: this.normalizeCash(company.cash + rewardCash),
      }));
    }

    this.notificationsStore.success(
      `Quick Fix \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d: +${rewardCoins} coins`,
    );
    return true;
  }

  applyEventToContracts(event: ContractProgressEvent): {
    completed: Contract[];
    totalReward: RewardSummary;
  } {
    const active = this._progress().activeContracts;
    if (active.length === 0) {
      return { completed: [], totalReward: this.createEmptyRewardSummary() };
    }

    const objectiveType = this.resolveObjectiveTypeForEvent(event);
    if (!objectiveType) {
      return { completed: [], totalReward: this.createEmptyRewardSummary() };
    }

    let didUpdate = false;
    const completed: Contract[] = [];
    const updatedActive = active.map((contract) => {
      if (!Array.isArray(contract.objectives) || contract.objectives.length === 0) {
        this.logDevError('contract-empty-objectives', { contractId: contract.id });
        return contract;
      }

      const hasMatchingObjective = contract.objectives.some(
        (objective) => objective.type === objectiveType,
      );
      const updatedObjectives = contract.objectives.map((objective) => {
        if (objective.type !== objectiveType) {
          return objective;
        }
        const current = Number.isFinite(objective.currentValue) ? objective.currentValue : 0;
        const target = Number.isFinite(objective.targetValue) ? objective.targetValue : 0;
        const next = Math.min(target, current + 1);
        if (next !== current) {
          didUpdate = true;
        }
        return {
          ...objective,
          currentValue: next,
        };
      });

      const isCompleted = updatedObjectives.every((objective) => {
        const current = Number.isFinite(objective.currentValue) ? objective.currentValue : 0;
        const target = Number.isFinite(objective.targetValue) ? objective.targetValue : 0;
        return current >= target;
      });

      const updatedContract =
        updatedObjectives === contract.objectives
          ? contract
          : { ...contract, objectives: updatedObjectives };
      if (hasMatchingObjective && isCompleted) {
        completed.push(updatedContract);
      }
      return updatedContract;
    });

    if (!didUpdate && completed.length === 0) {
      return { completed: [], totalReward: this.createEmptyRewardSummary() };
    }

    const completedIds = new Set(completed.map((contract) => contract.id));
    const remaining =
      completed.length > 0
        ? updatedActive.filter((contract) => !completedIds.has(contract.id))
        : updatedActive;
    const totalReward = this.sumContractRewards(completed);
    const completedAtIso = new Date().toISOString();

    this._progress.update((progress) => ({
      ...progress,
      activeContracts: remaining,
      completedContractsHistory:
        completed.length > 0
          ? [
              ...progress.completedContractsHistory,
              ...completed.map((contract) => ({
                id: contract.id,
                title: contract.title,
                completedAtIso,
                reward: contract.reward,
              })),
            ]
          : progress.completedContractsHistory,
      coins:
        completed.length > 0
          ? this.normalizeCoins(progress.coins + totalReward.coins)
          : progress.coins,
      reputation:
        completed.length > 0
          ? this.normalizeReputation(progress.reputation + totalReward.reputationDelta)
          : progress.reputation,
      techDebt:
        completed.length > 0
          ? this.normalizeTechDebt(progress.techDebt + totalReward.techDebtDelta)
          : progress.techDebt,
    }));

    if (completed.length > 0 && totalReward.cash !== 0) {
      this._company.update((company) => ({
        ...company,
        cash: this.normalizeCash(company.cash + totalReward.cash),
      }));
    }

    if (completed.length > 0) {
      const rewardLabel = this.formatRewardSummary(totalReward);
      const message =
        completed.length === 1
          ? `\u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d: ${completed[0].title}. \u041d\u0430\u0433\u0440\u0430\u0434\u0430: ${rewardLabel}`
          : `\u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442\u044b \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u044b: ${completed.length}. \u041d\u0430\u0433\u0440\u0430\u0434\u0430: ${rewardLabel}`;
      this.notificationsStore.success(message);
    }

    return { completed, totalReward };
  }

  applyEventToSessionQuests(event: QuestProgressEvent): {
    claimed: Quest[];
    earnedCoins: number;
    earnedBadges: string[];
  } {
    const quests = this._progress().sessionQuests;
    if (quests.length === 0) {
      return { claimed: [], earnedCoins: 0, earnedBadges: [] };
    }

    const objectiveType = this.resolveQuestObjectiveType(event);
    if (!objectiveType) {
      return { claimed: [], earnedCoins: 0, earnedBadges: [] };
    }

    let didUpdate = false;
    const claimed: Quest[] = [];
    const updated = quests.map((quest) => {
      if (quest.status === 'claimed') {
        return quest;
      }

      const objective = quest.objective;
      if (objective.type !== objectiveType) {
        return quest;
      }

      const current = Number.isFinite(objective.current) ? objective.current : 0;
      const target = Number.isFinite(objective.target) ? objective.target : 0;
      const next = Math.min(target, current + 1);
      if (next !== current) {
        didUpdate = true;
      }
      const nextObjective = {
        ...objective,
        current: next,
      };
      const isCompleted = target > 0 && next >= target;
      const nextStatus: Quest['status'] = isCompleted ? 'claimed' : quest.status;
      const nextQuest = {
        ...quest,
        objective: nextObjective,
        status: nextStatus,
      };
      if (isCompleted) {
        claimed.push(nextQuest);
      }
      return nextQuest;
    });

    if (!didUpdate && claimed.length === 0) {
      return { claimed: [], earnedCoins: 0, earnedBadges: [] };
    }

    const totalCoins = claimed.reduce((sum, quest) => sum + (quest.reward?.coins ?? 0), 0);
    const badgeIds = claimed.map((quest) => quest.reward?.badgeId).filter(Boolean) as string[];
    const uniqueBadges = Array.from(new Set(badgeIds));

    this._progress.update((progress) => ({
      ...progress,
      sessionQuests: updated,
      coins: this.normalizeCoins(progress.coins + totalCoins),
    }));

    if (uniqueBadges.length > 0) {
      for (const badgeId of uniqueBadges) {
        this.grantQuestBadge(badgeId);
      }
    }

    return { claimed, earnedCoins: totalCoins, earnedBadges: uniqueBadges };
  }

  getBadgeTitle(badgeId: string): string {
    const badge = getBadgeById(badgeId);
    return badge?.title ?? badgeId;
  }

  grantBadge(badgeId: string, source: EarnedBadge['source']): void {
    const badge = getBadgeById(badgeId);
    if (!badge) {
      this.logDevError('badge-not-found', { badgeId });
      return;
    }
    const nowIso = new Date().toISOString();
    let added = false;
    this._progress.update((current) => {
      const cosmetics = current.cosmetics ?? { earnedBadges: [] };
      const nextEarned = grantBadgeOnce(cosmetics.earnedBadges, badge.id, source, nowIso);
      if (nextEarned === cosmetics.earnedBadges) {
        return current;
      }
      added = true;
      return {
        ...current,
        cosmetics: {
          ...cosmetics,
          earnedBadges: nextEarned,
        },
      };
    });

    if (added) {
      this.notificationsStore.success(
        `\u041d\u043e\u0432\u044b\u0439 \u0431\u0435\u0439\u0434\u0436: ${badge.title}`,
      );
    }
  }

  applyCompanyTick(reason: CompanyTickReason): void {
    if (!this.isCompanyUnlocked()) {
      return;
    }

    const progress = this._progress();
    const tickIndex = this.normalizeCompanyTickIndex(progress.companyTickIndex);
    const seed = this.resolveCompanyTickSeed();
    const companyBefore = this._company();

    const result = runCompanyTick({
      reason,
      state: {
        company: companyBefore,
        reputation: this.reputation(),
        techDebt: this.techDebt(),
        totalBuffs: this.totalBuffs(),
        difficultyMultiplier: this.difficultyMultiplier(),
      },
      seed,
      tickIndex,
    });

    const nextLedger = this.appendCompanyLedger(companyBefore.ledger ?? [], result.ledgerEntry);
    const normalizedCash = this.normalizeCash(result.nextCompany.cash);

    this._company.set({
      ...result.nextCompany,
      cash: normalizedCash,
      ledger: nextLedger,
    });

    this._progress.update((current) => ({
      ...current,
      reputation: this.normalizeReputation(current.reputation + result.reputationDelta),
      techDebt:
        typeof result.techDebtDelta === 'number'
          ? this.normalizeTechDebt(current.techDebt + result.techDebtDelta)
          : current.techDebt,
      companyTickIndex: tickIndex + 1,
    }));

    this.publishEvent(
      createCompanyTickedEvent({
        reason,
        tickIndex,
        reputationDelta: result.reputationDelta,
        techDebtDelta: result.techDebtDelta ?? 0,
      }),
    );

    if (result.incident?.happened) {
      this.tryStartIncidentFromTick({ ...result, tickIndex, reason });
      this.notificationsStore.error(
        '\u0412\u043d\u0438\u043c\u0430\u043d\u0438\u0435! \u041e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d \u0438\u043d\u0446\u0438\u0434\u0435\u043d\u0442.',
      );
      return;
    }

    const cashDelta = result.ledgerEntry.delta.netCash;
    const signedDelta = `${cashDelta >= 0 ? '+' : ''}${this.formatNumber(Math.abs(cashDelta))}`;
    this.notificationsStore.success(
      `\u0414\u043e\u0445\u043e\u0434: ${signedDelta} cash (\u0434\u043e\u0445\u043e\u0434 - \u0440\u0430\u0441\u0445\u043e\u0434\u044b)`,
    );
  }

  tryStartIncidentFromTick(
    context: ReturnType<typeof runCompanyTick> & {
      tickIndex: number;
      reason: CompanyTickReason;
    },
  ): void {
    if (!context.incident?.happened) {
      return;
    }
    const company = this._company();
    if (company.activeIncident) {
      this.logDevInfo('incident-skip-active', { instanceId: company.activeIncident.instanceId });
      return;
    }
    const incident = createIncidentFromRoll({
      seed: `${this.resolveCompanyTickSeed()}`,
      tickIndex: context.tickIndex,
      reason: context.reason,
      stage: this.careerStage(),
      reputation: this.reputation(),
      techDebt: this.techDebt(),
      templates: this._incidentTemplates(),
    });

    this._company.update((current) => ({
      ...current,
      activeIncident: incident,
    }));
  }

  resolveIncident(decisionId: IncidentDecisionId): void {
    const company = this._company();
    const incident = company.activeIncident;
    if (!incident) {
      return;
    }
    const decision = incident.decisions.find((entry) => entry.id === decisionId);
    if (!decision) {
      this.logDevError('incident-decision-not-found', {
        instanceId: incident.instanceId,
        decisionId,
      });
      return;
    }

    const effects = decision.effects;
    const resolvedAtIso = new Date().toISOString();
    const moraleDelta = typeof effects.moraleDelta === 'number' ? effects.moraleDelta : 0;

    const nextEmployees = company.employees.map((employee) => ({
      ...employee,
      morale: this.normalizeEmployeeMorale(employee.morale + moraleDelta),
    }));

    const nextHistory = [
      {
        instanceId: incident.instanceId,
        templateId: incident.templateId,
        chosenDecisionId: decision.id,
        resolvedAtIso,
        effects: { ...effects },
      },
      ...(company.incidentsHistory ?? []),
    ].slice(0, 20);

    this._company.update((current) => ({
      ...current,
      cash: this.normalizeCash(current.cash + effects.cashDelta),
      employees: nextEmployees,
      activeIncident: null,
      incidentsHistory: nextHistory,
    }));

    this._progress.update((current) => ({
      ...current,
      reputation: this.normalizeReputation(current.reputation + effects.reputationDelta),
      techDebt:
        typeof effects.techDebtDelta === 'number'
          ? this.normalizeTechDebt(current.techDebt + effects.techDebtDelta)
          : current.techDebt,
    }));

    const cashLabel = this.formatSignedValue(effects.cashDelta);
    const repLabel = this.formatSignedValue(effects.reputationDelta);
    this.notificationsStore.success(
      `\u0418\u043d\u0446\u0438\u0434\u0435\u043d\u0442 \u0440\u0435\u0448\u0451\u043d: ${incident.title}. \u0418\u0442\u043e\u0433: ${cashLabel} cash, ${repLabel} \u0440\u0435\u043f\u0443\u0442\u0430\u0446\u0438\u044f`,
    );

    if (this.isIncidentDeferredDecision(decision)) {
      this.publishEvent(
        createIncidentDeferredEvent({
          incidentId: incident.instanceId,
          templateId: incident.templateId,
          decisionId: decision.id,
        }),
      );
    }
  }

  setUser(user: User): void {
    this._user.set(user);
  }

  register(login: string, password: string, profession: string): boolean {
    const normalizedLogin = login.trim();
    const normalizedPassword = password.trim();
    const normalizedProfession = profession.trim();

    if (
      normalizedLogin.length === 0 ||
      normalizedPassword.length === 0 ||
      normalizedProfession.length === 0
    ) {
      return false;
    }

    const profile: User = {
      role:
        normalizedProfession.length > 0
          ? normalizedProfession
          : '\\u0411\\u0435\\u0437 \\u0440\\u043e\\u043b\\u0438',
      goals: [],
      startDate: new Date().toISOString().slice(0, 10),
      isProfileComplete: true,
    };

    this._auth.set({
      login: normalizedLogin,
      profession: normalizedProfession,
      isRegistered: true,
    });
    this._user.set(profile);
    this._progress.set(createEmptyProgress());
    this._availableContracts.set([]);
    this._company.set(createEmptyCompany());
    this._inventory.set(createEmptyInventory());
    this._xp.set(0);
    this.setFeatureFlag('demoMode', false);
    this.load();
    this.ensureSessionQuests(true);
    this.publishEvent(createProfileCreatedEvent(profile));
    return true;
  }

  setXp(value: number): void {
    this._xp.set(this.normalizeXp(value));
  }

  addXp(delta: number): void {
    if (!Number.isFinite(delta)) {
      return;
    }
    this._xp.update((current) => this.normalizeXp(current + delta));
  }

  setCareerStage(stage: SkillStageId): void {
    if (!this.isValidStage(stage)) {
      this.logDevWarn('career-stage-invalid', { stage });
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      careerStage: stage,
    }));
    this.checkAndUnlockCompany();
  }

  setCoins(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      coins: this.normalizeCoins(value),
    }));
  }

  addCoins(delta: number): void {
    if (!Number.isFinite(delta)) {
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      coins: this.normalizeCoins(progress.coins + delta),
    }));
  }

  setReputation(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      reputation: this.normalizeReputation(value),
    }));
  }

  addReputation(delta: number): void {
    if (!Number.isFinite(delta)) {
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      reputation: this.normalizeReputation(progress.reputation + delta),
    }));
  }

  setTechDebt(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      techDebt: this.normalizeTechDebt(value),
    }));
  }

  addTechDebt(delta: number): void {
    if (!Number.isFinite(delta)) {
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      techDebt: this.normalizeTechDebt(progress.techDebt + delta),
    }));
  }

  setCompanyCash(value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }
    this._company.update((company) => ({
      ...company,
      cash: this.normalizeCash(value),
    }));
  }

  addCompanyCash(delta: number): void {
    if (!Number.isFinite(delta)) {
      return;
    }
    this._company.update((company) => ({
      ...company,
      cash: this.normalizeCash(company.cash + delta),
    }));
  }

  setCompanyUnlocked(unlocked: boolean): void {
    if (typeof unlocked !== 'boolean') {
      return;
    }
    this._company.update((company) => {
      if (company.unlocked === unlocked) {
        return company;
      }
      if (!unlocked) {
        return {
          ...company,
          unlocked: false,
        };
      }

      const startCash = BALANCE.company?.startCash ?? 5000;
      const startLevel = BALANCE.company?.startLevel ?? 'lead';
      const nextCash = Number.isFinite(company.cash) && company.cash > 0 ? company.cash : startCash;
      const nextLevel = company.level !== 'none' ? company.level : startLevel;

      return {
        ...company,
        unlocked: true,
        level: nextLevel,
        cash: this.normalizeCash(nextCash),
        onboardingSeen: false,
      };
    });
    if (unlocked) {
      this.checkFinaleUnlock();
    }
  }

  setCompanyLevel(level: CompanyLevel): void {
    if (!this.isCompanyLevel(level)) {
      this.logDevWarn('company-level-invalid', { level });
      return;
    }
    this._company.update((company) => ({
      ...company,
      level,
    }));
    this.checkFinaleUnlock();
  }

  setCompanyOnboardingSeen(seen: boolean): void {
    if (typeof seen !== 'boolean') {
      return;
    }
    this._company.update((company) => ({
      ...company,
      onboardingSeen: seen,
    }));
  }

  checkAndUnlockCompany(options: { allowLegacy?: boolean } = {}): void {
    const company = this._company();
    if (company.unlocked) {
      return;
    }
    if (this.careerStage() !== 'senior') {
      return;
    }

    const professionId = this.resolveExamProfessionId();
    const certificates = this._progress().certificates ?? [];
    const hasSeniorCert = professionId
      ? hasCertificate(certificates, professionId, 'senior')
      : false;

    if (!hasSeniorCert && !options.allowLegacy) {
      return;
    }

    const startCash = BALANCE.company?.startCash ?? 5000;
    const startLevel = BALANCE.company?.startLevel ?? 'lead';
    const nextCash = Number.isFinite(company.cash) && company.cash > 0 ? company.cash : startCash;
    const nextLevel = company.level !== 'none' ? company.level : startLevel;

    this._company.update((current) => ({
      ...current,
      unlocked: true,
      level: nextLevel,
      cash: this.normalizeCash(nextCash),
      onboardingSeen: false,
    }));

    if (options.allowLegacy && !hasSeniorCert) {
      this.logDevInfo('[migrate] auto-unlocked company for legacy senior save', {
        stage: this.careerStage(),
      });
    }
  }

  checkFinaleUnlock(): void {
    const finale = this._progress().finale;
    if (finale.unlocked) {
      return;
    }
    const company = this._company();
    if (!company.unlocked) {
      return;
    }
    if (company.level !== 'cto') {
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      finale: {
        ...progress.finale,
        unlocked: true,
      },
    }));
  }

  startFinaleChain(): void {
    const finale = this._progress().finale;
    if (!finale.unlocked) {
      this.notificationsStore.error(
        '\u0424\u0438\u043d\u0430\u043b \u0435\u0449\u0451 \u0437\u0430\u043a\u0440\u044b\u0442.',
      );
      return;
    }
    if (this._company().level !== 'cto') {
      this.notificationsStore.error(
        '\u0424\u0438\u043d\u0430\u043b \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0430 \u0443\u0440\u043e\u0432\u043d\u0435 CTO.',
      );
      return;
    }
    if (finale.finished) {
      this.notificationsStore.error(
        '\u0424\u0438\u043d\u0430\u043b \u0443\u0436\u0435 \u043f\u0440\u043e\u0439\u0434\u0435\u043d.',
      );
      return;
    }
    if (finale.active) {
      this.notificationsStore.error(
        '\u0424\u0438\u043d\u0430\u043b \u0443\u0436\u0435 \u0437\u0430\u043f\u0443\u0449\u0435\u043d.',
      );
      return;
    }

    const startStep = resolveFinaleStep('board_meeting', 'bm_1', finale.branchFlags);
    if (!startStep) {
      this.logDevError('finale-start-step-missing', { chainId: finale.chainId });
      return;
    }

    this._progress.update((progress) => ({
      ...progress,
      finale: {
        ...progress.finale,
        unlocked: true,
        active: true,
        chainId: 'board_meeting',
        currentStepId: 'bm_1',
        completedStepIds: [],
        history: [],
        branchFlags: {},
        finished: false,
        endingId: undefined,
      },
    }));
  }

  chooseFinaleOption(choiceId: FinaleChoiceId): EndingResult | null {
    const progress = this._progress();
    const finale = progress.finale;
    if (!finale.active || finale.finished) {
      return null;
    }

    const step = resolveFinaleStep(finale.chainId, finale.currentStepId, finale.branchFlags);
    if (!step) {
      this.logDevError('finale-step-missing', {
        chainId: finale.chainId,
        stepId: finale.currentStepId,
      });
      this._progress.update((current) => ({
        ...current,
        finale: {
          ...current.finale,
          active: false,
        },
      }));
      return null;
    }

    const choice = step.choices.find((entry) => entry.id === choiceId);
    if (!choice) {
      this.logDevError('finale-choice-missing', {
        stepId: step.id,
        choiceId,
      });
      return null;
    }

    const updatedFlags = this.applyFinaleBranchFlags(step.id, choice.id, finale.branchFlags);
    const nextCompleted = this.appendFinaleCompletedStep(finale.completedStepIds, step.id);
    const nextHistory = [
      ...finale.history,
      { stepId: step.id, choiceId: choice.id, atIso: new Date().toISOString() },
    ];

    const nextInfo = this.resolveFinaleNextStep({
      step,
      choice,
      completedStepIds: nextCompleted,
      branchFlags: updatedFlags,
    });
    if (nextInfo.failed) {
      this._progress.update((current) => ({
        ...current,
        finale: {
          ...current.finale,
          active: false,
        },
      }));
      return null;
    }
    const nextStep = nextInfo.nextStep;
    if (nextStep && !resolveFinaleStep(finale.chainId, nextStep, updatedFlags)) {
      this.logDevError('finale-next-step-missing', {
        chainId: finale.chainId,
        stepId: nextStep,
      });
      this._progress.update((current) => ({
        ...current,
        finale: {
          ...current.finale,
          active: false,
        },
      }));
      return null;
    }

    const effects = choice.effects ?? {};
    const cashDelta = effects.cashDelta ?? 0;
    const reputationDelta = effects.reputationDelta ?? 0;
    const techDebtDelta = effects.techDebtDelta ?? 0;
    const moraleDelta = effects.moraleDelta ?? 0;

    const company = this._company();
    const nextCash = this.normalizeCash(company.cash + cashDelta);
    const nextEmployees =
      moraleDelta !== 0
        ? company.employees.map((employee) => ({
            ...employee,
            morale: this.normalizeEmployeeMorale(employee.morale + moraleDelta),
          }))
        : company.employees;

    const nextReputation = this.normalizeReputation(progress.reputation + reputationDelta);
    const nextTechDebt = this.normalizeTechDebt(progress.techDebt + techDebtDelta);

    let endingId: string | undefined;
    const isFinished = nextStep === null;
    if (isFinished) {
      endingId = resolveFinaleEndingId({
        branchFlags: updatedFlags,
        cash: nextCash,
        reputation: nextReputation,
        techDebt: nextTechDebt,
      });
    }

    this._company.update((current) => ({
      ...current,
      cash: nextCash,
      employees: nextEmployees,
    }));

    this._progress.update((current) => ({
      ...current,
      reputation: nextReputation,
      techDebt: nextTechDebt,
      finale: {
        ...current.finale,
        branchFlags: updatedFlags,
        completedStepIds: nextCompleted,
        history: nextHistory,
        currentStepId: nextStep ?? current.finale.currentStepId,
        active: !isFinished,
        finished: isFinished ? true : current.finale.finished,
        endingId: endingId ?? current.finale.endingId,
      },
    }));

    if (isFinished) {
      return this.computeAndStoreEnding();
    }

    return null;
  }

  computeAndStoreEnding(): EndingResult | null {
    const progress = this._progress();
    if (!progress.finale.finished) {
      return null;
    }
    if (progress.ending.last) {
      return progress.ending.last;
    }

    const company = this._company();
    const avgMorale = this.resolveAverageMorale(company.employees);
    const input: ResolveEndingInput = {
      cash: company.cash,
      reputation: progress.reputation,
      techDebt: progress.techDebt,
      avgMorale,
      companyLevel: company.level,
      finale: {
        finished: progress.finale.finished,
        endingHint: progress.finale.endingId,
        branchFlags: progress.finale.branchFlags,
      },
      counters: {
        completedContracts: progress.completedContractsHistory.length,
        incidents: company.incidentsHistory.length,
        incidentsResolved: company.incidentsHistory.length,
      },
    };

    const resolved = resolveEnding(input);
    const finishedAtIso = new Date().toISOString();
    const historyEntry: EndingHistoryEntry = {
      endingId: resolved.endingId,
      title: resolved.title,
      finishedAtIso,
      stats: resolved.stats,
    };

    this._progress.update((current) => ({
      ...current,
      ending: {
        ...current.ending,
        last: resolved,
        finishedAtIso,
        history: [historyEntry, ...(current.ending.history ?? [])].slice(0, 20),
        isEndingUnlocked: true,
      },
    }));

    this.grantEndingBadge(resolved.endingId);
    this.publishEvent(createEndingResolvedEvent(resolved.endingId));

    return resolved;
  }

  clearLastEnding(): void {
    this._progress.update((current) => ({
      ...current,
      ending: {
        ...current.ending,
        last: null,
        finishedAtIso: null,
        isEndingUnlocked: false,
      },
    }));
  }

  isFinaleStepAllowed(stepId: FinaleStepId): boolean {
    const finale = this._progress().finale;
    if (!finale.active) {
      return false;
    }
    if (finale.currentStepId === stepId) {
      return true;
    }
    return finale.completedStepIds.includes(stepId);
  }

  private applyFinaleBranchFlags(
    stepId: FinaleStepId,
    choiceId: FinaleChoiceId,
    currentFlags: Record<string, boolean>,
  ): Record<string, boolean> {
    const flags = { ...currentFlags };
    if (stepId === 'bm_1') {
      if (choiceId === 'a') {
        flags['aggressive'] = true;
      }
      if (choiceId === 'b') {
        flags['stability'] = true;
      }
      if (choiceId === 'c') {
        flags['balanced'] = true;
      }
    }
    if (stepId === 'bm_2') {
      if (choiceId === 'a') {
        flags['stability'] = true;
      }
      if (choiceId === 'b') {
        flags['aggressive'] = true;
        flags['fastTrackDeal'] = true;
      }
      if (choiceId === 'c') {
        flags['ethical'] = true;
      }
    }
    if (stepId === 'bm_3' && choiceId === 'b') {
      flags['ethical'] = true;
    }
    return flags;
  }

  private appendFinaleCompletedStep(current: FinaleStepId[], stepId: FinaleStepId): FinaleStepId[] {
    if (current.includes(stepId)) {
      return current;
    }
    return [...current, stepId];
  }

  private resolveFinaleNextStep(params: {
    step: FinaleStep;
    choice: FinaleStep['choices'][number];
    completedStepIds: FinaleStepId[];
    branchFlags: Record<string, boolean>;
  }): { nextStep: FinaleStepId | null; failed: boolean } {
    let nextStep = params.choice.nextStep ?? params.step.defaultNext;
    if (nextStep === null) {
      return { nextStep: null, failed: false };
    }

    if (params.branchFlags['fastTrackDeal']) {
      if (params.step.id === 'bm_4' && !params.completedStepIds.includes('bm_3')) {
        nextStep = 'bm_3';
      }
      if (params.step.id === 'bm_3' && params.completedStepIds.includes('bm_4')) {
        nextStep = 'bm_5';
      }
    }

    if (!this.isFinaleStepId(nextStep)) {
      this.logDevError('finale-next-step-invalid', { stepId: params.step.id, nextStep });
      return { nextStep: null, failed: true };
    }

    if (params.completedStepIds.includes(nextStep)) {
      this.logDevWarn('finale-next-step-completed', { stepId: params.step.id, nextStep });
      return { nextStep: null, failed: true };
    }

    return { nextStep, failed: false };
  }

  logout(): void {
    this.resetAll();
  }

  resetAll(): void {
    this.clearStorage();
    this.resetState();
    this.publishEvent(createProgressResetEvent('reset_all'));
  }

  startNewGamePlus(): void {
    const progress = this._progress();
    const startConfig = BALANCE.newGame ?? { startCoins: 0, startReputation: 0, startTechDebt: 0 };
    const ngPlusConfig = BALANCE.ngPlus ?? { startCoinsBonusPct: 0.2, difficultyMultiplier: 1.2 };
    const startCoins = Math.floor(
      (startConfig.startCoins ?? 0) * (1 + (ngPlusConfig.startCoinsBonusPct ?? 0)),
    );
    const carryBadges = ngPlusConfig.carryOver?.badges ?? true;
    const cosmetics = carryBadges
      ? this.normalizeCosmeticsState(progress.cosmetics)
      : { earnedBadges: [] };

    const resetSkills = this._skills().map((skill) => ({
      ...skill,
      level: 0,
    }));
    const resetLevels = resetSkills.reduce<Record<string, number>>((acc, skill) => {
      acc[skill.id] = 0;
      return acc;
    }, {});

    const endingState = progress.ending ?? createEmptyEndingState();
    const nextEnding: EndingState = {
      ...endingState,
      last: null,
      finishedAtIso: null,
      isEndingUnlocked: false,
      history: endingState.history ?? [],
    };

    const nextMeta = {
      isNewGamePlus: true,
      ngPlusCount: (progress.meta?.ngPlusCount ?? 0) + 1,
      onboardingCompleted: progress.meta?.onboardingCompleted ?? false,
    };

    this._skills.set(resetSkills);
    this._xp.set(0);
    this._progress.set({
      ...progress,
      skillLevels: resetLevels,
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
      meta: nextMeta,
      difficulty: {
        multiplier: ngPlusConfig.difficultyMultiplier ?? 1,
        ...createDefaultDifficultyState(),
      },
      cosmetics,
      comboStreak: createEmptyStreakState(),
      streak: {
        lastActiveDate: null,
        current: 0,
        best: 0,
      },
      finale: createEmptyFinaleState(),
      ending: nextEnding,
      specializationId: null,
      reputation: startConfig.startReputation ?? 0,
      techDebt: startConfig.startTechDebt ?? 0,
      coins: startCoins,
      scenarioOverrides: {},
      spentXpOnSkills: 0,
      careerStage: 'internship',
    });

    const luxuryOwnedIds = this.resolveLuxuryOwnedItems(this._inventory().ownedItemIds ?? []);
    this._inventory.set({
      ownedItemIds: normalizeOwnedItemIds(luxuryOwnedIds),
    });

    this._availableContracts.set([]);
    this._company.set(createEmptyCompany());

    this.ensureSessionQuests(true);
    this.publishEvent(createProgressResetEvent('new_game_plus'));
    this.notificationsStore.success(
      'New Game+ \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d: \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f luxury \u0438 \u0446\u0435\u043b\u0438, \u043f\u043e\u0432\u044b\u0448\u0430\u0435\u0442\u0441\u044f \u0441\u043b\u043e\u0436\u043d\u043e\u0441\u0442\u044c',
    );
  }

  createProfile(role: string, goal: string, selectedSkillIds: string[]): void {
    const startDate = new Date().toISOString().slice(0, 10);
    const normalizedRole = role.trim();
    const normalizedGoal = goal.trim();
    const selected = new Set(selectedSkillIds);
    const startConfig = BALANCE.newGame ?? { startCoins: 0, startReputation: 0, startTechDebt: 0 };

    const profile: User = {
      role:
        normalizedRole.length > 0
          ? normalizedRole
          : '\\u0411\\u0435\\u0437 \\u0440\\u043e\\u043b\\u0438',
      goals: normalizedGoal.length > 0 ? [normalizedGoal] : [],
      startDate,
      isProfileComplete: true,
    };

    this._user.set(profile);

    const updatedSkills = this._skills().map((skill) => {
      const level = selected.has(skill.id) ? 1 : 0;
      return {
        ...skill,
        level: clampSkillLevel(level, skill.maxLevel),
      };
    });

    const skillLevels = updatedSkills.reduce<Record<string, number>>((acc, skill) => {
      acc[skill.id] = skill.level;
      return acc;
    }, {});

    this._skills.set(updatedSkills);
    this._progress.set({
      skillLevels,
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
      reputation: startConfig.startReputation ?? 0,
      techDebt: startConfig.startTechDebt ?? 0,
      coins: startConfig.startCoins ?? 0,
      scenarioOverrides: {},
      spentXpOnSkills: 0,
      careerStage: 'internship',
    });
    this._availableContracts.set([]);
    this._company.set(createEmptyCompany());
    this._inventory.set(createEmptyInventory());
    this._xp.set(0);

    this.setFeatureFlag('demoMode', false);
    this.publishEvent(createProfileCreatedEvent(profile));
    this.ensureSessionQuests(true);
  }

  applyDemoProfile(): void {
    const demo = DEMO_PROFILE;
    this.createProfile(demo.role, demo.goal, demo.selectedSkillIds);
    for (const decision of demo.decisions) {
      this.applyDecision(decision.scenarioId, decision.decisionId);
    }
    this.setFeatureFlag('demoMode', true);
  }

  exportState(): string {
    const payload: AppStateExport = {
      version: AppStore.STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      user: this._user(),
      progress: this._progress(),
      company: this._company(),
      inventory: this._inventory(),
      featureFlags: this._featureFlags(),
      auth: this._auth(),
      xp: this._xp(),
    };
    return JSON.stringify(payload, null, 2);
  }

  importState(raw: string): ImportResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        error: '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 JSON.',
      };
    }

    if (!this.isRecord(parsed)) {
      return {
        ok: false,
        error:
          'JSON \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043e\u0431\u044a\u0435\u043a\u0442\u043e\u043c.',
      };
    }

    const migrated = migratePersistedStateStrict(parsed);
    if (!migrated) {
      return {
        ok: false,
        error:
          '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.',
      };
    }
    const sourceVersion = this.resolvePersistedVersion(parsed);
    const allowLegacy = sourceVersion !== AppStore.STORAGE_VERSION;
    return this.applyPersistedState(migrated, { allowLegacy });
  }

  restoreBackup(): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    const backupEntry = this.readRawBackup();
    if (!backupEntry) {
      return false;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(backupEntry.raw);
    } catch (error) {
      this.handleStorageError(error, 'backup-parse');
      return false;
    }

    const migrated = migratePersistedStateStrict(parsed);
    if (!migrated) {
      this.handleStorageError(new Error('Unsupported backup version'), 'backup-migrate');
      return false;
    }

    const sourceVersion = this.resolvePersistedVersion(parsed);
    const allowLegacy = sourceVersion !== AppStore.STORAGE_VERSION;
    const result = this.applyPersistedState(migrated, { allowLegacy });
    if (!result.ok) {
      this.handleStorageError(new Error(result.error ?? 'Invalid backup payload'), 'backup-apply');
      return false;
    }

    if (backupEntry.key !== AppStore.BACKUP_STORAGE_KEY) {
      localStorage.removeItem(backupEntry.key);
    }
    this.notificationsStore.success(
      '\u0411\u044d\u043a\u0430\u043f \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d.',
    );
    this._backupAvailable.set(true);
    return true;
  }

  private applyPersistedState(
    migrated: PersistedStateLatest,
    options: { allowLegacy?: boolean } = {},
  ): ImportResult {
    const user = this.parseUser(migrated.user);
    if (!user) {
      return {
        ok: false,
        error:
          '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0444\u0438\u043b\u044f.',
      };
    }

    const progress = this.parseProgress(migrated.progress);
    if (!progress) {
      return {
        ok: false,
        error:
          '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441\u0430.',
      };
    }
    const company = this.parseCompany(migrated.company);
    if (!company) {
      return {
        ok: false,
        error:
          '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438.',
      };
    }
    const inventory = this.parseInventory(migrated.inventory);
    if (!inventory) {
      return {
        ok: false,
        error:
          '\u041d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u0438\u043d\u0432\u0435\u043d\u0442\u0430\u0440\u044f.',
      };
    }

    const featureFlags = this.parseFeatureFlags(migrated.featureFlags);
    const auth = this.parseAuth(migrated.auth);
    const xp = this.parseXp(migrated.xp);

    this._user.set(user);
    this._progress.set(progress);
    this._company.set(company);
    this._inventory.set(inventory);
    this._availableContracts.set([]);
    this._featureFlags.set(featureFlags);
    this.ensureSessionQuests();
    if (auth) {
      this._auth.set(auth);
      if (auth.isRegistered && !user.isProfileComplete) {
        this._user.set({
          ...user,
          role: auth.profession || user.role,
          isProfileComplete: true,
        });
      }
    } else {
      this._auth.set(createEmptyAuth());
    }
    this._xp.set(xp);

    if (this._skills().length > 0) {
      const mergedLevels = this.mergeSkillLevels(
        this._skills(),
        progress.skillLevels,
        !this._auth().isRegistered,
      );
      this._skills.set(
        this._skills().map((skill) => ({
          ...skill,
          level: mergedLevels[skill.id],
        })),
      );
      this._progress.update((current) => ({
        ...current,
        skillLevels: mergedLevels,
      }));
    }

    this.checkAndUnlockCompany({ allowLegacy: options.allowLegacy });
    this.checkFinaleUnlock();
    return { ok: true };
  }

  applyDecision(scenarioId: string, decisionId: string): void {
    const scenario = this._scenarios().find((item) => item.id === scenarioId);
    if (!scenario) {
      return;
    }
    if (this.completedScenarioIds().has(scenarioId)) {
      return;
    }
    const gate = getScenarioGateResult(scenario, this._skills(), this._progress());
    if (!gate.available) {
      return;
    }
    const decision = scenario.decisions.find((item) => item.id === decisionId);
    if (!decision) {
      return;
    }

    const buffs = this.totalBuffs();
    const adjustedEffects = this.applyBuffsToDecisionEffects(decision.effects, buffs);
    const reputationDelta = adjustedEffects['reputation'] ?? 0;
    const techDebtDelta = adjustedEffects['techDebt'] ?? 0;
    const coinsEffectDelta = adjustedEffects['coins'] ?? 0;
    const rewardXp = calcScenarioXp({ baseXp: BALANCE.rewards.scenarioXp, buffs });
    const snapshot = createProgressSnapshot(this._progress());
    const comboMultiplier = calcStreakMultiplier((this._progress().comboStreak?.count ?? 0) + 1);
    const beforeSkills = this._skills();
    this.recordDecision(scenarioId, decisionId, snapshot);
    const result = applyDecisionEffects(beforeSkills, this._progress(), adjustedEffects);
    const progressWithAvailability = applyScenarioAvailabilityEffects(
      result.progress,
      scenario.availabilityEffects ?? [],
    );
    const rewardCoins = calcScenarioReward({
      reputation: progressWithAvailability.reputation,
      techDebt: progressWithAvailability.techDebt,
      buffs,
      comboMultiplier,
      difficultyMultiplier: this.difficultyMultiplier(),
    });
    const progressWithRewards = {
      ...progressWithAvailability,
      coins: this.normalizeCoins(progressWithAvailability.coins + rewardCoins),
    };
    this._skills.set(result.skills);
    this._progress.set(progressWithRewards);
    this.addXp(rewardXp);

    const coinsDelta = coinsEffectDelta + rewardCoins;
    this.emitSkillUpgrades(beforeSkills, result.skills);
    this.publishEvent(
      createScenarioCompletedEvent(scenarioId, decisionId, {
        rewardXp,
        reputationDelta,
        techDebtDelta,
        coinsDelta,
      }),
    );
  }

  private applyBuffsToDecisionEffects(
    effects: DecisionEffects,
    buffs: ReturnType<typeof getTotalBuffs>,
  ): DecisionEffects {
    const adjusted: DecisionEffects = { ...effects };
    const repDelta = typeof adjusted['reputation'] === 'number' ? adjusted['reputation'] : 0;
    const debtDelta = typeof adjusted['techDebt'] === 'number' ? adjusted['techDebt'] : 0;

    if (repDelta > 0 && buffs.repBonusFlat !== 0) {
      adjusted['reputation'] = repDelta + buffs.repBonusFlat;
    }

    if (debtDelta !== 0 && buffs.techDebtReduceFlat !== 0) {
      if (debtDelta > 0) {
        adjusted['techDebt'] = Math.max(0, debtDelta - buffs.techDebtReduceFlat);
      } else {
        adjusted['techDebt'] = debtDelta;
      }
    }

    return adjusted;
  }

  setActiveExamRun(run: ExamRun | null): void {
    this._progress.update((progress) => ({
      ...progress,
      activeExamRun: run,
    }));
  }

  updateActiveExamRun(patch: Partial<ExamRun>): void {
    this._progress.update((progress) => {
      if (!progress.activeExamRun) {
        return progress;
      }
      return {
        ...progress,
        activeExamRun: {
          ...progress.activeExamRun,
          ...patch,
        },
      };
    });
  }

  recordExamAttempt(attempt: ExamAttempt, rewardCoins: number): void {
    this._progress.update((progress) => ({
      ...progress,
      coins: this.normalizeCoins(progress.coins + rewardCoins),
      examHistory: [...progress.examHistory, attempt],
      activeExamRun: null,
    }));
  }

  private updateDifficultyAfterExam(result: 'pass' | 'fail'): void {
    this._progress.update((progress) => {
      const updated = updateRating(
        {
          rating: progress.difficulty?.rating ?? DEFAULT_RATING,
          failStreak: progress.difficulty?.failStreak ?? 0,
          successStreak: progress.difficulty?.successStreak ?? 0,
          lastResult: progress.difficulty?.lastResult,
        },
        result,
      );
      return {
        ...progress,
        difficulty: {
          multiplier: progress.difficulty?.multiplier ?? 1,
          ...updated,
        },
      };
    });
  }

  notifyExamPassed(examId: string, stage?: SkillStageId, score?: number): void {
    if (typeof examId !== 'string' || examId.trim().length === 0) {
      return;
    }
    this.publishEvent(
      createExamPassedEvent(examId, {
        stage: stage && this.isValidStage(stage) ? stage : undefined,
        score: typeof score === 'number' ? score : undefined,
      }),
    );
  }

  notifyExamFailed(examId: string, stage?: SkillStageId, score?: number): void {
    if (typeof examId !== 'string' || examId.trim().length === 0) {
      return;
    }
    this.publishEvent(
      createExamFailedEvent(examId, {
        stage: stage && this.isValidStage(stage) ? stage : undefined,
        score: typeof score === 'number' ? score : undefined,
      }),
    );
  }

  setSpecialization(specId: string): void {
    const normalized = this.normalizeSpecializationId(specId);
    if (!normalized) {
      this.logDevError('specialization-invalid', { specId });
      return;
    }
    this._progress.update((progress) => ({
      ...progress,
      specializationId: normalized,
    }));
  }

  grantCertificateFromExam(input: {
    examId: string;
    professionId: string | null | undefined;
    stage: SkillStageId | null | undefined;
    score: number;
    issuedAt: string;
  }): void {
    const professionId = input.professionId?.trim();
    const stage = input.stage;
    if (!professionId || !stage || !this.isValidStage(stage)) {
      this.logDevError('certificate-invalid-data', input);
      return;
    }

    const score = this.normalizeScore(input.score);
    const certificate: Certificate = {
      id: makeCertificateId(professionId, stage),
      professionId,
      stage,
      examId: input.examId,
      issuedAt: input.issuedAt,
      score,
    };

    this._progress.update((progress) => ({
      ...progress,
      certificates: upsertCertificate(progress.certificates ?? [], certificate),
    }));
    this.checkAndUnlockCompany();
  }

  clearDecisionHistory(): void {
    this._progress.update((progress) => ({
      ...progress,
      decisionHistory: [],
    }));
  }

  undoLastDecision(): boolean {
    const result = undoLastDecision(this._skills(), this._progress());
    if (!result.undone) {
      return false;
    }
    this._skills.set(result.skills);
    this._progress.set(result.progress);
    return true;
  }

  toggleFeatureFlag(flag: FeatureFlagKey): void {
    this._featureFlags.update((current) => ({
      ...current,
      [flag]: !current[flag],
    }));
  }

  setFeatureFlag(flag: FeatureFlagKey, value: boolean): void {
    this._featureFlags.update((current) => ({
      ...current,
      [flag]: value,
    }));
  }

  setOnboardingCompleted(value: boolean): void {
    this._progress.update((progress) => ({
      ...progress,
      meta: {
        ...progress.meta,
        onboardingCompleted: value,
      },
    }));
  }

  buyItem(itemId: string): boolean {
    const item = this._shopItems().find((entry) => entry.id === itemId);
    if (!item) {
      this.notificationsStore.error(
        '\u041f\u0440\u0435\u0434\u043c\u0435\u0442 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d.',
      );
      return false;
    }

    const inventory = this._inventory();
    if (ownsItem(inventory, item.id as ShopItemId)) {
      this.notificationsStore.error(
        '\u041f\u0440\u0435\u0434\u043c\u0435\u0442 \u0443\u0436\u0435 \u043a\u0443\u043f\u043b\u0435\u043d.',
      );
      return false;
    }

    if (!Number.isFinite(item.price) || item.price <= 0) {
      this.notificationsStore.error(
        '\u041f\u0440\u0435\u0434\u043c\u0435\u0442 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.',
      );
      return false;
    }

    const currency = item.currency === 'cash' ? 'cash' : 'coins';
    if (currency === 'cash') {
      if (!this.isCompanyUnlocked()) {
        this.notificationsStore.error(
          'Cash-\u0442\u043e\u0432\u0430\u0440\u044b \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u043f\u043e\u0441\u043b\u0435 Senior \u0438 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u0430.',
        );
        return false;
      }
      const company = this._company();
      const currentCash = company?.cash ?? 0;
      if (currentCash < item.price) {
        this.notificationsStore.error(
          '\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 cash.',
        );
        return false;
      }
      const cashAfter = this.normalizeCash(currentCash - item.price);
      this._company.update((current) => ({
        ...current,
        cash: cashAfter,
      }));
      this._inventory.update((current) => addItem(current, item.id as ShopItemId));
      this.notificationsStore.success(`\u041f\u043e\u043a\u0443\u043f\u043a\u0430: ${item.name}.`);
      this.publishEvent(
        createPurchaseMadeEvent(item.id, item.price, {
          itemName: item.name,
          currency: 'cash',
          cashBefore: currentCash,
          cashAfter,
        }),
      );
      return true;
    }

    const currentCoins = this._progress().coins;
    if (currentCoins < item.price) {
      this.notificationsStore.error(
        '\u041d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u043c\u043e\u043d\u0435\u0442.',
      );
      return false;
    }

    const coinsAfter = this.normalizeCoins(currentCoins - item.price);
    this._progress.update((progress) => ({
      ...progress,
      coins: coinsAfter,
    }));
    this._inventory.update((current) => addItem(current, item.id as ShopItemId));
    this.notificationsStore.success(`\u041f\u043e\u043a\u0443\u043f\u043a\u0430: ${item.name}.`);
    this.publishEvent(
      createPurchaseMadeEvent(item.id, item.price, {
        itemName: item.name,
        currency: 'coins',
        coinsBefore: currentCoins,
        coinsAfter,
      }),
    );
    return true;
  }

  incrementSkillLevel(skillId: string, delta = 1): void {
    const beforeSkills = this._skills();
    const previousLevel = beforeSkills.find((skill) => skill.id === skillId)?.level ?? 0;
    if (delta < 0) {
      return;
    }

    const upgradeMeta = this.getSkillUpgradeMeta(skillId);
    const upgradeCost = upgradeMeta.cost;
    if (!upgradeMeta.canIncrease || upgradeCost === null) {
      return;
    }

    const result = changeSkillLevel(beforeSkills, skillId, delta);
    if (result.reason || result.nextLevel === null) {
      return;
    }

    this._skills.set(result.skills);
    this._progress.update((progress) => ({
      ...progress,
      skillLevels: {
        ...progress.skillLevels,
        [skillId]: result.nextLevel ?? progress.skillLevels[skillId] ?? 0,
      },
      spentXpOnSkills: progress.spentXpOnSkills + upgradeCost,
    }));

    if (result.nextLevel > previousLevel) {
      const maxLevel = result.skills.find((skill) => skill.id === skillId)?.maxLevel ?? 0;
      const skillName = result.skills.find((skill) => skill.id === skillId)?.name ?? skillId;
      const skillStage = this.resolveSkillStageForSkill(skillId);
      const profession = this._auth().profession || this._user().role;
      this.publishEvent(
        createSkillUpgradedEvent(skillId, previousLevel, result.nextLevel, maxLevel, {
          skillName,
          cost: upgradeCost,
          skillStage: skillStage ?? undefined,
          profession: profession || undefined,
        }),
      );
    }
  }

  getSkillUpgradeMeta(skillId: string) {
    return resolveSkillUpgradeMeta(this._skills(), skillId, this.availableXpForSkills());
  }

  canIncreaseSkill(skillId: string): boolean {
    return this.getSkillUpgradeMeta(skillId).canIncrease;
  }

  canDecreaseSkill(skillId: string): boolean {
    return getDecreaseBlockReason(this._skills(), skillId) === null;
  }

  getIncreaseBlockReason(skillId: string): string | null {
    return this.getSkillUpgradeMeta(skillId).reason;
  }

  getDecreaseBlockReason(skillId: string): string | null {
    return getDecreaseBlockReason(this._skills(), skillId);
  }

  recordDecision(
    scenarioId: string,
    decisionId: string,
    snapshot: ProgressSnapshot = createProgressSnapshot(this._progress()),
  ): void {
    const entry = createDecisionEntry(scenarioId, decisionId, snapshot);
    this._progress.update((progress) => ({
      ...progress,
      decisionHistory: [...progress.decisionHistory, entry],
    }));
  }

  getScenarioAccess(scenarioId: string): ScenarioAccess | null {
    const scenario = this._scenarios().find((item) => item.id === scenarioId);
    if (!scenario) {
      return null;
    }
    if (this.completedScenarioIds().has(scenarioId)) {
      return {
        scenario,
        available: false,
        reasons: [
          '\u0421\u0446\u0435\u043d\u0430\u0440\u0438\u0439 \u0443\u0436\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d.',
        ],
        status: 'completed',
      };
    }
    if (!this.stageScenarioIdSet().has(scenarioId)) {
      return {
        scenario,
        available: false,
        reasons: [
          '\u0421\u0446\u0435\u043d\u0430\u0440\u0438\u0439 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u043d\u0430 \u044d\u0442\u043e\u043c \u044d\u0442\u0430\u043f\u0435.',
        ],
        status: 'active',
      };
    }
    if (
      scenario.stage !== this.careerStage() ||
      !this.matchesScenarioProfession(scenario, this.professionId())
    ) {
      return {
        scenario,
        available: false,
        reasons: [
          '\u0421\u0446\u0435\u043d\u0430\u0440\u0438\u0439 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.',
        ],
        status: 'active',
      };
    }
    return (
      this.scenarioAccessMap().get(scenarioId) ?? {
        scenario,
        available: false,
        reasons: [
          '\u0421\u0446\u0435\u043d\u0430\u0440\u0438\u0439 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d.',
        ],
        status: 'active',
      }
    );
  }

  advanceSkillStage(): boolean {
    const gate = this.canPromoteStage();
    if (!gate.ok) {
      return false;
    }
    const status = this.stagePromotion();
    const nextStage = status.nextStage;
    if (!nextStage || !status.canPromote) {
      return false;
    }
    const resetSkills = this._skills().map((skill) => ({
      ...skill,
      level: 0,
    }));
    const resetLevels = resetSkills.reduce<Record<string, number>>((acc, skill) => {
      acc[skill.id] = 0;
      return acc;
    }, {});

    this._skills.set(resetSkills);
    this._progress.update((progress) => ({
      ...progress,
      careerStage: nextStage,
      skillLevels: resetLevels,
    }));
    this.checkAndUnlockCompany();
    this.publishEvent(createStagePromotedEvent(status.stage, nextStage));
    return true;
  }

  canPromoteStage(): StagePromotionGate {
    const professionId = this.resolveExamProfessionId();
    const stage = this.careerStage();
    if (!professionId || !this.isValidStage(stage)) {
      this.logDevError('certificate-missing-profession-or-stage', {
        professionId,
        stage,
      });
      return {
        ok: false,
        reason:
          '\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0430\u0442\u044c \u044d\u043a\u0437\u0430\u043c\u0435\u043d, \u0447\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u044c\u0441\u044f.',
      };
    }

    const stageIndex = SKILL_STAGE_ORDER.indexOf(stage);
    const certificates = this._progress().certificates ?? [];
    const missingStage = SKILL_STAGE_ORDER.slice(0, stageIndex + 1).find(
      (stageId) => !hasCertificate(certificates, professionId, stageId),
    );

    if (missingStage) {
      const label = CERT_STAGE_LABELS[missingStage] ?? missingStage;
      const isRetro = missingStage !== stage;
      const nextStage = this.nextSkillStage();
      const nextStageLabel = nextStage
        ? (CERT_STAGE_LABELS[nextStage] ?? nextStage)
        : '\u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u044d\u0442\u0430\u043f';
      return {
        ok: false,
        reason: isRetro
          ? `\u0414\u043b\u044f \u043f\u0440\u043e\u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f \u043d\u0443\u0436\u0435\u043d \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442 \u043f\u043e \u044d\u0442\u0430\u043f\u0443: ${label}`
          : `\u0427\u0442\u043e\u0431\u044b \u043f\u0435\u0440\u0435\u0439\u0442\u0438 \u043d\u0430 ${nextStageLabel}, \u043d\u0443\u0436\u0435\u043d \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442: ${label}`,
        requiredCert: {
          professionId,
          stage: missingStage,
        },
      };
    }

    return { ok: true };
  }

  private emitSkillUpgrades(before: Skill[], after: Skill[]): void {
    const beforeById = new Map(before.map((skill) => [skill.id, skill]));
    for (const skill of after) {
      const previousLevel = beforeById.get(skill.id)?.level ?? 0;
      if (skill.level > previousLevel) {
        this.publishEvent(
          createSkillUpgradedEvent(skill.id, previousLevel, skill.level, skill.maxLevel, {
            skillName: skill.name,
            cost: null,
            skillStage: this.resolveSkillStageForSkill(skill.id) ?? undefined,
            profession: this._auth().profession || this._user().role || undefined,
          }),
        );
      }
    }
  }

  private mergeSkillLevels(
    skills: Skill[],
    persisted: Record<string, number>,
    useSkillDefaults: boolean,
  ): Record<string, number> {
    const merged: Record<string, number> = {};

    for (const skill of skills) {
      const level = persisted[skill.id] ?? (useSkillDefaults ? skill.level : 0);
      merged[skill.id] = clampSkillLevel(level, skill.maxLevel);
    }

    return merged;
  }

  private hydrateFromStorage(): void {
    const stored = this.readStorage();
    if (!stored) {
      return;
    }

    const result = this.applyPersistedState(stored.state, { allowLegacy: stored.isLegacy });
    if (!result.ok) {
      this.handleStorageError(new Error(result.error ?? 'Invalid save payload'), 'apply');
      this.clearStorage();
    }
  }

  private resetState(): void {
    this._user.set(createEmptyUser());
    this._auth.set(createEmptyAuth());
    this._progress.set(createEmptyProgress());
    this._company.set(createEmptyCompany());
    this._inventory.set(createEmptyInventory());
    this._availableContracts.set([]);
    this._xp.set(0);
    this._featureFlags.set(DEFAULT_FEATURE_FLAGS);
    this._skills.set([]);
    this._scenarios.set([]);
    this._skillsError.set(null);
    this._scenariosError.set(null);
    this._skillsLoading.set(false);
    this._scenariosLoading.set(false);
    this.load();
  }

  private clearStorage(): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    localStorage.removeItem(AppStore.STORAGE_KEY);
    localStorage.removeItem(AppStore.BACKUP_STORAGE_KEY);
    for (const key of AppStore.LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    for (const key of AppStore.LEGACY_BACKUP_KEYS) {
      localStorage.removeItem(key);
    }
    this._backupAvailable.set(false);
  }

  private persistProgress(): void {
    const payload = this.buildPersistPayload();
    if (this.remoteProgressEnabled) {
      this.scheduleRemotePersist(payload);
      return;
    }
    this.persistToStorage(payload);
  }

  private persistToStorage(payload: PersistedStateLatest): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    try {
      const serialized = JSON.stringify(payload);
      localStorage.setItem(AppStore.STORAGE_KEY, serialized);
      localStorage.setItem(AppStore.BACKUP_STORAGE_KEY, serialized);
      this._backupAvailable.set(true);
    } catch {
      void 0;
    }
  }

  private buildPersistPayload(): PersistedStateLatest {
    return {
      version: AppStore.STORAGE_VERSION,
      user: this._user(),
      progress: this._progress(),
      company: this._company(),
      inventory: this._inventory(),
      featureFlags: this._featureFlags(),
      auth: this._auth(),
      xp: this._xp(),
    };
  }

  private buildEmptyPersistPayload(): PersistedStateLatest {
    return {
      version: AppStore.STORAGE_VERSION,
      user: createEmptyUser(),
      progress: createEmptyProgress(),
      company: createEmptyCompany(),
      inventory: createEmptyInventory(),
      featureFlags: DEFAULT_FEATURE_FLAGS,
      auth: createEmptyAuth(),
      xp: 0,
    };
  }

  private readStorage(): StorageReadResult | null {
    if (!this.isStorageAvailable()) {
      return null;
    }

    const rawEntry = this.readRawStorage();
    if (!rawEntry) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawEntry.raw);
    } catch (error) {
      this.handleStorageError(error, 'parse');
      this.removeStorageKey(rawEntry.key);
      return null;
    }

    const rawVersion = this.resolvePersistedVersion(parsed);
    const migrated = migratePersistedState(parsed);
    if (!migrated) {
      this.handleStorageError(new Error('Unsupported save version'), 'migrate');
      this.removeStorageKey(rawEntry.key);
      return null;
    }

    const isLegacy =
      rawVersion !== AppStore.STORAGE_VERSION || rawEntry.key !== AppStore.STORAGE_KEY;
    if (rawEntry.key !== AppStore.STORAGE_KEY) {
      this.persistMigratedState(rawEntry.key, migrated);
    }

    return { state: migrated, isLegacy };
  }

  private readRawStorage(): { key: string; raw: string } | null {
    const current = localStorage.getItem(AppStore.STORAGE_KEY);
    if (current) {
      return { key: AppStore.STORAGE_KEY, raw: current };
    }

    for (const key of AppStore.LEGACY_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        return { key, raw };
      }
    }

    return null;
  }

  private readRawBackup(): { key: string; raw: string } | null {
    const current = localStorage.getItem(AppStore.BACKUP_STORAGE_KEY);
    if (current) {
      return { key: AppStore.BACKUP_STORAGE_KEY, raw: current };
    }

    for (const key of AppStore.LEGACY_BACKUP_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        return { key, raw };
      }
    }

    return null;
  }

  private syncBackupAvailability(): void {
    if (!this.isStorageAvailable()) {
      this._backupAvailable.set(false);
      return;
    }
    this._backupAvailable.set(Boolean(this.readRawBackup()));
  }

  private persistMigratedState(fromKey: string, state: PersistedStateLatest): void {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(AppStore.STORAGE_KEY, serialized);
      localStorage.setItem(AppStore.BACKUP_STORAGE_KEY, serialized);
      this._backupAvailable.set(true);
      if (fromKey !== AppStore.STORAGE_KEY) {
        localStorage.removeItem(fromKey);
      }
    } catch {
      void 0;
    }
  }

  private removeStorageKey(key: string): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    localStorage.removeItem(key);
  }

  private handleStorageError(error: unknown, context: string): void {
    this.errorLogStore.capture(error, `persist:${context}`, false);
    this.notificationsStore.error(
      '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435. \u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d \u0441\u0431\u0440\u043e\u0441 \u0438 \u0441\u043e\u0437\u0434\u0430\u043d\u043e \u043d\u043e\u0432\u043e\u0435.',
    );
  }

  private async hydrateFromRemote(): Promise<void> {
    if (typeof fetch !== 'function') {
      return;
    }
    try {
      const response = await fetch('/api/progress', { credentials: 'include' });
      if (response.status === 401) {
        return;
      }
      if (!response.ok) {
        return;
      }
      const data = await response.json().catch(() => null);
      this.remoteProgressEnabled = true;
      const stateJson = typeof data?.stateJson === 'string' ? data.stateJson : null;
      if (!stateJson) {
        this.applyPersistedState(this.buildEmptyPersistPayload(), { allowLegacy: false });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(stateJson);
      } catch (error) {
        this.errorLogStore.capture(error, 'persist:remote-parse', false);
        return;
      }
      const migrated = migratePersistedState(parsed);
      if (!migrated) {
        return;
      }
      const result = this.applyPersistedState(migrated, { allowLegacy: false });
      if (!result.ok) {
        this.errorLogStore.capture(
          new Error(result.error ?? 'Invalid remote payload'),
          'persist:remote-apply',
          false,
        );
      }
    } catch (error) {
      this.errorLogStore.capture(error, 'persist:remote-load', false);
    }
  }

  private scheduleRemotePersist(payload: PersistedStateLatest): void {
    this.remotePendingPayload = payload;
    if (this.remoteSaveTimer !== null) {
      return;
    }
    this.remoteSaveTimer = window.setTimeout(() => {
      this.remoteSaveTimer = null;
      void this.flushRemotePersist();
    }, 1500);
  }

  private async flushRemotePersist(): Promise<void> {
    if (this.remoteSaveInFlight) {
      return;
    }
    const payload = this.remotePendingPayload;
    if (!payload) {
      return;
    }
    this.remotePendingPayload = null;
    let serialized = '';
    try {
      serialized = JSON.stringify(payload);
    } catch {
      return;
    }
    if (serialized === this.remoteLastSerialized) {
      return;
    }
    if (serialized.length > 1_000_000) {
      return;
    }
    this.remoteSaveInFlight = true;
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stateJson: serialized }),
      });
      if (response.status === 401) {
        this.remoteProgressEnabled = false;
        this.persistToStorage(payload);
        return;
      }
      if (response.ok) {
        this.remoteLastSerialized = serialized;
      }
    } catch (error) {
      this.errorLogStore.capture(error, 'persist:remote-save', false);
    } finally {
      this.remoteSaveInFlight = false;
    }
  }

  private mergeProgressDefaults(progress: Partial<Progress>): Progress {
    const startConfig = BALANCE.newGame ?? { startCoins: 0, startReputation: 0, startTechDebt: 0 };
    return {
      skillLevels: progress.skillLevels ?? {},
      decisionHistory: progress.decisionHistory ?? [],
      examHistory: progress.examHistory ?? [],
      activeExamRun: progress.activeExamRun ?? null,
      certificates: progress.certificates ?? [],
      activeContracts: this.normalizeActiveContracts(progress.activeContracts),
      completedContractsHistory: this.normalizeCompletedContractsHistory(
        progress.completedContractsHistory,
      ),
      sessionQuests: this.normalizeSessionQuests(progress.sessionQuests),
      sessionQuestSessionId: this.normalizeSessionQuestSessionId(progress.sessionQuestSessionId),
      candidatesPool: this.normalizeCandidatesPool(progress.candidatesPool),
      candidatesRefreshIndex: this.normalizeCandidatesRefreshIndex(progress.candidatesRefreshIndex),
      companyTickIndex: this.normalizeCompanyTickIndex(progress.companyTickIndex),
      meta: this.normalizeProgressMeta(progress.meta),
      difficulty: this.normalizeDifficulty(progress.difficulty),
      cosmetics: this.normalizeCosmeticsState(progress.cosmetics),
      achievements: this.normalizeAchievementsState(progress.achievements),
      comboStreak: this.normalizeComboStreakState(progress.comboStreak),
      streak: this.normalizeStreakState(progress.streak),
      finale: this.normalizeFinaleState(progress.finale),
      ending: this.normalizeEndingState(progress.ending),
      specializationId: this.normalizeSpecializationId(progress.specializationId ?? null),
      reputation: progress.reputation ?? startConfig.startReputation ?? 0,
      techDebt: progress.techDebt ?? startConfig.startTechDebt ?? 0,
      coins: this.normalizeCoins(progress.coins ?? startConfig.startCoins ?? 0),
      scenarioOverrides: progress.scenarioOverrides ?? {},
      spentXpOnSkills: progress.spentXpOnSkills ?? 0,
      careerStage: this.normalizeCareerStage(
        progress.careerStage ?? (progress as Progress & { skillStage?: unknown }).skillStage,
      ),
    };
  }

  private mergeCompanyDefaults(company: Partial<Company>): Company {
    return {
      cash: this.normalizeCash(company.cash ?? 0),
      unlocked: typeof company.unlocked === 'boolean' ? company.unlocked : false,
      level: this.normalizeCompanyLevel(company.level),
      onboardingSeen: typeof company.onboardingSeen === 'boolean' ? company.onboardingSeen : false,
      employees: this.normalizeEmployees(company.employees),
      ledger: this.normalizeCompanyLedger(company.ledger),
      activeIncident: this.normalizeActiveIncident(company.activeIncident),
      incidentsHistory: this.normalizeIncidentsHistory(company.incidentsHistory),
    };
  }

  private mergeInventoryDefaults(inventory: Partial<Inventory>): Inventory {
    return {
      ownedItemIds: normalizeOwnedItemIds(inventory.ownedItemIds),
    };
  }

  private isStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private resolvePersistedVersion(value: unknown): number | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const version = value['version'];
    return typeof version === 'number' && Number.isFinite(version) ? version : null;
  }

  private parseUser(value: unknown): User | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const role = value['role'];
    const goals = value['goals'];
    const startDate = value['startDate'];
    const isProfileComplete = value['isProfileComplete'];

    if (typeof role !== 'string' || typeof startDate !== 'string') {
      return null;
    }
    if (!Array.isArray(goals) || !goals.every((goal) => typeof goal === 'string')) {
      return null;
    }
    if (typeof isProfileComplete !== 'boolean') {
      return null;
    }

    return {
      role,
      goals,
      startDate,
      isProfileComplete,
    };
  }

  private parseProgress(value: unknown): Progress | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const skillLevels = this.parseNumberRecord(value['skillLevels']);
    const decisionHistory = this.parseDecisionHistory(value['decisionHistory']);
    const examHistory = this.parseExamHistory(value['examHistory']) ?? [];
    const activeExamRun = this.parseExamRun(value['activeExamRun']);
    const certificates = this.parseCertificates(value['certificates']) ?? [];
    const activeContracts = this.normalizeActiveContracts(value['activeContracts']);
    const completedContractsHistory = this.normalizeCompletedContractsHistory(
      value['completedContractsHistory'],
    );
    const sessionQuests = this.normalizeSessionQuests(value['sessionQuests']);
    const sessionQuestSessionId = this.normalizeSessionQuestSessionId(
      value['sessionQuestSessionId'],
    );
    const candidatesPool = this.normalizeCandidatesPool(value['candidatesPool']);
    const candidatesRefreshIndex = this.normalizeCandidatesRefreshIndex(
      value['candidatesRefreshIndex'],
    );
    const companyTickIndex = value['companyTickIndex'];
    const meta = this.normalizeProgressMeta(value['meta']);
    const difficulty = this.normalizeDifficulty(value['difficulty']);
    const cosmetics = this.normalizeCosmeticsState(value['cosmetics']);
    const achievements = this.normalizeAchievementsState(value['achievements']);
    const comboStreak = this.normalizeComboStreakState(value['comboStreak']);
    const streak = this.normalizeStreakState(value['streak']);
    const finale = this.normalizeFinaleState(value['finale']);
    const ending = this.normalizeEndingState(value['ending']);
    const specializationId = value['specializationId'];
    const reputation = value['reputation'];
    const techDebt = value['techDebt'];
    const coins = value['coins'];
    const scenarioOverrides = this.parseBooleanRecord(value['scenarioOverrides']);
    const spentXpOnSkills = value['spentXpOnSkills'];
    const careerStage = value['careerStage'];
    const legacySkillStage = value['skillStage'];

    if (!skillLevels || !decisionHistory) {
      return null;
    }
    if (typeof reputation !== 'number' || typeof techDebt !== 'number') {
      return null;
    }
    if (coins !== undefined && typeof coins !== 'number') {
      return null;
    }
    if (companyTickIndex !== undefined && typeof companyTickIndex !== 'number') {
      return null;
    }
    if (spentXpOnSkills !== undefined && typeof spentXpOnSkills !== 'number') {
      return null;
    }

    return {
      skillLevels,
      decisionHistory,
      examHistory,
      activeExamRun,
      certificates,
      activeContracts,
      completedContractsHistory,
      sessionQuests,
      sessionQuestSessionId,
      candidatesPool,
      candidatesRefreshIndex,
      companyTickIndex: this.normalizeCompanyTickIndex(companyTickIndex),
      meta,
      difficulty,
      cosmetics,
      achievements,
      comboStreak,
      streak,
      finale,
      ending,
      specializationId: this.normalizeSpecializationId(specializationId ?? null),
      reputation,
      techDebt,
      coins: this.normalizeCoins(typeof coins === 'number' ? coins : 0),
      scenarioOverrides: scenarioOverrides ?? {},
      spentXpOnSkills: typeof spentXpOnSkills === 'number' ? this.normalizeXp(spentXpOnSkills) : 0,
      careerStage: this.normalizeCareerStage(
        typeof careerStage === 'string' ? careerStage : legacySkillStage,
      ),
    };
  }

  private parseCompany(value: unknown): Company | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const cash = value['cash'];
    const unlocked = value['unlocked'];
    const level = value['level'];
    const onboardingSeen = value['onboardingSeen'];
    const employees = this.normalizeEmployees(value['employees']);
    const ledger = this.normalizeCompanyLedger(value['ledger']);
    const activeIncident = this.normalizeActiveIncident(value['activeIncident']);
    const incidentsHistory = this.normalizeIncidentsHistory(value['incidentsHistory']);
    if (cash !== undefined && typeof cash !== 'number') {
      return null;
    }
    return {
      cash: this.normalizeCash(typeof cash === 'number' ? cash : 0),
      unlocked: typeof unlocked === 'boolean' ? unlocked : false,
      level: this.normalizeCompanyLevel(level),
      onboardingSeen: typeof onboardingSeen === 'boolean' ? onboardingSeen : false,
      employees,
      ledger,
      activeIncident,
      incidentsHistory,
    };
  }

  private parseInventory(value: unknown): Inventory | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const ownedItemIds = value['ownedItemIds'];
    if (ownedItemIds !== undefined && !Array.isArray(ownedItemIds)) {
      return null;
    }
    return {
      ownedItemIds: normalizeOwnedItemIds(ownedItemIds),
    };
  }

  private parseFeatureFlags(value: unknown): FeatureFlags {
    if (!this.isRecord(value)) {
      return DEFAULT_FEATURE_FLAGS;
    }
    const flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
    for (const key of Object.keys(flags) as FeatureFlagKey[]) {
      if (typeof value[key] === 'boolean') {
        flags[key] = value[key] as boolean;
      }
    }
    return flags;
  }

  private parseAuth(value: unknown): AuthState | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const login = value['login'];
    const profession = value['profession'];
    const isRegistered = value['isRegistered'];

    if (typeof login !== 'string' || typeof profession !== 'string') {
      return null;
    }
    if (typeof isRegistered !== 'boolean') {
      return null;
    }

    return {
      login,
      profession,
      isRegistered,
    };
  }

  private parseXp(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }
    return this.normalizeXp(value);
  }

  private parseDecisionHistory(value: unknown): Progress['decisionHistory'] | null {
    if (!Array.isArray(value)) {
      return null;
    }
    const parsed = value.map((entry) => this.parseDecisionHistoryEntry(entry));
    if (parsed.some((entry) => entry === null)) {
      return null;
    }
    return parsed as Progress['decisionHistory'];
  }

  private parseDecisionHistoryEntry(value: unknown): Progress['decisionHistory'][number] | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const scenarioId = value['scenarioId'];
    const decisionId = value['decisionId'];
    const decidedAt = value['decidedAt'];
    if (typeof scenarioId !== 'string' || typeof decisionId !== 'string') {
      return null;
    }
    if (typeof decidedAt !== 'string') {
      return null;
    }

    const snapshot = this.parseSnapshot(value['snapshot']);
    if (value['snapshot'] !== undefined && snapshot === null) {
      return null;
    }

    return {
      scenarioId,
      decisionId,
      decidedAt,
      snapshot: snapshot ?? undefined,
    };
  }

  private parseExamHistory(value: unknown): Progress['examHistory'] | null {
    if (value === undefined) {
      return null;
    }
    if (!Array.isArray(value)) {
      return null;
    }
    const parsed = value
      .map((entry) => this.parseExamAttempt(entry))
      .filter((entry): entry is ExamAttempt => Boolean(entry));
    return parsed;
  }

  private parseCertificates(value: unknown): Progress['certificates'] | null {
    if (value === undefined) {
      return null;
    }
    if (!Array.isArray(value)) {
      return null;
    }
    const parsed = value
      .map((entry) => this.parseCertificate(entry))
      .filter((entry): entry is Certificate => Boolean(entry));
    return parsed;
  }

  private parseCertificate(value: unknown): Certificate | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const id = value['id'];
    const professionId = value['professionId'];
    const stage = value['stage'];
    const examId = value['examId'];
    const issuedAt = value['issuedAt'];
    const score = value['score'];

    if (
      typeof id !== 'string' ||
      typeof professionId !== 'string' ||
      typeof stage !== 'string' ||
      typeof examId !== 'string' ||
      typeof issuedAt !== 'string'
    ) {
      return null;
    }
    if (!this.isValidStage(stage)) {
      return null;
    }

    return {
      id,
      professionId,
      stage,
      examId,
      issuedAt,
      score: this.normalizeScore(typeof score === 'number' ? score : 0),
    };
  }

  private parseExamAttempt(value: unknown): ExamAttempt | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const attemptId = value['attemptId'];
    const examId = value['examId'];
    const startedAt = value['startedAt'];
    if (
      typeof attemptId !== 'string' ||
      typeof examId !== 'string' ||
      typeof startedAt !== 'string'
    ) {
      return null;
    }
    const finishedAt = value['finishedAt'];
    const score = value['score'];
    const passed = value['passed'];
    const answers = this.parseExamAnswers(value['answers']);

    return {
      attemptId,
      examId,
      startedAt,
      finishedAt: typeof finishedAt === 'string' ? finishedAt : undefined,
      answers,
      score: typeof score === 'number' && Number.isFinite(score) ? score : undefined,
      passed: typeof passed === 'boolean' ? passed : undefined,
    };
  }

  private parseExamRun(value: unknown): ExamRun | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const examId = value['examId'];
    const session = this.parseExamSession(value['session']);
    const startedAt = value['startedAt'];
    const currentIndex = value['currentIndex'];
    const attemptIndex = value['attemptIndex'];

    if (
      typeof examId !== 'string' ||
      !session ||
      typeof startedAt !== 'string' ||
      typeof currentIndex !== 'number' ||
      typeof attemptIndex !== 'number'
    ) {
      return null;
    }

    return {
      examId,
      session,
      startedAt,
      currentIndex: Math.max(0, Math.floor(currentIndex)),
      answers: this.parseExamAnswers(value['answers']),
      attemptIndex: Math.max(0, Math.floor(attemptIndex)),
    };
  }

  private parseExamSession(value: unknown): ExamSession | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const examId = value['examId'];
    const questionIds = value['questionIds'];
    const seed = value['seed'];
    if (typeof examId !== 'string' || typeof seed !== 'string' || !Array.isArray(questionIds)) {
      return null;
    }
    if (!questionIds.every((id) => typeof id === 'string')) {
      return null;
    }
    return {
      examId,
      questionIds,
      seed,
    };
  }

  private parseExamAnswers(value: unknown): Record<string, ExamAnswer> {
    if (!this.isRecord(value)) {
      return {};
    }
    const answers: Record<string, ExamAnswer> = {};
    for (const [key, entry] of Object.entries(value)) {
      const parsed = this.parseExamAnswer(entry);
      if (parsed) {
        answers[key] = parsed;
      }
    }
    return answers;
  }

  private parseExamAnswer(value: unknown): ExamAnswer | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const type = value['type'];
    if (type === 'singleChoice' || type === 'caseDecision') {
      const selectedOptionId = value['selectedOptionId'];
      if (typeof selectedOptionId !== 'string') {
        return null;
      }
      return { type, selectedOptionId } as ExamAnswer;
    }
    if (type === 'multiChoice') {
      const selectedOptionIds = value['selectedOptionIds'];
      if (
        !Array.isArray(selectedOptionIds) ||
        !selectedOptionIds.every((id) => typeof id === 'string')
      ) {
        return null;
      }
      return { type, selectedOptionIds } as ExamAnswer;
    }
    if (type === 'ordering') {
      const orderedOptionIds = value['orderedOptionIds'];
      if (
        !Array.isArray(orderedOptionIds) ||
        !orderedOptionIds.every((id) => typeof id === 'string')
      ) {
        return null;
      }
      return { type, orderedOptionIds } as ExamAnswer;
    }
    return null;
  }

  private parseSnapshot(value: unknown): ProgressSnapshot | null {
    if (value === undefined) {
      return null;
    }
    if (!this.isRecord(value)) {
      return null;
    }
    const skillLevels = this.parseNumberRecord(value['skillLevels']);
    const reputation = value['reputation'];
    const techDebt = value['techDebt'];
    const coins = value['coins'];
    const scenarioOverrides = this.parseBooleanRecord(value['scenarioOverrides']);
    const spentXpOnSkills = value['spentXpOnSkills'];
    if (!skillLevels) {
      return null;
    }
    if (typeof reputation !== 'number' || typeof techDebt !== 'number') {
      return null;
    }
    if (coins !== undefined && typeof coins !== 'number') {
      return null;
    }
    if (spentXpOnSkills !== undefined && typeof spentXpOnSkills !== 'number') {
      return null;
    }
    return {
      skillLevels,
      reputation,
      techDebt,
      coins: this.normalizeCoins(typeof coins === 'number' ? coins : 0),
      scenarioOverrides: scenarioOverrides ?? {},
      spentXpOnSkills: typeof spentXpOnSkills === 'number' ? this.normalizeXp(spentXpOnSkills) : 0,
    };
  }

  private resolveObjectiveTypeForEvent(
    event: ContractProgressEvent,
  ): Contract['objectives'][number]['type'] | null {
    switch (event.type) {
      case 'ScenarioCompleted':
        return 'scenario';
      case 'ExamPassed':
        return 'exam';
      case 'PurchaseMade':
        return 'purchase';
      default:
        return null;
    }
  }

  private resolveQuestObjectiveType(event: QuestProgressEvent): Quest['objective']['type'] | null {
    switch (event.type) {
      case 'ScenarioCompleted':
        return 'scenario';
      case 'ExamPassed':
        return 'exam';
      case 'PurchaseMade':
        return 'purchase';
      default:
        return null;
    }
  }

  private createEmptyRewardSummary(): RewardSummary {
    return {
      coins: 0,
      cash: 0,
      reputationDelta: 0,
      techDebtDelta: 0,
    };
  }

  private sumContractRewards(contracts: Contract[]): RewardSummary {
    const summary = this.createEmptyRewardSummary();
    for (const contract of contracts) {
      const reward = contract.reward ?? { coins: 0 };
      if (Number.isFinite(reward.coins)) {
        summary.coins += reward.coins;
      }
      if (Number.isFinite(reward.cash)) {
        summary.cash += reward.cash as number;
      }
      if (Number.isFinite(reward.reputationDelta)) {
        summary.reputationDelta += reward.reputationDelta as number;
      }
      if (Number.isFinite(reward.techDebtDelta)) {
        summary.techDebtDelta += reward.techDebtDelta as number;
      }
    }
    return summary;
  }

  private formatRewardSummary(summary: RewardSummary): string {
    const coins = this.normalizeCoins(summary.coins);
    const cash = this.normalizeCash(summary.cash);
    const coinsLabel = `+${this.formatNumber(coins)} \u043c\u043e\u043d\u0435\u0442`;
    const cashLabel = cash > 0 ? ` (+${this.formatNumber(cash)} cash)` : '';
    return `${coinsLabel}${cashLabel}`;
  }

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return this.numberFormatter.format(Math.max(0, Math.floor(value)));
  }

  private formatSignedValue(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    const rounded = Math.round(value);
    const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
    return `${sign}${this.formatNumber(Math.abs(rounded))}`;
  }

  private isIncidentDeferredDecision(decision: IncidentDecision): boolean {
    const label = `${decision.title} ${decision.description}`.toLowerCase();
    return label.includes('\u043c\u043e\u043d\u0435\u0442');
  }

  private updateDailyStreak(): void {
    const progress = this._progress();
    const streak = progress.streak ?? { lastActiveDate: null, current: 0, best: 0 };
    const today = new Date().toISOString().slice(0, 10);
    if (streak.lastActiveDate === today) {
      return;
    }
    const yesterday = this.resolveYesterdayDate(today);
    const nextCurrent = streak.lastActiveDate === yesterday ? streak.current + 1 : 1;
    const nextBest = Math.max(streak.best, nextCurrent);

    this._progress.update((current) => ({
      ...current,
      streak: {
        lastActiveDate: today,
        current: nextCurrent,
        best: nextBest,
      },
    }));

    this.grantStreakBadges(nextCurrent);
  }

  private resolveYesterdayDate(today: string): string {
    const parsed = new Date(`${today}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    }
    parsed.setUTCDate(parsed.getUTCDate() - 1);
    return parsed.toISOString().slice(0, 10);
  }

  private grantStreakBadges(current: number): void {
    const thresholds = Array.isArray(BALANCE.streaks) ? BALANCE.streaks : [3, 7, 14];
    const map: Record<number, string> = {
      3: 'badge_streak_3',
      7: 'badge_streak_7',
      14: 'badge_streak_14',
    };
    for (const threshold of thresholds) {
      const badgeId = map[threshold];
      if (badgeId && current >= threshold) {
        this.grantBadge(badgeId, 'streak');
      }
    }
  }

  private grantEndingBadge(endingId: EndingResult['endingId']): void {
    const map: Record<EndingResult['endingId'], string> = {
      ipo: 'badge_ending_ipo',
      acq: 'badge_ending_acq',
      oss: 'badge_ending_oss',
      scandal: 'badge_ending_scandal',
      bankrupt: 'badge_ending_bankrupt',
    };
    const badgeId = map[endingId];
    if (badgeId) {
      this.grantBadge(badgeId, 'ending');
    }
  }

  private grantQuestBadge(badgeId: string): void {
    const normalized = badgeId?.trim();
    if (!normalized) {
      return;
    }
    this.grantBadge(normalized, 'quest');
    this.achievementsStore.grantAchievement(normalized);
  }

  private publishEvent(event: DomainEvent): void {
    this.eventBus.publish(event);
    this.applyComboStreakForEvent(event);
    this.applyAchievementRulesForEvent(event);
  }

  private applyComboStreakForEvent(event: DomainEvent): void {
    this._progress.update((current) => {
      const currentStreak = current.comboStreak ?? createEmptyStreakState();
      const nextStreak = applyComboStreakEvent(currentStreak, event);
      if (
        nextStreak.count === currentStreak.count &&
        nextStreak.multiplier === currentStreak.multiplier &&
        nextStreak.lastUpdatedAt === currentStreak.lastUpdatedAt
      ) {
        return current;
      }
      return {
        ...current,
        comboStreak: nextStreak,
      };
    });
  }

  private applyAchievementRulesForEvent(event: DomainEvent): void {
    const unlocks = applyAchievementRules(this.buildAchievementRuleState(), event);
    if (unlocks.length === 0) {
      return;
    }

    let didUpdate = false;
    this._progress.update((current) => {
      const currentAchievements = current.achievements ?? createEmptyAchievementsState();
      const unlocked = { ...currentAchievements.unlocked };

      for (const entry of unlocks) {
        if (unlocked[entry.id]) {
          continue;
        }
        unlocked[entry.id] = entry;
        didUpdate = true;
      }

      if (!didUpdate) {
        return current;
      }

      return {
        ...current,
        achievements: {
          ...currentAchievements,
          unlocked,
        },
      };
    });

    if (didUpdate) {
      this.notificationsStore.success(
        '\u0414\u043e\u0441\u0442\u0438\u0436\u0435\u043d\u0438\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u043e',
      );
    }
  }

  private buildAchievementRuleState(): AchievementRuleState {
    const progress = this._progress();
    const inventory = this._inventory();
    const company = this._company();

    return {
      unlocked: progress.achievements?.unlocked ?? {},
      inventoryOwnedCount: inventory.ownedItemIds.length,
      employeesCount: company.employees.length,
      techDebt: progress.techDebt,
      streakCurrent: progress.streak?.current ?? 0,
    };
  }

  private normalizeActiveContracts(value: unknown): Contract[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((entry): entry is Contract => this.isValidContract(entry));
  }

  private normalizeCompletedContractsHistory(value: unknown): CompletedContractEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((entry): entry is CompletedContractEntry =>
      this.isValidCompletedContractEntry(entry),
    );
  }

  private normalizeSessionQuests(value: unknown): Quest[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((entry): entry is Quest => this.isValidQuest(entry));
  }

  private normalizeSessionQuestSessionId(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeEmployees(value: unknown): Employee[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized: Employee[] = [];
    for (const entry of value) {
      const employee = this.normalizeEmployee(entry);
      if (employee) {
        normalized.push(employee);
      }
    }
    return normalized;
  }

  private normalizeCompanyLedger(value: unknown): CompanyLedgerEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized: CompanyLedgerEntry[] = [];
    for (const entry of value) {
      if (this.isValidCompanyLedgerEntry(entry)) {
        normalized.push(this.sanitizeLedgerEntry(entry));
      }
    }
    return normalized.slice(0, 50);
  }

  private normalizeActiveIncident(value: unknown): ActiveIncident | null {
    if (!this.isRecord(value)) {
      return null;
    }
    if (!this.isValidActiveIncident(value)) {
      return null;
    }
    const decisions = this.normalizeIncidentDecisions(value['decisions']);
    if (decisions.length !== 3) {
      return null;
    }
    return {
      instanceId: value['instanceId'] as string,
      templateId: value['templateId'] as string,
      title: value['title'] as string,
      description: value['description'] as string,
      severity: value['severity'] as IncidentSeverity,
      decisions,
      createdAtIso: value['createdAtIso'] as string,
      source: value['source'] as 'tick',
      seed: value['seed'] as string,
      resolvedAtIso:
        typeof value['resolvedAtIso'] === 'string' ? (value['resolvedAtIso'] as string) : undefined,
      chosenDecisionId: this.isIncidentDecisionId(value['chosenDecisionId'])
        ? (value['chosenDecisionId'] as IncidentDecisionId)
        : undefined,
    };
  }

  private normalizeIncidentsHistory(value: unknown): IncidentHistoryEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized: IncidentHistoryEntry[] = [];
    for (const entry of value) {
      if (this.isValidIncidentHistoryEntry(entry)) {
        normalized.push({
          instanceId: entry['instanceId'] as string,
          templateId: entry['templateId'] as string,
          chosenDecisionId: entry['chosenDecisionId'] as IncidentDecisionId,
          resolvedAtIso: entry['resolvedAtIso'] as string,
          effects: this.normalizeIncidentEffects(entry['effects']),
        });
      }
    }
    return normalized.slice(0, 20);
  }

  private normalizeIncidentDecisions(value: unknown): IncidentDecision[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized: IncidentDecision[] = [];
    for (const entry of value) {
      const decision = this.normalizeIncidentDecision(entry);
      if (decision) {
        normalized.push(decision);
      }
    }
    return normalized;
  }

  private normalizeIncidentDecision(value: unknown): IncidentDecision | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const id = value['id'];
    const title = value['title'];
    const description = value['description'];
    const effects = value['effects'];
    if (!this.isIncidentDecisionId(id)) {
      return null;
    }
    if (typeof title !== 'string' || typeof description !== 'string') {
      return null;
    }
    if (!this.isRecord(effects)) {
      return null;
    }
    if (
      typeof effects['cashDelta'] !== 'number' ||
      typeof effects['reputationDelta'] !== 'number'
    ) {
      return null;
    }
    return {
      id,
      title,
      description,
      effects: this.normalizeIncidentEffects(effects),
    };
  }

  private normalizeIncidentEffects(value: unknown): IncidentDecision['effects'] {
    if (!this.isRecord(value)) {
      return {
        cashDelta: 0,
        reputationDelta: 0,
      };
    }
    return {
      cashDelta: this.normalizeLedgerNumber(value['cashDelta'] as number),
      reputationDelta: this.normalizeLedgerNumber(value['reputationDelta'] as number),
      techDebtDelta:
        typeof value['techDebtDelta'] === 'number' && Number.isFinite(value['techDebtDelta'])
          ? value['techDebtDelta']
          : undefined,
      moraleDelta:
        typeof value['moraleDelta'] === 'number' && Number.isFinite(value['moraleDelta'])
          ? value['moraleDelta']
          : undefined,
    };
  }

  private sanitizeLedgerEntry(entry: CompanyLedgerEntry): CompanyLedgerEntry {
    const lines = this.normalizeLedgerLines(entry.lines);
    return {
      ...entry,
      delta: {
        incomeCash: this.normalizeLedgerNumber(entry.delta.incomeCash),
        salariesCash: this.normalizeLedgerNumber(entry.delta.salariesCash),
        incidentCash:
          typeof entry.delta.incidentCash === 'number' && Number.isFinite(entry.delta.incidentCash)
            ? entry.delta.incidentCash
            : undefined,
        netCash: this.normalizeLedgerNumber(entry.delta.netCash),
        reputationDelta: this.normalizeLedgerNumber(entry.delta.reputationDelta),
        moraleDelta:
          typeof entry.delta.moraleDelta === 'number' && Number.isFinite(entry.delta.moraleDelta)
            ? entry.delta.moraleDelta
            : undefined,
      },
      balanceAfter: {
        cash: this.normalizeLedgerNumber(entry.balanceAfter.cash),
        reputation:
          typeof entry.balanceAfter.reputation === 'number' &&
          Number.isFinite(entry.balanceAfter.reputation)
            ? entry.balanceAfter.reputation
            : undefined,
        avgMorale:
          typeof entry.balanceAfter.avgMorale === 'number' &&
          Number.isFinite(entry.balanceAfter.avgMorale)
            ? entry.balanceAfter.avgMorale
            : undefined,
      },
      lines: lines && lines.length > 0 ? lines : undefined,
    };
  }

  private normalizeLedgerLines(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const maxLines = 6;
    const maxLength = 120;
    const cleaned = value
      .filter((line): line is string => typeof line === 'string')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, maxLines)
      .map((line) => (line.length > maxLength ? `${line.slice(0, maxLength - 3)}...` : line));
    return cleaned.length > 0 ? cleaned : undefined;
  }

  private normalizeLedgerNumber(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.round(value);
  }

  private appendCompanyLedger(
    current: readonly CompanyLedgerEntry[],
    entry: CompanyLedgerEntry,
  ): CompanyLedgerEntry[] {
    const maxEntries = 50;
    const sanitized = this.sanitizeLedgerEntry(entry);
    const merged = [sanitized, ...current];
    return merged.slice(0, maxEntries);
  }

  private normalizeCandidatesPool(value: unknown): Candidate[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((entry): entry is Candidate => this.isValidCandidate(entry));
  }

  private normalizeCandidatesRefreshIndex(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  private normalizeCompanyTickIndex(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  private normalizeProgressMeta(value: unknown): Progress['meta'] {
    if (!this.isRecord(value)) {
      return { isNewGamePlus: false, ngPlusCount: 0, onboardingCompleted: false };
    }
    const isNewGamePlus =
      typeof value['isNewGamePlus'] === 'boolean' ? value['isNewGamePlus'] : false;
    const ngPlusCount =
      typeof value['ngPlusCount'] === 'number' && Number.isFinite(value['ngPlusCount'])
        ? Math.max(0, Math.floor(value['ngPlusCount']))
        : 0;
    const onboardingCompleted =
      typeof value['onboardingCompleted'] === 'boolean' ? value['onboardingCompleted'] : false;
    return { isNewGamePlus, ngPlusCount, onboardingCompleted };
  }

  private normalizeDifficulty(value: unknown): Progress['difficulty'] {
    if (!this.isRecord(value)) {
      return {
        multiplier: 1,
        ...createDefaultDifficultyState(),
      };
    }
    const raw = value['multiplier'];
    const multiplier =
      typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0.5, Math.min(3, raw)) : 1;
    const ratingRaw = value['rating'];
    const rating = clampRating(typeof ratingRaw === 'number' ? ratingRaw : DEFAULT_RATING);
    const successStreak =
      typeof value['successStreak'] === 'number' && Number.isFinite(value['successStreak'])
        ? Math.max(0, Math.floor(value['successStreak']))
        : 0;
    const failStreak =
      typeof value['failStreak'] === 'number' && Number.isFinite(value['failStreak'])
        ? Math.max(0, Math.floor(value['failStreak']))
        : 0;
    const lastResult =
      value['lastResult'] === 'pass' || value['lastResult'] === 'fail'
        ? (value['lastResult'] as 'pass' | 'fail')
        : undefined;
    return {
      multiplier,
      rating,
      successStreak,
      failStreak,
      lastResult,
    };
  }

  private normalizeCosmeticsState(value: unknown): Progress['cosmetics'] {
    if (!this.isRecord(value)) {
      return { earnedBadges: [] };
    }
    const earnedBadges = this.normalizeEarnedBadges(value['earnedBadges']);
    return { earnedBadges };
  }

  private normalizeAchievementsState(value: unknown): Progress['achievements'] {
    if (!this.isRecord(value)) {
      return createEmptyAchievementsState();
    }
    const unlockedRaw = value['unlocked'];
    if (!this.isRecord(unlockedRaw)) {
      return createEmptyAchievementsState();
    }
    const unlocked: Progress['achievements']['unlocked'] = {};
    for (const [id, entry] of Object.entries(unlockedRaw)) {
      if (!this.isRecord(entry)) {
        continue;
      }
      const unlockedAt = typeof entry['unlockedAt'] === 'string' ? entry['unlockedAt'] : null;
      if (!unlockedAt) {
        continue;
      }
      const meta = this.isRecord(entry['meta'])
        ? (entry['meta'] as Record<string, unknown>)
        : undefined;
      unlocked[id] = {
        id,
        unlockedAt,
        meta,
      };
    }
    return { unlocked };
  }

  private normalizeEarnedBadges(value: unknown): EarnedBadge[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized: EarnedBadge[] = [];
    const seen = new Set<string>();
    for (const entry of value) {
      if (!this.isRecord(entry)) {
        continue;
      }
      const id = entry['id'];
      const earnedAtIso = entry['earnedAtIso'];
      const source = entry['source'];
      if (typeof id !== 'string' || typeof earnedAtIso !== 'string') {
        continue;
      }
      if (!this.isEarnedBadgeSource(source)) {
        continue;
      }
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      normalized.push({
        id,
        earnedAtIso,
        source,
      });
    }
    return normalized.slice(0, 200);
  }

  private normalizeStreakState(value: unknown): Progress['streak'] {
    if (!this.isRecord(value)) {
      return { lastActiveDate: null, current: 0, best: 0 };
    }
    const lastActiveDate =
      typeof value['lastActiveDate'] === 'string' ? value['lastActiveDate'] : null;
    const current =
      typeof value['current'] === 'number' && Number.isFinite(value['current'])
        ? Math.max(0, Math.floor(value['current']))
        : 0;
    const best =
      typeof value['best'] === 'number' && Number.isFinite(value['best'])
        ? Math.max(current, Math.floor(value['best']))
        : current;
    return { lastActiveDate, current, best };
  }

  private normalizeComboStreakState(value: unknown): Progress['comboStreak'] {
    if (!this.isRecord(value)) {
      return createEmptyStreakState();
    }
    const count =
      typeof value['count'] === 'number' && Number.isFinite(value['count'])
        ? Math.max(0, Math.floor(value['count']))
        : 0;
    const lastUpdatedAt =
      typeof value['lastUpdatedAt'] === 'string' ? value['lastUpdatedAt'] : undefined;
    const multiplier = calcStreakMultiplier(count);
    return lastUpdatedAt ? { count, multiplier, lastUpdatedAt } : { count, multiplier };
  }

  private normalizeFinaleState(value: unknown): FinaleState {
    if (!this.isRecord(value)) {
      return createEmptyFinaleState();
    }
    const chainId = this.isFinaleChainId(value['chainId'])
      ? (value['chainId'] as FinaleState['chainId'])
      : 'board_meeting';
    const currentStepId = this.isFinaleStepId(value['currentStepId'])
      ? (value['currentStepId'] as FinaleStepId)
      : 'bm_1';
    const completedStepIds = this.normalizeFinaleStepIds(value['completedStepIds']);
    const history = this.normalizeFinaleHistory(value['history']);
    const branchFlags = this.normalizeFinaleBranchFlags(value['branchFlags']);
    const unlocked = typeof value['unlocked'] === 'boolean' ? value['unlocked'] : false;
    const active = typeof value['active'] === 'boolean' ? value['active'] : false;
    const finished = typeof value['finished'] === 'boolean' ? value['finished'] : false;
    const endingId = typeof value['endingId'] === 'string' ? value['endingId'] : undefined;

    return {
      ...createEmptyFinaleState(),
      unlocked,
      active,
      chainId,
      currentStepId,
      completedStepIds,
      history,
      branchFlags,
      finished,
      endingId,
    };
  }

  private normalizeFinaleStepIds(value: unknown): FinaleStepId[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const unique = new Set<FinaleStepId>();
    for (const entry of value) {
      if (this.isFinaleStepId(entry)) {
        unique.add(entry);
      }
    }
    return Array.from(unique);
  }

  private normalizeFinaleHistory(value: unknown): FinaleHistoryEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized: FinaleHistoryEntry[] = [];
    for (const entry of value) {
      if (!this.isRecord(entry)) {
        continue;
      }
      if (!this.isFinaleStepId(entry['stepId']) || !this.isFinaleChoiceId(entry['choiceId'])) {
        continue;
      }
      if (typeof entry['atIso'] !== 'string') {
        continue;
      }
      normalized.push({
        stepId: entry['stepId'],
        choiceId: entry['choiceId'],
        atIso: entry['atIso'],
      });
    }
    return normalized;
  }

  private normalizeFinaleBranchFlags(value: unknown): Record<string, boolean> {
    if (!this.isRecord(value)) {
      return {};
    }
    const normalized: Record<string, boolean> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === 'boolean') {
        normalized[key] = entry;
      }
    }
    return normalized;
  }

  private normalizeEndingState(value: unknown): EndingState {
    if (!this.isRecord(value)) {
      return createEmptyEndingState();
    }
    const last = this.normalizeEndingResult(value['last']);
    const finishedAtIso =
      typeof value['finishedAtIso'] === 'string' ? value['finishedAtIso'] : null;
    const history = this.normalizeEndingHistory(value['history']);
    const isEndingUnlocked =
      typeof value['isEndingUnlocked'] === 'boolean' ? value['isEndingUnlocked'] : false;
    const ngPlusCount =
      typeof value['ngPlusCount'] === 'number' && Number.isFinite(value['ngPlusCount'])
        ? Math.max(0, Math.floor(value['ngPlusCount']))
        : 0;

    return {
      ...createEmptyEndingState(),
      last,
      finishedAtIso,
      history,
      isEndingUnlocked,
      ngPlusCount,
    };
  }

  private normalizeEndingResult(value: unknown): EndingResult | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const endingId = value['endingId'];
    const title = value['title'];
    const summary = value['summary'];
    if (!this.isEndingId(endingId) || typeof title !== 'string' || typeof summary !== 'string') {
      return null;
    }
    const stats = this.normalizeEndingStats(value['stats']);
    if (!stats) {
      return null;
    }
    return {
      endingId,
      title,
      summary,
      stats,
    };
  }

  private normalizeEndingHistory(value: unknown): EndingHistoryEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized: EndingHistoryEntry[] = [];
    for (const entry of value) {
      if (!this.isRecord(entry)) {
        continue;
      }
      const endingId = entry['endingId'];
      const title = entry['title'];
      const finishedAtIso = entry['finishedAtIso'];
      if (!this.isEndingId(endingId) || typeof title !== 'string') {
        continue;
      }
      if (typeof finishedAtIso !== 'string') {
        continue;
      }
      const stats = this.normalizeEndingStats(entry['stats']);
      if (!stats) {
        continue;
      }
      normalized.push({
        endingId,
        title,
        finishedAtIso,
        stats,
      });
    }
    return normalized.slice(0, 20);
  }

  private normalizeEndingStats(value: unknown): EndingResult['stats'] | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const cash = value['cash'];
    const reputation = value['reputation'];
    const techDebt = value['techDebt'];
    if (
      typeof cash !== 'number' ||
      typeof reputation !== 'number' ||
      typeof techDebt !== 'number'
    ) {
      return null;
    }
    return {
      cash,
      reputation,
      techDebt,
      avgMorale: typeof value['avgMorale'] === 'number' ? value['avgMorale'] : undefined,
      companyLevel: typeof value['companyLevel'] === 'string' ? value['companyLevel'] : undefined,
      completedContracts:
        typeof value['completedContracts'] === 'number' ? value['completedContracts'] : undefined,
      incidentsResolved:
        typeof value['incidentsResolved'] === 'number' ? value['incidentsResolved'] : undefined,
      finaleFlags: this.isRecord(value['finaleFlags'])
        ? (value['finaleFlags'] as Record<string, boolean>)
        : undefined,
      score: typeof value['score'] === 'number' ? value['score'] : undefined,
    };
  }

  private normalizeEmployee(value: unknown): Employee | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const assignment = this.normalizeEmployeeAssignment(value['assignment'], value['id']);
    const candidate = {
      ...value,
      assignment,
    };
    if (!this.isValidEmployee(candidate)) {
      return null;
    }
    return {
      id: candidate.id,
      name: candidate.name,
      role: candidate.role,
      quality: this.normalizeEmployeeQuality(candidate.quality),
      morale: this.normalizeEmployeeMorale(candidate.morale),
      traits: Array.isArray(candidate.traits) ? candidate.traits : [],
      hiredAtIso: candidate.hiredAtIso,
      salaryCash: this.normalizeCash(candidate.salaryCash),
      assignment,
    };
  }

  private normalizeEmployeeAssignment(value: unknown, employeeId?: unknown): EmployeeAssignment {
    if (this.isEmployeeAssignment(value)) {
      return value;
    }
    if (value !== undefined) {
      this.logDevWarn('employee-assignment-invalid', { employeeId, value });
    }
    return 'delivery';
  }

  private normalizeEmployeeQuality(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private normalizeEmployeeMorale(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private isEmployeeAssignment(value: unknown): value is EmployeeAssignment {
    return (EMPLOYEE_ASSIGNMENTS as readonly string[]).includes(value as string);
  }

  private isValidContract(value: unknown): value is Contract {
    if (!this.isRecord(value)) {
      return false;
    }
    if (typeof value['id'] !== 'string') {
      return false;
    }
    if (typeof value['title'] !== 'string' || typeof value['description'] !== 'string') {
      return false;
    }
    if (!Array.isArray(value['objectives'])) {
      return false;
    }
    if (!this.isRecord(value['reward'])) {
      return false;
    }
    if (typeof value['seed'] !== 'string') {
      return false;
    }
    return true;
  }

  private isValidCandidate(value: unknown): value is Candidate {
    if (!this.isRecord(value)) {
      return false;
    }
    if (typeof value['id'] !== 'string') {
      return false;
    }
    if (typeof value['name'] !== 'string') {
      return false;
    }
    if (typeof value['role'] !== 'string') {
      return false;
    }
    if (typeof value['quality'] !== 'number') {
      return false;
    }
    if (!Array.isArray(value['traits'])) {
      return false;
    }
    if (typeof value['summary'] !== 'string') {
      return false;
    }
    if (typeof value['seed'] !== 'string') {
      return false;
    }
    return true;
  }

  private isValidEmployee(value: unknown): value is Employee {
    if (!this.isRecord(value)) {
      return false;
    }
    if (typeof value['id'] !== 'string') {
      return false;
    }
    if (typeof value['name'] !== 'string') {
      return false;
    }
    if (value['role'] !== 'junior' && value['role'] !== 'middle' && value['role'] !== 'senior') {
      return false;
    }
    if (typeof value['quality'] !== 'number') {
      return false;
    }
    if (typeof value['morale'] !== 'number') {
      return false;
    }
    if (!Array.isArray(value['traits'])) {
      return false;
    }
    if (typeof value['hiredAtIso'] !== 'string') {
      return false;
    }
    if (typeof value['salaryCash'] !== 'number') {
      return false;
    }
    if (!this.isEmployeeAssignment(value['assignment'])) {
      return false;
    }
    return true;
  }

  private isValidCompanyLedgerEntry(value: unknown): value is CompanyLedgerEntry {
    if (!this.isRecord(value)) {
      return false;
    }
    if (typeof value['id'] !== 'string') {
      return false;
    }
    if (typeof value['title'] !== 'string') {
      return false;
    }
    if (typeof value['createdAtIso'] !== 'string') {
      return false;
    }
    if (!this.isCompanyLedgerReason(value['reason'])) {
      return false;
    }
    const delta = value['delta'];
    if (!this.isRecord(delta)) {
      return false;
    }
    if (typeof delta['incomeCash'] !== 'number' || typeof delta['salariesCash'] !== 'number') {
      return false;
    }
    if (typeof delta['netCash'] !== 'number' || typeof delta['reputationDelta'] !== 'number') {
      return false;
    }
    if (delta['incidentCash'] !== undefined && typeof delta['incidentCash'] !== 'number') {
      return false;
    }
    if (delta['moraleDelta'] !== undefined && typeof delta['moraleDelta'] !== 'number') {
      return false;
    }
    const balanceAfter = value['balanceAfter'];
    if (!this.isRecord(balanceAfter)) {
      return false;
    }
    if (typeof balanceAfter['cash'] !== 'number') {
      return false;
    }
    if (
      balanceAfter['reputation'] !== undefined &&
      typeof balanceAfter['reputation'] !== 'number'
    ) {
      return false;
    }
    if (balanceAfter['avgMorale'] !== undefined && typeof balanceAfter['avgMorale'] !== 'number') {
      return false;
    }
    if (value['lines'] !== undefined) {
      if (
        !Array.isArray(value['lines']) ||
        !value['lines'].every((line) => typeof line === 'string')
      ) {
        return false;
      }
    }
    return true;
  }

  private isValidActiveIncident(value: unknown): value is ActiveIncident {
    if (!this.isRecord(value)) {
      return false;
    }
    if (typeof value['instanceId'] !== 'string' || typeof value['templateId'] !== 'string') {
      return false;
    }
    if (typeof value['title'] !== 'string' || typeof value['description'] !== 'string') {
      return false;
    }
    if (!this.isIncidentSeverity(value['severity'])) {
      return false;
    }
    if (!this.isIncidentSource(value['source'])) {
      return false;
    }
    if (typeof value['createdAtIso'] !== 'string' || typeof value['seed'] !== 'string') {
      return false;
    }
    if (!Array.isArray(value['decisions'])) {
      return false;
    }
    if (value['resolvedAtIso'] !== undefined && typeof value['resolvedAtIso'] !== 'string') {
      return false;
    }
    if (
      value['chosenDecisionId'] !== undefined &&
      !this.isIncidentDecisionId(value['chosenDecisionId'])
    ) {
      return false;
    }
    return true;
  }

  private isValidIncidentHistoryEntry(value: unknown): value is IncidentHistoryEntry {
    if (!this.isRecord(value)) {
      return false;
    }
    if (typeof value['instanceId'] !== 'string' || typeof value['templateId'] !== 'string') {
      return false;
    }
    if (!this.isIncidentDecisionId(value['chosenDecisionId'])) {
      return false;
    }
    if (typeof value['resolvedAtIso'] !== 'string') {
      return false;
    }
    const effects = value['effects'];
    if (!this.isRecord(effects)) {
      return false;
    }
    if (
      typeof effects['cashDelta'] !== 'number' ||
      typeof effects['reputationDelta'] !== 'number'
    ) {
      return false;
    }
    if (effects['techDebtDelta'] !== undefined && typeof effects['techDebtDelta'] !== 'number') {
      return false;
    }
    if (effects['moraleDelta'] !== undefined && typeof effects['moraleDelta'] !== 'number') {
      return false;
    }
    return true;
  }

  private isValidQuest(value: unknown): value is Quest {
    if (!this.isRecord(value)) {
      return false;
    }
    if (typeof value['id'] !== 'string') {
      return false;
    }
    if (typeof value['title'] !== 'string' || typeof value['description'] !== 'string') {
      return false;
    }
    if (!this.isRecord(value['objective'])) {
      return false;
    }
    if (!this.isRecord(value['reward'])) {
      return false;
    }
    if (typeof value['status'] !== 'string') {
      return false;
    }
    if (typeof value['issuedAtIso'] !== 'string' || typeof value['sessionId'] !== 'string') {
      return false;
    }

    const objective = value['objective'];
    if (typeof objective['type'] !== 'string') {
      return false;
    }
    if (typeof objective['target'] !== 'number' || typeof objective['current'] !== 'number') {
      return false;
    }

    const reward = value['reward'];
    if (typeof reward['coins'] !== 'number' || typeof reward['badgeId'] !== 'string') {
      return false;
    }

    return true;
  }

  private isValidCompletedContractEntry(value: unknown): value is CompletedContractEntry {
    if (!this.isRecord(value)) {
      return false;
    }
    if (typeof value['id'] !== 'string' || typeof value['title'] !== 'string') {
      return false;
    }
    if (typeof value['completedAtIso'] !== 'string') {
      return false;
    }
    const reward = value['reward'];
    if (!this.isRecord(reward)) {
      return false;
    }
    if (typeof reward['coins'] !== 'number') {
      return false;
    }
    return true;
  }

  private resolveSkillStageForSkill(skillId: string): SkillStageId | null {
    const profession = this._auth().profession || this._user().role;
    const mapping = PROFESSION_STAGE_SKILLS[profession as keyof typeof PROFESSION_STAGE_SKILLS];
    if (mapping) {
      for (const stage of SKILL_STAGE_ORDER) {
        if (mapping[stage]?.includes(skillId)) {
          return stage;
        }
      }
    }
    return this._progress().careerStage ?? 'internship';
  }

  private resolveExamProfessionId(): ExamProfessionId | null {
    const raw = this.professionId();
    const index = PROFESSION_OPTIONS.indexOf(raw as (typeof PROFESSION_OPTIONS)[number]);
    if (index === -1) {
      return null;
    }
    return EXAM_PROFESSION_IDS[index] ?? null;
  }

  private resolveContractSeed(): string {
    const login = this._auth().login?.trim();
    const base = login || this._user().startDate || this._user().role || 'guest';
    return `${base}:${this.careerStage()}`;
  }

  private resolveCompanyTickSeed(): string {
    const login = this._auth().login?.trim();
    const base = login || this._user().startDate || this._user().role || 'guest';
    return `${base}:company`;
  }

  private resolveCandidatesSeed(refreshIndex: number): string {
    return `${this.resolveContractSeed()}:candidates:${refreshIndex}`;
  }

  private buildCandidatesPool(refreshIndex: number): Candidate[] {
    const seed = this.resolveCandidatesSeed(refreshIndex);
    return generateCandidates({
      seed,
      stage: this.careerStage(),
      reputation: this.reputation(),
      techDebt: this.techDebt(),
      totalBuffs: this.totalBuffs(),
      poolSize: BALANCE.hiring?.poolSize ?? 6,
    });
  }

  private resolveSessionQuestSeed(): string {
    const login = this._auth().login?.trim();
    const base = login || this._user().startDate || this._user().role || 'guest';
    const examAvailable = Boolean(this.resolveExamProfessionId());
    const purchaseAvailable = true;
    return `${base}:${this.careerStage()}|exam=${examAvailable ? 1 : 0}|purchase=${
      purchaseAvailable ? 1 : 0
    }`;
  }

  private resolveSessionId(): string {
    if (!this.isSessionStorageAvailable()) {
      return new Date().toISOString();
    }
    const key = 'skillforge.session.id';
    const stored = sessionStorage.getItem(key);
    if (stored && stored.trim().length > 0) {
      return stored;
    }
    const created = new Date().toISOString();
    try {
      sessionStorage.setItem(key, created);
    } catch {
      return created;
    }
    return created;
  }

  private isSessionStorageAvailable(): boolean {
    return typeof sessionStorage !== 'undefined';
  }

  private normalizeSpecializationId(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    if (normalized.length === 0) {
      return null;
    }
    const professionId = this.resolveExamProfessionId();
    if (!professionId) {
      return null;
    }
    const specs = SPECIALIZATIONS[professionId] ?? [];
    if (specs.some((spec) => spec.id === normalized)) {
      return normalized;
    }
    const owner = this.findSpecializationOwner(normalized);
    if (owner && owner !== professionId) {
      this.logDevWarn('specialization-wrong-profession', {
        specializationId: normalized,
        owner,
        professionId,
      });
    } else {
      this.logDevError('specialization-not-found', { specializationId: normalized });
    }
    return null;
  }

  private findSpecializationOwner(specId: string): string | null {
    for (const [key, list] of Object.entries(SPECIALIZATIONS)) {
      if (list.some((spec) => spec.id === specId)) {
        return key;
      }
    }
    return null;
  }

  private buildExamConfigs(): ExamConfig[] {
    const definitions = this._examDefinitions();
    if (definitions.length === 0) {
      return [];
    }
    const questions = this._examQuestions();
    const generalIds: string[] = [];
    const byProfession = new Map<string, string[]>();

    for (const entry of questions) {
      const questionId = entry.question.id;
      const professionId = entry.professionId;
      if (!professionId) {
        generalIds.push(questionId);
        continue;
      }
      const list = byProfession.get(professionId) ?? [];
      list.push(questionId);
      byProfession.set(professionId, list);
    }

    return definitions.map((exam) => {
      const specific = byProfession.get(exam.professionId) ?? [];
      const questionIds = Array.from(new Set([...specific, ...generalIds]));
      return {
        id: exam.id,
        title: this.resolveExamTitle(exam.professionId, exam.stage),
        professionId: exam.professionId,
        stage: exam.stage,
        questionCount: exam.questionCount,
        passScore: exam.passScore,
        questionIds,
      };
    });
  }

  private resolveExamTitle(professionId: string, stage: SkillStageId): string {
    const label =
      EXAM_PROFESSION_LABELS[professionId as ExamProfessionId] ??
      professionId ??
      '\u042d\u043a\u0437\u0430\u043c\u0435\u043d';
    const stageLabel = CERT_STAGE_LABELS[stage] ?? stage;
    return `${label} \u00b7 ${stageLabel} \u2014 \u044d\u043a\u0437\u0430\u043c\u0435\u043d`;
  }

  private getExamByProfessionStage(professionId: string, stage: SkillStageId): ExamConfig | null {
    return (
      this.exams().find((exam) => exam.professionId === professionId && exam.stage === stage) ??
      null
    );
  }

  private matchesScenarioProfession(scenario: Scenario, profession: string): boolean {
    return scenario.profession === 'all' || scenario.profession === profession;
  }

  private isCompanyUnlocked(): boolean {
    return Boolean(this._company().unlocked);
  }

  private normalizeCareerStage(value: unknown): SkillStageId {
    if (typeof value !== 'string') {
      return 'internship';
    }
    if ((SKILL_STAGE_ORDER as readonly string[]).includes(value)) {
      return value as SkillStageId;
    }
    return 'internship';
  }

  private normalizeXp(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  private normalizeCoins(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  private normalizeScore(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.floor(value)));
  }

  private resolveLuxuryOwnedItems(ownedItemIds: ShopItemId[]): ShopItemId[] {
    const carryLuxuryOnly = BALANCE.ngPlus?.carryOver?.luxuryOnly ?? true;
    if (!carryLuxuryOnly) {
      return ownedItemIds;
    }
    const items =
      this._shopItems().length > 0 ? this._shopItems() : (SHOP_ITEMS as readonly ShopItem[]);
    const luxuryIds = new Set<ShopItemId>(
      items
        .filter((item) => item.currency === 'cash' || item.category === 'luxury')
        .map((item) => item.id as ShopItemId),
    );
    return ownedItemIds.filter((id) => luxuryIds.has(id));
  }

  private resolveAverageMorale(employees: Employee[]): number {
    if (!employees.length) {
      return 0;
    }
    const total = employees.reduce((sum, employee) => sum + (employee.morale ?? 0), 0);
    return total / employees.length;
  }

  private isValidStage(value: string): value is SkillStageId {
    return (SKILL_STAGE_ORDER as readonly string[]).includes(value);
  }

  private isCompanyLevel(value: unknown): value is CompanyLevel {
    return typeof value === 'string' && (COMPANY_LEVELS as readonly string[]).includes(value);
  }

  private isCompanyLedgerReason(value: unknown): value is CompanyLedgerReason {
    return (
      typeof value === 'string' && (COMPANY_LEDGER_REASONS as readonly string[]).includes(value)
    );
  }

  private isIncidentSeverity(value: unknown): value is IncidentSeverity {
    return typeof value === 'string' && (INCIDENT_SEVERITIES as readonly string[]).includes(value);
  }

  private isIncidentDecisionId(value: unknown): value is IncidentDecisionId {
    return (
      typeof value === 'string' && (INCIDENT_DECISION_IDS as readonly string[]).includes(value)
    );
  }

  private isIncidentSource(value: unknown): value is 'tick' {
    return typeof value === 'string' && (INCIDENT_SOURCES as readonly string[]).includes(value);
  }

  private isEarnedBadgeSource(value: unknown): value is EarnedBadge['source'] {
    return value === 'quest' || value === 'ending' || value === 'streak' || value === 'admin';
  }

  private isFinaleChainId(value: unknown): value is FinaleState['chainId'] {
    return typeof value === 'string' && (FINALE_CHAIN_IDS as readonly string[]).includes(value);
  }

  private isFinaleStepId(value: unknown): value is FinaleStepId {
    return typeof value === 'string' && (FINALE_STEP_IDS as readonly string[]).includes(value);
  }

  private isFinaleChoiceId(value: unknown): value is FinaleChoiceId {
    return typeof value === 'string' && (FINALE_CHOICE_IDS as readonly string[]).includes(value);
  }

  private isEndingId(value: unknown): value is EndingResult['endingId'] {
    return typeof value === 'string' && (ENDING_IDS as readonly string[]).includes(value);
  }

  private logDevError(message: string, payload: unknown): void {
    const isDev = typeof ngDevMode !== 'undefined' && ngDevMode;
    if (isDev) {
      console.error(`[store] ${message}`, payload);
    }
  }

  private logDevWarn(message: string, payload: unknown): void {
    const isDev = typeof ngDevMode !== 'undefined' && ngDevMode;
    if (isDev) {
      console.warn(`[store] ${message}`, payload);
    }
  }

  private logDevInfo(message: string, payload: unknown): void {
    const isDev = typeof ngDevMode !== 'undefined' && ngDevMode;
    if (isDev) {
      console.info(`[store] ${message}`, payload);
    }
  }

  private normalizeCash(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  private normalizeReputation(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  private normalizeTechDebt(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  private normalizeCompanyLevel(value: unknown): CompanyLevel {
    if (this.isCompanyLevel(value)) {
      return value as CompanyLevel;
    }
    return 'none';
  }

  private parseNumberRecord(value: unknown): Record<string, number> | null {
    if (!this.isRecord(value)) {
      return null;
    }
    const result: Record<string, number> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry !== 'number' || Number.isNaN(entry)) {
        return null;
      }
      result[key] = entry;
    }
    return result;
  }

  private parseBooleanRecord(value: unknown): Record<string, boolean> | null {
    if (value === undefined) {
      return null;
    }
    if (!this.isRecord(value)) {
      return null;
    }
    const result: Record<string, boolean> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry !== 'boolean') {
        return null;
      }
      result[key] = entry;
    }
    return result;
  }
}
