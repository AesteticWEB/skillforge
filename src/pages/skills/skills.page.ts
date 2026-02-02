import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { InputComponent } from '@/shared/ui/input';

@Component({
  selector: 'app-skills-page',
  imports: [CardComponent, InputComponent, ButtonComponent, NgClass],
  templateUrl: './skills.page.html',
  styleUrl: './skills.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsPage {
  private readonly store = inject(AppStore);
  protected readonly skillsCount = this.store.skillsCount;
  protected readonly skills = this.store.skills;
  protected readonly skillsError = this.store.skillsError;
  protected readonly selectedCategory = signal<string>('All');
  protected readonly categories = computed(() => {
    const unique = new Set(this.skills().map((skill) => skill.category));
    return ['All', ...Array.from(unique).sort()];
  });
  protected readonly filteredSkills = computed(() => {
    const category = this.selectedCategory();
    if (category === 'All') {
      return this.skills();
    }
    return this.skills().filter((skill) => skill.category === category);
  });
  protected readonly skillCards = computed(() => {
    const nameById = new Map(this.skills().map((skill) => [skill.id, skill.name]));

    return this.filteredSkills().map((skill) => {
      const depsText =
        skill.deps.length === 0
          ? 'None'
          : skill.deps.map((id) => nameById.get(id) ?? id).join(', ');
      const canIncrease = this.store.canIncreaseSkill(skill.id);
      const canDecrease = this.store.canDecreaseSkill(skill.id);
      const blockReason = this.store.getIncreaseBlockReason(skill.id);

      return {
        ...skill,
        depsText,
        canIncrease,
        canDecrease,
        blockReason,
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
