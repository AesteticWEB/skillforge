import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { InputComponent } from '@/shared/ui/input';
import { PROFESSION_OPTIONS, SKILL_STAGE_LABELS, SKILL_STAGE_ORDER } from '@/shared/config';
import { SESSION_QUEST_BADGE_LABELS, type Quest } from '@/entities/quests';

@Component({
  selector: 'app-home-page',
  imports: [CardComponent, ButtonComponent, InputComponent, RouterLink, NgClass],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  protected readonly isLoginOpen = signal(false);
  protected readonly login = signal('');
  protected readonly password = signal('');
  protected readonly profession = signal('');
  protected readonly professionOptions = PROFESSION_OPTIONS;
  protected readonly hasProfile = this.store.hasProfile;
  protected readonly isRegistered = this.store.isRegistered;
  protected readonly auth = this.store.auth;
  protected readonly xp = this.store.xp;
  protected readonly sessionQuests = this.store.sessionQuests;
  protected readonly sessionQuestBadges = SESSION_QUEST_BADGE_LABELS;
  protected readonly allSessionQuestsClaimed = computed(
    () =>
      this.sessionQuests().length > 0 &&
      this.sessionQuests().every((quest) => quest.status === 'claimed'),
  );
  protected readonly sessionQuestCoinsEarned = computed(() =>
    this.sessionQuests()
      .filter((quest) => quest.status === 'claimed')
      .reduce((sum, quest) => sum + (quest.reward?.coins ?? 0), 0),
  );
  protected readonly careerProgress = this.store.careerProgress;
  protected readonly stageLabel = this.store.stageLabel;
  protected readonly careerStages = computed(() => {
    const currentStage = this.store.careerStage();
    const currentIndex = SKILL_STAGE_ORDER.indexOf(currentStage);
    return SKILL_STAGE_ORDER.map((stageId, index) => ({
      id: stageId,
      label: SKILL_STAGE_LABELS[stageId],
      isCurrent: index === currentIndex,
      isCompleted: index < currentIndex,
    }));
  });
  protected readonly loginBlockReason = computed(() => {
    if (this.login().trim().length === 0) {
      return 'Введите логин';
    }
    if (this.password().trim().length === 0) {
      return 'Введите пароль';
    }
    if (this.profession().trim().length === 0) {
      return 'Выберите профессию';
    }
    return null;
  });
  protected readonly isLoginDisabled = computed(() => this.loginBlockReason() !== null);

  protected openLogin(): void {
    this.isLoginOpen.set(true);
  }

  protected closeLogin(): void {
    this.isLoginOpen.set(false);
  }

  protected submitLogin(): void {
    if (this.isLoginDisabled()) {
      return;
    }

    const registered = this.store.register(this.login(), this.password(), this.profession());
    if (registered) {
      this.password.set('');
      this.isLoginOpen.set(false);
    }
  }

  protected startOnboarding(): void {
    void this.router.navigateByUrl('/onboarding');
  }

  protected setProfession(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.profession.set(target?.value ?? '');
  }

  protected questStatusLabel(quest: Quest): string {
    return quest.status === 'claimed' ? 'Выполнено' : 'В процессе';
  }

  protected badgeLabel(badgeId: string): string {
    return this.sessionQuestBadges[badgeId] ?? badgeId;
  }
}
