import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { InputComponent } from '@/shared/ui/input';
import { PROFESSION_OPTIONS, SKILL_STAGE_LABELS, SKILL_STAGE_ORDER } from '@/shared/config';
import { SESSION_QUEST_BADGE_LABELS, type Quest } from '@/entities/quests';
import { getNextBestAction, type NextAction } from './next-action';

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
  protected readonly authMode = signal<'register' | 'login'>('register');
  protected readonly login = signal('');
  protected readonly password = signal('');
  protected readonly profession = signal('');
  protected readonly authError = signal<string | null>(null);
  protected readonly authSubmitting = signal(false);
  protected readonly professionOptions = PROFESSION_OPTIONS;
  protected readonly hasProfile = this.store.hasProfile;
  protected readonly isRegistered = this.store.isRegistered;
  protected readonly auth = this.store.auth;
  protected readonly xp = this.store.xp;
  protected readonly sessionQuests = this.store.sessionQuests;
  protected readonly sessionQuestBadges = SESSION_QUEST_BADGE_LABELS;
  protected readonly quickFixContract = this.store.quickFixContract;
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
  protected readonly nextAction = computed<NextAction>(() => {
    const meta = this.store.progress().meta ?? { isNewGamePlus: false, ngPlusCount: 0 };
    return getNextBestAction({
      isRegistered: this.isRegistered(),
      onboardingCompleted: this.store.onboardingCompleted(),
      stageScenarioProgress: this.store.stageScenarioProgress(),
      stageSkillProgress: this.store.stageSkillProgress(),
      promotionGate: this.store.stagePromotionGate(),
      canAdvanceStage: this.store.canAdvanceSkillStage(),
      companyUnlocked: this.store.companyUnlocked(),
      availableContractsCount: this.store.availableContracts().length,
      careerStage: this.store.careerStage(),
      endingResolved: Boolean(this.store.ending().last),
      isNewGamePlus: meta.isNewGamePlus ?? false,
      ngPlusCount: meta.ngPlusCount ?? 0,
    });
  });
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
    const login = this.login().trim();
    const password = this.password().trim();
    if (login.length === 0) {
      return '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043B\u043E\u0433\u0438\u043D';
    }
    if (!this.isValidLogin(login)) {
      return '\u041b\u043e\u0433\u0438\u043d: 3-32 \u0441\u0438\u043c\u0432\u043e\u043b\u0430, \u043b\u0430\u0442\u0438\u043d\u0438\u0446\u0430/\u0446\u0438\u0444\u0440\u044b/._-';
    }
    if (password.length === 0) {
      return '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C';
    }
    if (!this.isValidPassword(password)) {
      return '\u041f\u0430\u0440\u043e\u043b\u044c: 10-128 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432, \u0431\u0443\u043a\u0432\u0430 \u0438 \u0446\u0438\u0444\u0440\u0430';
    }
    if (this.authMode() === 'register' && this.profession().trim().length === 0) {
      return '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044E';
    }
    return null;
  });
  protected readonly isLoginDisabled = computed(
    () => this.loginBlockReason() !== null || this.authSubmitting(),
  );

  protected openLogin(mode: 'register' | 'login' = 'register'): void {
    this.authMode.set(mode);
    this.authError.set(null);
    this.isLoginOpen.set(true);
  }

  protected closeLogin(): void {
    this.isLoginOpen.set(false);
    this.authError.set(null);
  }

  protected async submitLogin(): Promise<void> {
    if (this.isLoginDisabled()) {
      return;
    }
    this.authError.set(null);
    this.authSubmitting.set(true);

    const result =
      this.authMode() === 'register'
        ? await this.store.registerRemote(this.login(), this.password(), this.profession())
        : await this.store.loginRemote(this.login(), this.password());

    this.authSubmitting.set(false);
    if (result.ok) {
      this.password.set('');
      this.isLoginOpen.set(false);
      const action = this.nextAction();
      if (action?.route) {
        void this.router.navigateByUrl(action.route);
      }
      return;
    }
    const fallback =
      this.authMode() === 'register'
        ? '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442'
        : '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C';
    this.authError.set(result.error ?? fallback);
  }

  protected startOnboarding(): void {
    void this.router.navigateByUrl('/onboarding');
  }

  protected goToNextAction(): void {
    const action = this.nextAction();
    if (!this.isRegistered() && action.id === 'create-profile') {
      this.openLogin('register');
    }
    void this.router.navigate([action.route]);
  }

  protected completeQuickFix(): void {
    this.store.completeQuickFixContract();
  }

  protected setProfession(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.profession.set(target?.value ?? '');
  }

  private isValidLogin(login: string): boolean {
    return /^[a-zA-Z0-9._-]{3,32}$/.test(login);
  }

  private isValidPassword(password: string): boolean {
    if (password.length < 10 || password.length > 128) {
      return false;
    }
    return /^(?=.*[A-Za-z])(?=.*\d).+$/.test(password);
  }

  protected questStatusLabel(quest: Quest): string {
    return quest.status === 'claimed' ? 'Выполнено' : 'В процессе';
  }

  protected badgeLabel(badgeId: string): string {
    return this.sessionQuestBadges[badgeId] ?? badgeId;
  }
}
