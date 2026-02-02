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
  protected readonly skillsCount = this.store.skillsCount;
  protected readonly skills = this.store.skills;
  protected readonly skillsError = this.store.skillsError;
  protected readonly skillsLoading = this.store.skillsLoading;
  protected readonly selectedCategory = signal<string>('Все');
  private readonly categoryIcons: Record<string, string> = {
    Инженерия: '🛠️',
    Продукт: '🎯',
    Лидерство: '🧭',
  };
  protected readonly categories = computed(() => {
    const unique = new Set(this.skills().map((skill) => skill.category));
    return ['Все', ...Array.from(unique).sort()];
  });
  protected readonly filteredSkills = computed(() => {
    const category = this.selectedCategory();
    if (category === 'Все') {
      return this.skills();
    }
    return this.skills().filter((skill) => skill.category === category);
  });
  protected readonly skillCards = computed(() => {
    const nameById = new Map(this.skills().map((skill) => [skill.id, skill.name]));

    return this.filteredSkills().map((skill) => {
      const deps = skill.deps.map((id) => nameById.get(id) ?? id);
      const missingDeps = getMissingDependencies(skill, this.skills());
      const progressPercent =
        skill.maxLevel > 0 ? Math.round((skill.level / skill.maxLevel) * 100) : 0;
      const canIncrease = this.store.canIncreaseSkill(skill.id);
      const canDecrease = this.store.canDecreaseSkill(skill.id);
      const increaseReason = this.store.getIncreaseBlockReason(skill.id);
      const decreaseReason = this.store.getDecreaseBlockReason(skill.id);
      const icon = this.categoryIcons[skill.category] ?? '✨';

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
