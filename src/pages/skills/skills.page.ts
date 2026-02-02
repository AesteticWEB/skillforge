import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { getMissingDependencies } from '@/entities/skill';
import { PROFESSION_CORE_SKILLS } from '@/shared/config';
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
  protected readonly skills = this.store.skills;
  protected readonly skillsError = this.store.skillsError;
  protected readonly skillsLoading = this.store.skillsLoading;
  protected readonly totalXp = this.store.xp;
  protected readonly spentXpOnSkills = this.store.spentXpOnSkills;
  protected readonly availableXpForSkills = this.store.availableXpForSkills;
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
  protected readonly coreSkillIds = computed(() => {
    const profession = this.professionTitle();
    return PROFESSION_CORE_SKILLS[profession as keyof typeof PROFESSION_CORE_SKILLS] ?? [];
  });
  protected readonly coreSkills = computed(() => {
    const ids = new Set(this.coreSkillIds());
    return this.skills().filter((skill) => ids.has(skill.id));
  });
  protected readonly coreSkillsCount = computed(() => this.coreSkills().length);
  protected readonly categories = computed(() => {
    const unique = new Set(this.coreSkills().map((skill) => skill.category));
    return ['Все', ...Array.from(unique).sort()];
  });
  protected readonly filteredSkills = computed(() => {
    const category = this.selectedCategory();
    const skills = this.coreSkills();
    if (category === 'Все' || !skills.some((skill) => skill.category === category)) {
      return skills;
    }
    return skills.filter((skill) => skill.category === category);
  });
  protected readonly skillCards = computed(() => {
    const skills = this.skills();
    const nameById = new Map(skills.map((skill) => [skill.id, skill.name]));

    return this.filteredSkills().map((skill) => {
      const deps = skill.deps.map((id) => nameById.get(id) ?? id);
      const missingDeps = getMissingDependencies(skill, skills);
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
}
