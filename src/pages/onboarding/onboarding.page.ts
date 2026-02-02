import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { InputComponent } from '@/shared/ui/input';

const ROLE_OPTIONS = ['Фронтенд-инженер', 'Фуллстек-инженер', 'Техлид', 'Руководитель разработки'];

@Component({
  selector: 'app-onboarding-page',
  imports: [CardComponent, InputComponent, ButtonComponent],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  protected readonly skills = this.store.skills;
  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly role = signal(ROLE_OPTIONS[0]);
  protected readonly goal = signal('');
  protected readonly selectedSkillIds = signal<string[]>([]);
  protected readonly selectedCount = computed(() => this.selectedSkillIds().length);
  protected readonly canSubmit = computed(
    () =>
      this.role().trim().length > 0 &&
      this.goal().trim().length > 0 &&
      this.selectedSkillIds().length === 3,
  );

  protected toggleSkill(skillId: string): void {
    this.selectedSkillIds.update((current) => {
      if (current.includes(skillId)) {
        return current.filter((id) => id !== skillId);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, skillId];
    });
  }

  protected setRole(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.role.set(target?.value ?? '');
  }

  protected isSelected(skillId: string): boolean {
    return this.selectedSkillIds().includes(skillId);
  }

  protected createProfile(event?: Event): void {
    event?.preventDefault();
    if (!this.canSubmit()) {
      return;
    }

    this.store.createProfile(this.role(), this.goal(), this.selectedSkillIds());
    void this.router.navigateByUrl('/skills');
  }

  protected resetForm(): void {
    this.role.set(ROLE_OPTIONS[0]);
    this.goal.set('');
    this.selectedSkillIds.set([]);
  }
}
