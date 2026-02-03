import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { getMissingDependencies } from '@/entities/skill';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { SkeletonComponent } from '@/shared/ui/skeleton';

@Component({
  selector: 'app-skills-page',
  imports: [CardComponent, ButtonComponent, EmptyStateComponent, SkeletonComponent, NgClass],
  templateUrl: './skills.page.html',
  styleUrl: './skills.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsPage {
  private readonly store = inject(AppStore);
  protected readonly skillsError = this.store.skillsError;
  protected readonly skillsLoading = this.store.skillsLoading;
  protected readonly totalXp = this.store.xp;
  protected readonly spentXpOnSkills = this.store.spentXpOnSkills;
  protected readonly availableXpForSkills = this.store.availableXpForSkills;
  protected readonly stageLabel = this.store.stageLabel;
  protected readonly stageSkillProgress = this.store.stageSkillProgress;
  protected readonly stageScenarioProgress = this.store.stageScenarioProgress;
  protected readonly nextStageLabel = this.store.nextStageLabel;
  protected readonly canAdvanceStage = this.store.canAdvanceSkillStage;
  protected readonly stagePromotionReasons = this.store.stagePromotionReasons;
  protected readonly stageSkills = this.store.stageSkills;
  protected readonly selectedCategory = signal<string>('Все');
  private readonly categoryIcons: Record<string, string> = {
    Инженерия: '🛠️',
    Продукт: '🎯',
    Лидерство: '🧭',
    Data: '📊',
    Безопасность: '🛡️',
    Геймдев: '🎮',
  };
  protected readonly professionTitle = computed(() => {
    const auth = this.store.auth();
    return auth.profession || this.store.user().role || 'Профессия';
  });
  protected readonly coreSkillsCount = computed(() => this.stageSkills().length);
  protected readonly categories = computed(() => {
    const unique = new Set(this.stageSkills().map((skill) => skill.category));
    return ['Все', ...Array.from(unique).sort()];
  });
  protected readonly filteredSkills = computed(() => {
    const category = this.selectedCategory();
    const skills = this.stageSkills();
    if (category === 'Все' || !skills.some((skill) => skill.category === category)) {
      return skills;
    }
    return skills.filter((skill) => skill.category === category);
  });
  protected readonly skillCards = computed(() => {
    const allSkills = this.store.skills();
    const nameById = new Map(allSkills.map((skill) => [skill.id, skill.name]));

    return this.filteredSkills().map((skill) => {
      const deps = skill.deps.map((id) => nameById.get(id) ?? id);
      const missingDeps = getMissingDependencies(skill, allSkills);
      const progressPercent =
        skill.maxLevel > 0 ? Math.round((skill.level / skill.maxLevel) * 100) : 0;
      const upgradeMeta = this.store.getSkillUpgradeMeta(skill.id);
      const canIncrease = upgradeMeta.canIncrease;
      const canDecrease = this.store.canDecreaseSkill(skill.id);
      const increaseReason = upgradeMeta.reason;
      const decreaseReason = this.store.getDecreaseBlockReason(skill.id);
      const icon = this.categoryIcons[skill.category] ?? '✨';
      const nextCost = upgradeMeta.cost;
      const nextCostLabel = nextCost === null ? 'Максимальный уровень' : `${nextCost} XP`;

      return {
        ...skill,
        deps,
        missingDeps,
        progressPercent,
        canIncrease,
        canDecrease,
        increaseReason,
        decreaseReason,
        icon,
        nextCost,
        nextCostLabel,
      };
    });
  });

  protected incrementSkill(skillId: string): void {
    this.store.incrementSkillLevel(skillId);
  }

  protected decrementSkill(skillId: string): void {
    this.store.incrementSkillLevel(skillId, -1);
  }

  protected setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  protected advanceStage(): void {
    this.store.advanceSkillStage();
  }
}
