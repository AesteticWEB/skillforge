import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { applyDecisionEffects, Progress } from '@/entities/progress';
import { Scenario } from '@/entities/scenario';
import {
  changeSkillLevel,
  clampSkillLevel,
  getDecreaseBlockReason,
  getIncreaseBlockReason,
  Skill,
} from '@/entities/skill';
import { User } from '@/entities/user';
import { ScenariosApi } from '@/shared/api/scenarios/scenarios.api';
import { SkillsApi } from '@/shared/api/skills/skills.api';

@Injectable({ providedIn: 'root' })
export class AppStore {
  private static readonly STORAGE_KEY = 'skillforge.state.v1';
  private static readonly STORAGE_VERSION = 1;

  private readonly skillsApi = inject(SkillsApi);
  private readonly scenariosApi = inject(ScenariosApi);

  private hasHydrated = false;
  private readonly _user = signal<User>({
    role: 'Frontend Engineer',
    goals: ['Architecture', 'Execution'],
    startDate: '2026-02-02',
    isProfileComplete: false,
  });
  private readonly _skills = signal<Skill[]>([]);
  private readonly _scenarios = signal<Scenario[]>([]);
  private readonly _skillsError = signal<string | null>(null);
  private readonly _scenariosError = signal<string | null>(null);
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
  readonly skillsError = this._skillsError.asReadonly();
  readonly scenariosError = this._scenariosError.asReadonly();
  readonly hasProfile = computed(() => this._user().isProfileComplete);

  readonly skillsCount = computed(() => this._skills().length);
  readonly scenariosCount = computed(() => this._scenarios().length);
  readonly decisionCount = computed(() => this._progress().decisionHistory.length);
  readonly reputation = computed(() => this._progress().reputation);
  readonly techDebt = computed(() => this._progress().techDebt);
  readonly completedScenarioCount = computed(() => {
    const unique = new Set(this._progress().decisionHistory.map((entry) => entry.scenarioId));
    return unique.size;
  });
  readonly topSkillsByLevel = computed(() => {
    return [...this._skills()]
      .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
      .slice(0, 3);
  });
  readonly progressSeries = computed(() => {
    const ordered = [...this._progress().decisionHistory].sort((a, b) =>
      a.decidedAt.localeCompare(b.decidedAt),
    );
    let count = 0;
    return ordered.map((entry) => {
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
        scenarioTitle: scenario?.title ?? 'Unknown scenario',
        decisionText: decision?.text ?? 'Unknown decision',
        effects: decision?.effects ?? {},
      };
    });
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

    this.skillsApi.getSkills().subscribe({
      next: (skills) => {
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
      },
      error: () => {
        this._skillsError.set('Failed to load skills.');
        this._skills.set([]);
      },
    });

    this.scenariosApi.getScenarios().subscribe({
      next: (scenarios) => this._scenarios.set(scenarios),
      error: () => {
        this._scenariosError.set('Failed to load scenarios.');
        this._scenarios.set([]);
      },
    });
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
      isProfileComplete: true,
    });

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
    const result = applyDecisionEffects(this._skills(), this._progress(), decision.effects);
    this._skills.set(result.skills);
    this._progress.set(result.progress);
  }

  clearDecisionHistory(): void {
    this._progress.update((progress) => ({
      ...progress,
      decisionHistory: [],
    }));
  }

  incrementSkillLevel(skillId: string, delta = 1): void {
    const result = changeSkillLevel(this._skills(), skillId, delta);
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
  }

  canIncreaseSkill(skillId: string): boolean {
    return getIncreaseBlockReason(this._skills(), skillId) === null;
  }

  canDecreaseSkill(skillId: string): boolean {
    return getDecreaseBlockReason(this._skills(), skillId) === null;
  }

  getIncreaseBlockReason(skillId: string): string | null {
    return getIncreaseBlockReason(this._skills(), skillId);
  }

  getDecreaseBlockReason(skillId: string): string | null {
    return getDecreaseBlockReason(this._skills(), skillId);
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

  private mergeSkillLevels(
    skills: Skill[],
    persisted: Record<string, number>,
  ): Record<string, number> {
    const merged: Record<string, number> = {};

    for (const skill of skills) {
      const level = persisted[skill.id] ?? skill.level;
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
        role: stored.user.role ?? 'Unassigned',
        goals: stored.user.goals ?? [],
        startDate: stored.user.startDate ?? new Date().toISOString().slice(0, 10),
        isProfileComplete: stored.user.isProfileComplete ?? false,
      });
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

  private readStorage(): {
    version: number;
    user: Partial<User>;
    progress: Partial<Progress>;
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
    };
  }

  private isStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
