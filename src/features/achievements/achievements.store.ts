import { Injectable, computed, inject, signal } from '@angular/core';
import { DomainEventBus, SkillUpgradedEvent } from '@/shared/lib/events';
import { Achievement, AchievementId } from './model/achievement.model';

type AchievementState = {
  achievements: Achievement[];
  streak: number;
  maxedSkills: Set<string>;
};

const createInitialState = (): AchievementState => ({
  achievements: [],
  streak: 0,
  maxedSkills: new Set<string>(),
});

@Injectable({ providedIn: 'root' })
export class AchievementsStore {
  private readonly eventBus = inject(DomainEventBus);
  private readonly state = signal<AchievementState>(createInitialState());

  readonly achievements = computed(() => this.state().achievements);
  readonly scenarioStreak = computed(() => this.state().streak);
  readonly maxedSkillsCount = computed(() => this.state().maxedSkills.size);

  constructor() {
    this.eventBus.subscribe('ProfileCreated', () => this.reset());
    this.eventBus.subscribe('ScenarioCompleted', () => this.handleScenarioCompleted());
    this.eventBus.subscribe('SkillUpgraded', (event) => this.handleSkillUpgraded(event));
  }

  private reset(): void {
    this.state.set(createInitialState());
  }

  private handleScenarioCompleted(): void {
    const nextStreak = this.state().streak + 1;
    this.state.update((current) => ({
      ...current,
      streak: nextStreak,
    }));

    if (nextStreak >= 5) {
      this.unlockAchievement(
        'streak-5',
        '5 scenarios in a row',
        'Complete five scenarios consecutively without interruption.',
      );
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

    if (nextMaxed.size >= 3) {
      this.unlockAchievement(
        'maxed-3',
        'Maxed 3 skills',
        'Reach the maximum level on three different skills.',
      );
    }
  }

  private unlockAchievement(id: AchievementId, title: string, description: string): void {
    const existing = this.state().achievements.some((achievement) => achievement.id === id);
    if (existing) {
      return;
    }

    const achievement: Achievement = {
      id,
      title,
      description,
      earnedAt: new Date().toISOString(),
    };

    this.state.update((current) => ({
      ...current,
      achievements: [...current.achievements, achievement],
    }));
  }
}
