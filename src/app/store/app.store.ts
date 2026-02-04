import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  applyDecisionEffects,
  createDecisionEntry,
  createProgressSnapshot,
  Progress,
  ProgressSnapshot,
  undoLastDecision,
} from '@/entities/progress';
import type { ExamAnswer, ExamAttempt, ExamRun, ExamSession } from '@/entities/exam';
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
import { Company, CompanyLevel, COMPANY_LEVELS } from '@/entities/company';
import {
  CompletedContractEntry,
  Contract,
  ContractProgressEvent,
  RewardSummary,
  generateAvailableContracts,
} from '@/entities/contracts';
import { Quest, QuestProgressEvent, generateSessionQuests } from '@/entities/quests';
import { getTotalBuffs } from '@/entities/buffs';
import { addItem, Inventory, normalizeOwnedItemIds, ownsItem } from '@/entities/inventory';
import { calcScenarioReward, calcScenarioXp } from '@/entities/rewards';
import type { DecisionEffects } from '@/entities/decision';
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
  SkillStageId,
  SPECIALIZATIONS,
} from '@/shared/config';
import { NotificationsStore } from '@/features/notifications';
import { AchievementsStore } from '@/features/achievements';
import { ScenariosApi } from '@/shared/api/scenarios/scenarios.api';
import { SkillsApi } from '@/shared/api/skills/skills.api';
import { ErrorLogStore } from '@/shared/lib/errors';
import {
  createPurchaseMadeEvent,
  createProfileCreatedEvent,
  createScenarioCompletedEvent,
  createExamPassedEvent,
  createStagePromotedEvent,
  createSkillUpgradedEvent,
  DomainEventBus,
} from '@/shared/lib/events';
import {
  migratePersistedState,
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

const CERT_STAGE_LABELS: Record<SkillStageId, string> = {
  internship: 'Стажировка',
  junior: 'Джуниор',
  middle: 'Миддл',
  senior: 'Сеньор',
};

const MAX_ACTIVE_CONTRACTS = 3;

const createEmptyAuth = (): AuthState => ({
  login: '',
  profession: '',
  isRegistered: false,
});

const createEmptyUser = (): User => ({
  role: 'Без роли',
  goals: [],
  startDate: new Date().toISOString().slice(0, 10),
  isProfileComplete: false,
});

const createEmptyCompany = (): Company => ({
  cash: 0,
  unlocked: false,
  level: 'none',
  onboardingSeen: false,
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
  specializationId: null,
  reputation: 0,
  techDebt: 0,
  coins: 0,
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
  private readonly eventBus = inject(DomainEventBus);
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly errorLogStore = inject(ErrorLogStore);
  private readonly achievementsStore = inject(AchievementsStore);
  private readonly numberFormatter = new Intl.NumberFormat('ru-RU');
  private readonly sessionId = this.resolveSessionId();

  private hasHydrated = false;
  private readonly _user = signal<User>(createEmptyUser());
  private readonly _skills = signal<Skill[]>([]);
  private readonly _scenarios = signal<Scenario[]>([]);
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
  readonly skillsLoading = this._skillsLoading.asReadonly();
  readonly scenariosLoading = this._scenariosLoading.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly company = this._company.asReadonly();
  readonly inventory = this._inventory.asReadonly();
  readonly availableContracts = this._availableContracts.asReadonly();
  readonly featureFlags = this._featureFlags.asReadonly();
  readonly auth = this._auth.asReadonly();
  readonly xp = this._xp.asReadonly();
  readonly backupAvailable = this._backupAvailable.asReadonly();
  readonly activeContracts = computed(() => this._progress().activeContracts);
  readonly sessionQuests = computed(() => this._progress().sessionQuests);
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
      reasons.push('Прокачай все 4 навыка этапа до максимума');
    }
    return reasons;
  });
  readonly skillsError = this._skillsError.asReadonly();
  readonly scenariosError = this._scenariosError.asReadonly();
  readonly hasProfile = computed(() => this._user().isProfileComplete);
  readonly isRegistered = computed(() => this._auth().isRegistered);
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
  readonly totalBuffs = computed(() => {
    const owned = new Set(this._inventory().ownedItemIds);
    const sources = SHOP_ITEMS.filter((item) => owned.has(item.id)).map((item) => ({
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
        scenarioTitle: scenario?.title ?? 'Неизвестный сценарий',
        decisionText: decision?.text ?? 'Неизвестное решение',
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
    effect(() => {
      if (!this.hasHydrated) {
        return;
      }
      this.persistToStorage();
    });
    this.eventBus.subscribe('ScenarioCompleted', (event) => {
      const progressEvent: ContractProgressEvent = {
        type: 'ScenarioCompleted',
        scenarioId: event.payload.scenarioId,
      };
      this.applyEventToContracts(progressEvent);
      this.applyEventToSessionQuests(progressEvent);
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
      const progressEvent: ContractProgressEvent = {
        type: 'ExamPassed',
        examId: event.payload.examId,
        stage: event.payload.stage,
      };
      this.applyEventToContracts(progressEvent);
      this.applyEventToSessionQuests(progressEvent);
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
        this._skillsError.set('Не удалось загрузить навыки.');
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
        this._scenariosError.set('Не удалось загрузить сценарии.');
        this._scenarios.set([]);
        this._scenariosLoading.set(false);
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
    this._availableContracts.set(generated.filter((contract) => !activeIds.has(contract.id)));
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
    if (active.length >= MAX_ACTIVE_CONTRACTS) {
      this.notificationsStore.error('Лимит 3 контракта');
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
          ? `Контракт выполнен: ${completed[0].title}. Награда: ${rewardLabel}`
          : `Выполнено контрактов: ${completed.length}. Награда: ${rewardLabel}`;
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
      role: normalizedProfession.length > 0 ? normalizedProfession : 'Без роли',
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
    this.eventBus.publish(createProfileCreatedEvent(profile));
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

  logout(): void {
    this.resetAll();
  }

  resetAll(): void {
    this.clearStorage();
    this.resetState();
  }

  createProfile(role: string, goal: string, selectedSkillIds: string[]): void {
    const startDate = new Date().toISOString().slice(0, 10);
    const normalizedRole = role.trim();
    const normalizedGoal = goal.trim();
    const selected = new Set(selectedSkillIds);

    const profile: User = {
      role: normalizedRole.length > 0 ? normalizedRole : 'Без роли',
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
      specializationId: null,
      reputation: 0,
      techDebt: 0,
      coins: 0,
      scenarioOverrides: {},
      spentXpOnSkills: 0,
      careerStage: 'internship',
    });
    this._availableContracts.set([]);
    this._company.set(createEmptyCompany());
    this._inventory.set(createEmptyInventory());
    this._xp.set(0);

    this.setFeatureFlag('demoMode', false);
    this.eventBus.publish(createProfileCreatedEvent(profile));
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
      return { ok: false, error: 'Некорректный JSON.' };
    }

    if (!this.isRecord(parsed)) {
      return { ok: false, error: 'JSON должен быть объектом.' };
    }

    const migrated = migratePersistedState(parsed);
    if (!migrated) {
      return {
        ok: false,
        error: 'Неподдерживаемая версия экспорта.',
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

    const migrated = migratePersistedState(parsed);
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
    this.notificationsStore.success('Бэкап восстановлен.');
    this._backupAvailable.set(true);
    return true;
  }

  private applyPersistedState(
    migrated: PersistedStateLatest,
    options: { allowLegacy?: boolean } = {},
  ): ImportResult {
    const user = this.parseUser(migrated.user);
    if (!user) {
      return { ok: false, error: 'Некорректные данные профиля.' };
    }

    const progress = this.parseProgress(migrated.progress);
    if (!progress) {
      return { ok: false, error: 'Некорректные данные прогресса.' };
    }
    const company = this.parseCompany(migrated.company);
    if (!company) {
      return { ok: false, error: 'Некорректные данные компании.' };
    }
    const inventory = this.parseInventory(migrated.inventory);
    if (!inventory) {
      return { ok: false, error: 'Некорректные данные инвентаря.' };
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
    this.eventBus.publish(
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

  notifyExamPassed(examId: string, stage?: SkillStageId, score?: number): void {
    if (typeof examId !== 'string' || examId.trim().length === 0) {
      return;
    }
    this.eventBus.publish(
      createExamPassedEvent(examId, {
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

  buyItem(itemId: string): boolean {
    const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
    if (!item) {
      this.notificationsStore.error('Неизвестный предмет.');
      return false;
    }

    const inventory = this._inventory();
    if (ownsItem(inventory, item.id as ShopItemId)) {
      this.notificationsStore.error('Предмет уже куплен.');
      return false;
    }

    if (!Number.isFinite(item.price) || item.price <= 0) {
      this.notificationsStore.error('Предмет недоступен.');
      return false;
    }

    const currency = item.currency === 'cash' ? 'cash' : 'coins';
    if (currency === 'cash') {
      if (!this.isCompanyUnlocked()) {
        this.notificationsStore.error('Люкс-магазин откроется после Senior и сертификата.');
        return false;
      }
      const company = this._company();
      const currentCash = company?.cash ?? 0;
      if (currentCash < item.price) {
        this.notificationsStore.error('Не хватает кэша.');
        return false;
      }
      const cashAfter = this.normalizeCash(currentCash - item.price);
      this._company.update((current) => ({
        ...current,
        cash: cashAfter,
      }));
      this._inventory.update((current) => addItem(current, item.id as ShopItemId));
      this.notificationsStore.success(`Куплено: ${item.name}.`);
      this.eventBus.publish(
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
      this.notificationsStore.error('Не хватает монет.');
      return false;
    }

    const coinsAfter = this.normalizeCoins(currentCoins - item.price);
    this._progress.update((progress) => ({
      ...progress,
      coins: coinsAfter,
    }));
    this._inventory.update((current) => addItem(current, item.id as ShopItemId));
    this.notificationsStore.success(`Куплено: ${item.name}.`);
    this.eventBus.publish(
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
      this.eventBus.publish(
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
        reasons: ['Сценарий уже пройден.'],
        status: 'completed',
      };
    }
    if (!this.stageScenarioIdSet().has(scenarioId)) {
      return {
        scenario,
        available: false,
        reasons: ['Сценарий доступен на другом этапе.'],
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
        reasons: ['Сценарий доступен на другом этапе.'],
        status: 'active',
      };
    }
    return (
      this.scenarioAccessMap().get(scenarioId) ?? {
        scenario,
        available: false,
        reasons: ['Сценарий недоступен.'],
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
    this.eventBus.publish(createStagePromotedEvent(status.stage, nextStage));
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
        reason: 'Нужно выбрать профессию, чтобы повысить стадию.',
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
        : 'следующего этапа';
      return {
        ok: false,
        reason: isRetro
          ? `Для дальнейшего роста нужно сдать ретро-экзамен за этап: ${label}`
          : `Чтобы повыситься до ${nextStageLabel}, нужно сдать экзамен: ${label}`,
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
        this.eventBus.publish(
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

    const { state, isLegacy } = stored;

    if (state.user) {
      this._user.set({
        role: state.user.role ?? 'Без роли',
        goals: state.user.goals ?? [],
        startDate: state.user.startDate ?? new Date().toISOString().slice(0, 10),
        isProfileComplete: state.user.isProfileComplete ?? false,
      });
    }
    if (state.progress) {
      this._progress.set(this.mergeProgressDefaults(state.progress));
    }
    if (state.company) {
      this._company.set(this.mergeCompanyDefaults(state.company));
    }
    if (state.inventory) {
      this._inventory.set(this.mergeInventoryDefaults(state.inventory));
    }
    if (state.featureFlags) {
      this._featureFlags.set({
        ...DEFAULT_FEATURE_FLAGS,
        ...state.featureFlags,
      });
    }
    if (typeof state.xp === 'number') {
      this._xp.set(this.normalizeXp(state.xp));
    }
    if (state.auth) {
      const auth = this.parseAuth(state.auth);
      if (auth) {
        this._auth.set(auth);
        if (auth.isRegistered && !this._user().isProfileComplete) {
          this._user.update((current) => ({
            ...current,
            role: auth.profession || current.role,
            isProfileComplete: true,
          }));
        }
      }
    }

    this.checkAndUnlockCompany({ allowLegacy: isLegacy });
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

  private persistToStorage(): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    const payload = {
      version: AppStore.STORAGE_VERSION,
      user: this._user(),
      progress: this._progress(),
      company: this._company(),
      inventory: this._inventory(),
      featureFlags: this._featureFlags(),
      auth: this._auth(),
      xp: this._xp(),
    };

    try {
      const serialized = JSON.stringify(payload);
      localStorage.setItem(AppStore.STORAGE_KEY, serialized);
      localStorage.setItem(AppStore.BACKUP_STORAGE_KEY, serialized);
      this._backupAvailable.set(true);
    } catch {
      // Ignore storage errors (quota or privacy mode).
    }
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
      // Ignore storage errors (quota or privacy mode).
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
      'Не удалось прочитать сохранение. Выполнен сброс к пустому состоянию.',
    );
  }

  private mergeProgressDefaults(progress: Partial<Progress>): Progress {
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
      specializationId: this.normalizeSpecializationId(progress.specializationId ?? null),
      reputation: progress.reputation ?? 0,
      techDebt: progress.techDebt ?? 0,
      coins: this.normalizeCoins(progress.coins ?? 0),
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
    if (cash !== undefined && typeof cash !== 'number') {
      return null;
    }
    return {
      cash: this.normalizeCash(typeof cash === 'number' ? cash : 0),
      unlocked: typeof unlocked === 'boolean' ? unlocked : false,
      level: this.normalizeCompanyLevel(level),
      onboardingSeen: typeof onboardingSeen === 'boolean' ? onboardingSeen : false,
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
    const coinsLabel = `+${this.formatNumber(coins)} монет`;
    const cashLabel = cash > 0 ? ` (+${this.formatNumber(cash)} кэш)` : '';
    return `${coinsLabel}${cashLabel}`;
  }

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return this.numberFormatter.format(Math.max(0, Math.floor(value)));
  }

  private grantQuestBadge(badgeId: string): void {
    const normalized = badgeId?.trim();
    if (!normalized) {
      return;
    }
    this.achievementsStore.grantAchievement(normalized);
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

  private isValidStage(value: string): value is SkillStageId {
    return (SKILL_STAGE_ORDER as readonly string[]).includes(value);
  }

  private isCompanyLevel(value: unknown): value is CompanyLevel {
    return typeof value === 'string' && (COMPANY_LEVELS as readonly string[]).includes(value);
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
