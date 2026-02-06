import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DomainEventBus, SkillUpgradedEvent } from '@/shared/lib/events';
import {
  Achievement,
  AchievementId,
  ACHIEVEMENTS_CATALOG,
  SkillMasteryAchievement,
} from './model/achievement.model';

type AchievementState = {
  achievements: Achievement[];
  skillMasteries: SkillMasteryAchievement[];
  streak: number;
  maxedSkills: Set<string>;
};

type AchievementStoragePayload = {
  version: number;
  achievements: Achievement[];
  skillMasteries: SkillMasteryAchievement[];
  streak: number;
  maxedSkills: string[];
};

const STORAGE_KEY = 'skillforge.achievements.v1';
const STORAGE_VERSION = 1;

const createInitialState = (): AchievementState => ({
  achievements: [],
  skillMasteries: [],
  streak: 0,
  maxedSkills: new Set<string>(),
});

const ACHIEVEMENT_LOOKUP = new Map(
  ACHIEVEMENTS_CATALOG.map((achievement) => [achievement.id, achievement]),
);

@Injectable({ providedIn: 'root' })
export class AchievementsStore {
  private readonly eventBus = inject(DomainEventBus);
  private readonly state = signal<AchievementState>(createInitialState());
  private hasHydrated = false;

  readonly achievements = computed(() => this.state().achievements);
  readonly skillMasteries = computed(() => this.state().skillMasteries);
  readonly scenarioStreak = computed(() => this.state().streak);
  readonly maxedSkillsCount = computed(() => this.state().maxedSkills.size);

  constructor() {
    this.hydrateFromStorage();
    this.hasHydrated = true;
    effect(() => {
      if (!this.hasHydrated) {
        return;
      }
      this.persistToStorage();
    });

    this.eventBus.subscribe('ProfileCreated', () => this.reset());
    this.eventBus.subscribe('ScenarioCompleted', () => this.handleScenarioCompleted());
    this.eventBus.subscribe('SkillUpgraded', (event) => this.handleSkillUpgraded(event));
  }

  reset(): void {
    this.state.set(createInitialState());
    this.clearStorage();
  }

  grantAchievement(id: string): void {
    if (!ACHIEVEMENT_LOOKUP.has(id as AchievementId)) {
      return;
    }
    this.unlockAchievement(id as AchievementId);
  }

  private handleScenarioCompleted(): void {
    const nextStreak = this.state().streak + 1;
    this.state.update((current) => ({
      ...current,
      streak: nextStreak,
    }));

    if (nextStreak >= 5) {
      this.unlockAchievement('streak-5');
    }
  }

  private handleSkillUpgraded(event: SkillUpgradedEvent): void {
    const { skillId, level, previousLevel, maxLevel } = event.payload;
    if (previousLevel >= maxLevel || level < maxLevel) {
      return;
    }

    const nextMaxed = new Set(this.state().maxedSkills);
    if (!nextMaxed.has(skillId)) {
      nextMaxed.add(skillId);
      this.state.update((current) => ({
        ...current,
        maxedSkills: nextMaxed,
      }));
    }

    this.addSkillMastery(event);

    if (nextMaxed.size >= 3) {
      this.unlockAchievement('maxed-3');
    }
  }

  private addSkillMastery(event: SkillUpgradedEvent): void {
    const { skillId, skillName, skillStage, profession } = event.payload;
    const resolvedStage = skillStage ?? 'internship';
    const resolvedProfession = profession ?? 'Unknown';
    const existing = this.state().skillMasteries.some(
      (achievement) =>
        achievement.skillId === skillId &&
        achievement.stage === resolvedStage &&
        achievement.profession === resolvedProfession,
    );
    if (existing) {
      return;
    }

    const mastery: SkillMasteryAchievement = {
      type: 'skill_mastered',
      skillId,
      skillName: skillName ?? skillId,
      stage: resolvedStage,
      profession: resolvedProfession,
      earnedAt: new Date().toISOString(),
    };

    this.state.update((current) => ({
      ...current,
      skillMasteries: [...current.skillMasteries, mastery],
    }));
  }

  private unlockAchievement(id: AchievementId): void {
    const existing = this.state().achievements.some((achievement) => achievement.id === id);
    if (existing) {
      return;
    }

    const definition = ACHIEVEMENT_LOOKUP.get(id);
    if (!definition) {
      return;
    }

    const achievement: Achievement = {
      id,
      title: definition.title,
      description: definition.description,
      earnedAt: new Date().toISOString(),
    };

    this.state.update((current) => ({
      ...current,
      achievements: [...current.achievements, achievement],
    }));
  }

  private hydrateFromStorage(): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AchievementStoragePayload> | null;
      if (!parsed || parsed.version !== STORAGE_VERSION) {
        return;
      }
      const achievements = Array.isArray(parsed.achievements)
        ? parsed.achievements.filter((entry) => this.isAchievement(entry))
        : [];
      const skillMasteries = Array.isArray(parsed.skillMasteries)
        ? parsed.skillMasteries.filter((entry) => this.isSkillMastery(entry))
        : [];
      const streak = typeof parsed.streak === 'number' ? parsed.streak : 0;
      const maxedSkills = Array.isArray(parsed.maxedSkills)
        ? new Set(parsed.maxedSkills.filter((value) => typeof value === 'string'))
        : new Set(skillMasteries.map((entry) => entry.skillId));

      this.state.set({
        achievements,
        skillMasteries,
        streak,
        maxedSkills,
      });
    } catch {
      return;
    }
  }

  private persistToStorage(): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    const payload: AchievementStoragePayload = {
      version: STORAGE_VERSION,
      achievements: this.state().achievements,
      skillMasteries: this.state().skillMasteries,
      streak: this.state().streak,
      maxedSkills: Array.from(this.state().maxedSkills),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      void 0;
    }
  }

  private clearStorage(): void {
    if (!this.isStorageAvailable()) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }

  private isStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isAchievement(value: unknown): value is Achievement {
    if (!this.isRecord(value)) {
      return false;
    }
    return (
      typeof value['id'] === 'string' &&
      typeof value['title'] === 'string' &&
      typeof value['description'] === 'string' &&
      typeof value['earnedAt'] === 'string'
    );
  }

  private isSkillMastery(value: unknown): value is SkillMasteryAchievement {
    if (!this.isRecord(value)) {
      return false;
    }
    return (
      value['type'] === 'skill_mastered' &&
      typeof value['skillId'] === 'string' &&
      typeof value['skillName'] === 'string' &&
      typeof value['stage'] === 'string' &&
      typeof value['profession'] === 'string' &&
      typeof value['earnedAt'] === 'string'
    );
  }
}
