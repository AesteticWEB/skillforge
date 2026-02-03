import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  applyDecisionEffects,
  createDecisionEntry,
  createProgressSnapshot,
  Progress,
  ProgressSnapshot,
  undoLastDecision,
} from '@/entities/progress';
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
import { User } from '@/entities/user';
import {
  DEFAULT_FEATURE_FLAGS,
  DEMO_PROFILE,
  FeatureFlagKey,
  FeatureFlags,
  PROFESSION_STAGE_SKILLS,
  PROFESSION_STAGE_SCENARIOS,
  SCENARIO_REWARD_XP,
  SKILL_STAGE_LABELS,
  SKILL_STAGE_ORDER,
  SkillStageId,
} from '@/shared/config';
import { ScenariosApi } from '@/shared/api/scenarios/scenarios.api';
import { SkillsApi } from '@/shared/api/skills/skills.api';
import {
  createProfileCreatedEvent,
  createScenarioCompletedEvent,
  createStagePromotedEvent,
  createSkillUpgradedEvent,
  DomainEventBus,
} from '@/shared/lib/events';
import {
  getCareerStageProgress,
  getStagePromotionStatus,
  selectCoreSkillsForStage,
} from '@/shared/lib/stage';

type ScenarioAccess = {
  scenario: Scenario;
  available: boolean;
  reasons: string[];
  status: 'active' | 'completed';
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
  featureFlags: FeatureFlags;
  auth: AuthState;
  xp: number;
};

type ImportResult = {
  ok: boolean;
  error?: string;
};

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

const createEmptyProgress = (): Progress => ({
  skillLevels: {},
  decisionHistory: [],
  reputation: 0,
  techDebt: 0,
  scenarioOverrides: {},
  spentXpOnSkills: 0,
  careerStage: 'internship',
});

@Injectable({ providedIn: 'root' })
export class AppStore {
  private static readonly STORAGE_KEY = 'skillforge.state.v1';
  private static readonly STORAGE_VERSION = 1;

  private readonly skillsApi = inject(SkillsApi);
  private readonly scenariosApi = inject(ScenariosApi);
  private readonly eventBus = inject(DomainEventBus);

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

  readonly user = this._user.asReadonly();
  readonly skills = this._skills.asReadonly();
  readonly scenarios = this._scenarios.asReadonly();
  readonly skillsLoading = this._skillsLoading.asReadonly();
  readonly scenariosLoading = this._scenariosLoading.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly featureFlags = this._featureFlags.asReadonly();
  readonly auth = this._auth.asReadonly();
  readonly xp = this._xp.asReadonly();
  readonly spentXpOnSkills = computed(() => this._progress().spentXpOnSkills);
  readonly availableXpForSkills = computed(() =>
    Math.max(0, this._xp() - this._progress().spentXpOnSkills),
  );
  readonly professionId = computed(() => this._auth().profession || this._user().role);
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
  readonly reputation = computed(() => this._progress().reputation);
  readonly techDebt = computed(() => this._progress().techDebt);
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
    this.load();
    this.hasHydrated = true;
    effect(() => {
      if (!this.hasHydrated) {
        return;
      }
      this.persistToStorage();
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
    this._xp.set(0);
    this.setFeatureFlag('demoMode', false);
    this.load();
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
      reputation: 0,
      techDebt: 0,
      scenarioOverrides: {},
      spentXpOnSkills: 0,
      careerStage: 'internship',
    });
    this._xp.set(0);

    this.setFeatureFlag('demoMode', false);
    this.eventBus.publish(createProfileCreatedEvent(profile));
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

    const version = parsed['version'];
    if (typeof version !== 'number' || version !== AppStore.STORAGE_VERSION) {
      return { ok: false, error: 'Неподдерживаемая версия экспорта.' };
    }

    const user = this.parseUser(parsed['user']);
    if (!user) {
      return { ok: false, error: 'Некорректные данные профиля.' };
    }

    const progress = this.parseProgress(parsed['progress']);
    if (!progress) {
      return { ok: false, error: 'Некорректные данные прогресса.' };
    }

    const featureFlags = this.parseFeatureFlags(parsed['featureFlags']);
    const auth = this.parseAuth(parsed['auth']);
    const xp = this.parseXp(parsed['xp']);

    this._user.set(user);
    this._progress.set(progress);
    this._featureFlags.set(featureFlags);
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

    const reputationDelta = decision.effects['reputation'] ?? 0;
    const techDebtDelta = decision.effects['techDebt'] ?? 0;
    const snapshot = createProgressSnapshot(this._progress());
    const beforeSkills = this._skills();
    this.recordDecision(scenarioId, decisionId, snapshot);
    const result = applyDecisionEffects(beforeSkills, this._progress(), decision.effects);
    const progressWithAvailability = applyScenarioAvailabilityEffects(
      result.progress,
      scenario.availabilityEffects ?? [],
    );
    this._skills.set(result.skills);
    this._progress.set(progressWithAvailability);
    this.addXp(SCENARIO_REWARD_XP);

    this.emitSkillUpgrades(beforeSkills, result.skills);
    this.eventBus.publish(
      createScenarioCompletedEvent(scenarioId, decisionId, {
        rewardXp: SCENARIO_REWARD_XP,
        reputationDelta,
        techDebtDelta,
      }),
    );
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

  incrementSkillLevel(skillId: string, delta = 1): void {
    const beforeSkills = this._skills();
    const previousLevel = beforeSkills.find((skill) => skill.id === skillId)?.level ?? 0;
    if (delta < 0) {
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
      }));
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
    this.eventBus.publish(createStagePromotedEvent(status.stage, nextStage));
    return true;
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

    if (stored.user) {
      this._user.set({
        role: stored.user.role ?? 'Без роли',
        goals: stored.user.goals ?? [],
        startDate: stored.user.startDate ?? new Date().toISOString().slice(0, 10),
        isProfileComplete: stored.user.isProfileComplete ?? false,
      });
    }
    if (stored.progress) {
      this._progress.set(this.mergeProgressDefaults(stored.progress));
    }
    if (stored.featureFlags) {
      this._featureFlags.set({
        ...DEFAULT_FEATURE_FLAGS,
        ...stored.featureFlags,
      });
    }
    if (typeof stored.xp === 'number') {
      this._xp.set(this.normalizeXp(stored.xp));
    }
    if (stored.auth) {
      const auth = this.parseAuth(stored.auth);
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
  }

  private resetState(): void {
    this._user.set(createEmptyUser());
    this._auth.set(createEmptyAuth());
    this._progress.set(createEmptyProgress());
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
  }

  private persistToStorage(): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    const payload = {
      version: AppStore.STORAGE_VERSION,
      user: this._user(),
      progress: this._progress(),
      featureFlags: this._featureFlags(),
      auth: this._auth(),
      xp: this._xp(),
    };

    try {
      localStorage.setItem(AppStore.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors (quota or privacy mode).
    }
  }

  private readStorage(): {
    version: number;
    user: Partial<User>;
    progress: Partial<Progress>;
    featureFlags?: Partial<FeatureFlags>;
    auth?: Partial<AuthState>;
    xp?: number;
  } | null {
    if (!this.isStorageAvailable()) {
      return null;
    }

    const raw = localStorage.getItem(AppStore.STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as {
        version: number;
        user: Partial<User>;
        progress: Partial<Progress>;
        featureFlags?: Partial<FeatureFlags>;
        auth?: Partial<AuthState>;
        xp?: number;
      };
      if (parsed?.version !== AppStore.STORAGE_VERSION) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private mergeProgressDefaults(progress: Partial<Progress>): Progress {
    return {
      skillLevels: progress.skillLevels ?? {},
      decisionHistory: progress.decisionHistory ?? [],
      reputation: progress.reputation ?? 0,
      techDebt: progress.techDebt ?? 0,
      scenarioOverrides: progress.scenarioOverrides ?? {},
      spentXpOnSkills: progress.spentXpOnSkills ?? 0,
      careerStage: this.normalizeCareerStage(
        progress.careerStage ?? (progress as Progress & { skillStage?: unknown }).skillStage,
      ),
    };
  }

  private isStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    const reputation = value['reputation'];
    const techDebt = value['techDebt'];
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
    if (spentXpOnSkills !== undefined && typeof spentXpOnSkills !== 'number') {
      return null;
    }

    return {
      skillLevels,
      decisionHistory,
      reputation,
      techDebt,
      scenarioOverrides: scenarioOverrides ?? {},
      spentXpOnSkills: typeof spentXpOnSkills === 'number' ? this.normalizeXp(spentXpOnSkills) : 0,
      careerStage: this.normalizeCareerStage(
        typeof careerStage === 'string' ? careerStage : legacySkillStage,
      ),
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
    const scenarioOverrides = this.parseBooleanRecord(value['scenarioOverrides']);
    const spentXpOnSkills = value['spentXpOnSkills'];
    if (!skillLevels) {
      return null;
    }
    if (typeof reputation !== 'number' || typeof techDebt !== 'number') {
      return null;
    }
    if (spentXpOnSkills !== undefined && typeof spentXpOnSkills !== 'number') {
      return null;
    }
    return {
      skillLevels,
      reputation,
      techDebt,
      scenarioOverrides: scenarioOverrides ?? {},
      spentXpOnSkills: typeof spentXpOnSkills === 'number' ? this.normalizeXp(spentXpOnSkills) : 0,
    };
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

  private matchesScenarioProfession(scenario: Scenario, profession: string): boolean {
    return scenario.profession === 'all' || scenario.profession === profession;
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
