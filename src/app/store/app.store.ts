import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Progress } from '../../entities/progress/model/progress.model';
import { Scenario } from '../../entities/scenario/model/scenario.model';
import { Skill } from '../../entities/skill/model/skill.model';
import { User } from '../../entities/user/model/user.model';
import { ScenariosApi } from '../../shared/api/scenarios/scenarios.api';
import { SkillsApi } from '../../shared/api/skills/skills.api';

@Injectable({ providedIn: 'root' })
export class AppStore {
  private static readonly STORAGE_KEY = 'skillforge.state.v1';
  private static readonly STORAGE_VERSION = 1;

  private readonly skillsApi = inject(SkillsApi);
  private readonly scenariosApi = inject(ScenariosApi);

  private hasHydrated = false;
  private readonly metricKeys = new Set(['reputation', 'techDebt']);

  private readonly _user = signal<User>({
    role: 'Frontend Engineer',
    goals: ['Architecture', 'Execution'],
    startDate: '2026-02-02',
  });
  private readonly _skills = signal<Skill[]>([]);
  private readonly _scenarios = signal<Scenario[]>([]);
  private readonly _progress = signal<Progress>({
    skillLevels: {},
    decisionHistory: [],
    reputation: 0,
    techDebt: 0,
  });

  readonly user = this._user.asReadonly();
  readonly skills = this._skills.asReadonly();
  readonly scenarios = this._scenarios.asReadonly();
  readonly progress = this._progress.asReadonly();

  readonly skillsCount = computed(() => this._skills().length);
  readonly scenariosCount = computed(() => this._scenarios().length);
  readonly decisionCount = computed(() => this._progress().decisionHistory.length);
  readonly reputation = computed(() => this._progress().reputation);
  readonly techDebt = computed(() => this._progress().techDebt);

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
    this.skillsApi.getSkills().subscribe((skills) => {
      const mergedLevels = this.mergeSkillLevels(skills, this._progress().skillLevels);
      const hydratedSkills = skills.map((skill) => ({
        ...skill,
        level: mergedLevels[skill.id],
      }));

      this._skills.set(hydratedSkills);
      this._progress.update((progress) => ({
        ...progress,
        skillLevels: mergedLevels,
      }));
    });
    this.scenariosApi.getScenarios().subscribe((scenarios) => this._scenarios.set(scenarios));
  }

  setUser(user: User): void {
    this._user.set(user);
  }

  createProfile(role: string, goal: string, selectedSkillIds: string[]): void {
    const startDate = new Date().toISOString().slice(0, 10);
    const normalizedRole = role.trim();
    const normalizedGoal = goal.trim();
    const selected = new Set(selectedSkillIds);

    this._user.set({
      role: normalizedRole.length > 0 ? normalizedRole : 'Unassigned',
      goals: normalizedGoal.length > 0 ? [normalizedGoal] : [],
      startDate,
    });

    const updatedSkills = this._skills().map((skill) => {
      const level = selected.has(skill.id) ? 1 : 0;
      return {
        ...skill,
        level: this.clampLevel(level, skill.maxLevel),
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
    });
  }

  applyDecision(scenarioId: string, decisionId: string): void {
    const scenario = this._scenarios().find((item) => item.id === scenarioId);
    if (!scenario) {
      return;
    }
    const decision = scenario.decisions.find((item) => item.id === decisionId);
    if (!decision) {
      return;
    }

    this.recordDecision(scenarioId, decisionId);
    this.applyDecisionEffects(decision.effects);
  }

  incrementSkillLevel(skillId: string, delta = 1): void {
    this.changeSkillLevel(skillId, delta);
  }

  canIncreaseSkill(skillId: string): boolean {
    return this.getIncreaseBlockReason(skillId) === null;
  }

  canDecreaseSkill(skillId: string): boolean {
    return this.getDecreaseBlockReason(skillId) === null;
  }

  getIncreaseBlockReason(skillId: string): string | null {
    const skill = this.getSkillById(skillId);
    if (!skill) {
      return 'Skill not found';
    }
    if (skill.level >= skill.maxLevel) {
      return 'Already at max level';
    }
    const missing = this.getMissingDependencies(skill);
    if (missing.length > 0) {
      return `Unlock deps first: ${missing.join(', ')}`;
    }
    return null;
  }

  getDecreaseBlockReason(skillId: string): string | null {
    const skill = this.getSkillById(skillId);
    if (!skill) {
      return 'Skill not found';
    }
    if (skill.level <= 0) {
      return 'Already at minimum level';
    }
    return null;
  }

  recordDecision(scenarioId: string, decisionId: string): void {
    const entry = {
      scenarioId,
      decisionId,
      decidedAt: new Date().toISOString(),
    };

    this._progress.update((progress) => ({
      ...progress,
      decisionHistory: [...progress.decisionHistory, entry],
    }));
  }

  private applyDecisionEffects(effects: Record<string, number>): void {
    for (const [key, delta] of Object.entries(effects)) {
      if (this.metricKeys.has(key)) {
        this.applyMetricDelta(key as 'reputation' | 'techDebt', delta);
      } else {
        this.applySkillDelta(key, delta);
      }
    }
  }

  private applyMetricDelta(metric: 'reputation' | 'techDebt', delta: number): void {
    this._progress.update((progress) => ({
      ...progress,
      [metric]: (progress[metric] ?? 0) + delta,
    }));
  }

  private applySkillDelta(skillId: string, delta: number): void {
    let nextLevel: number | null = null;

    this._skills.update((skills) =>
      skills.map((skill) => {
        if (skill.id !== skillId) {
          return skill;
        }
        nextLevel = this.clampLevel(skill.level + delta, skill.maxLevel);
        return {
          ...skill,
          level: nextLevel,
        };
      })
    );

    if (nextLevel === null) {
      return;
    }
    const safeLevel = nextLevel;

    this._progress.update((progress) => ({
      ...progress,
      skillLevels: {
        ...progress.skillLevels,
        [skillId]: safeLevel,
      },
    }));
  }

  private changeSkillLevel(skillId: string, delta: number): void {
    const reason =
      delta >= 0 ? this.getIncreaseBlockReason(skillId) : this.getDecreaseBlockReason(skillId);
    if (reason) {
      return;
    }

    let nextLevel = 0;

    this._skills.update((skills) =>
      skills.map((skill) => {
        if (skill.id !== skillId) {
          return skill;
        }
        nextLevel = this.clampLevel(skill.level + delta, skill.maxLevel);
        return {
          ...skill,
          level: nextLevel,
        };
      })
    );

    this._progress.update((progress) => ({
      ...progress,
      skillLevels: {
        ...progress.skillLevels,
        [skillId]: nextLevel,
      },
    }));
  }

  private getSkillById(skillId: string): Skill | undefined {
    return this._skills().find((skill) => skill.id === skillId);
  }

  private getMissingDependencies(skill: Skill): string[] {
    if (skill.deps.length === 0) {
      return [];
    }

    const skillsById = new Map(this._skills().map((item) => [item.id, item]));
    const missing: string[] = [];

    for (const depId of skill.deps) {
      const dependency = skillsById.get(depId);
      const isSatisfied = dependency && dependency.level > 0;
      if (!isSatisfied) {
        missing.push(dependency?.name ?? depId);
      }
    }

    return missing;
  }

  private mergeSkillLevels(skills: Skill[], persisted: Record<string, number>): Record<string, number> {
    const merged: Record<string, number> = {};

    for (const skill of skills) {
      const level = persisted[skill.id] ?? skill.level;
      merged[skill.id] = this.clampLevel(level, skill.maxLevel);
    }

    return merged;
  }

  private clampLevel(level: number, maxLevel: number): number {
    return Math.min(Math.max(level, 0), maxLevel);
  }

  private hydrateFromStorage(): void {
    const stored = this.readStorage();
    if (!stored) {
      return;
    }

    if (stored.user) {
      this._user.set(stored.user);
    }
    if (stored.progress) {
      this._progress.set(this.mergeProgressDefaults(stored.progress));
    }
  }

  private persistToStorage(): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    const payload = {
      version: AppStore.STORAGE_VERSION,
      user: this._user(),
      progress: this._progress(),
    };

    try {
      localStorage.setItem(AppStore.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors (quota or privacy mode).
    }
  }

  private readStorage(): { version: number; user: User; progress: Partial<Progress> } | null {
    if (!this.isStorageAvailable()) {
      return null;
    }

    const raw = localStorage.getItem(AppStore.STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { version: number; user: User; progress: Partial<Progress> };
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
    };
  }

  private isStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
