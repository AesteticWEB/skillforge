import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '../../app/store/app.store';
import { Skill } from '../../entities/skill/model/skill.model';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { InputComponent } from '../../shared/ui/input/input.component';

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
  protected readonly skillNameById = computed(() => {
    const map = new Map<string, string>();
    for (const skill of this.skills()) {
      map.set(skill.id, skill.name);
    }
    return map;
  });
  protected readonly filteredSkills = computed(() => {
    const category = this.selectedCategory();
    if (category === 'All') {
      return this.skills();
    }
    return this.skills().filter((skill) => skill.category === category);
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

  protected formatDeps(skill: Skill): string {
    if (skill.deps.length === 0) {
      return 'None';
    }
    const map = this.skillNameById();
    return skill.deps.map((id) => map.get(id) ?? id).join(', ');
  }

  protected canIncrease(skillId: string): boolean {
    return this.store.canIncreaseSkill(skillId);
  }

  protected canDecrease(skillId: string): boolean {
    return this.store.canDecreaseSkill(skillId);
  }

  protected increaseBlockReason(skillId: string): string | null {
    return this.store.getIncreaseBlockReason(skillId);
  }
}
