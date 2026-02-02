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
  });

  readonly user = this._user.asReadonly();
  readonly skills = this._skills.asReadonly();
  readonly scenarios = this._scenarios.asReadonly();
  readonly progress = this._progress.asReadonly();

  readonly skillsCount = computed(() => this._skills().length);
  readonly scenariosCount = computed(() => this._scenarios().length);
  readonly decisionCount = computed(() => this._progress().decisionHistory.length);

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

  incrementSkillLevel(skillId: string, delta = 1): void {
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
      this._progress.set(stored.progress);
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

  private readStorage(): { version: number; user: User; progress: Progress } | null {
    if (!this.isStorageAvailable()) {
      return null;
    }

    const raw = localStorage.getItem(AppStore.STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { version: number; user: User; progress: Progress };
      if (parsed?.version !== AppStore.STORAGE_VERSION) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private isStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
