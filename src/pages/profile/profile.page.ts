import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { AnalyticsEventsStore } from '@/features/analytics';
import { AchievementsStore, SkillMasteryAchievement } from '@/features/achievements';
import { NotificationsStore } from '@/features/notifications';
import { PROFESSION_STAGE_SKILLS, SKILL_STAGE_LABELS, SKILL_STAGE_ORDER } from '@/shared/config';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { InputComponent } from '@/shared/ui/input';

type StageMasteryCard = {
  stageId: keyof typeof SKILL_STAGE_LABELS;
  stageLabel: string;
  masteredCount: number;
  total: number;
  achievements: SkillMasteryAchievement[];
};

@Component({
  selector: 'app-profile-page',
  imports: [CardComponent, ButtonComponent, InputComponent, EmptyStateComponent, NgClass],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);
  private readonly analyticsStore = inject(AnalyticsEventsStore);
  private readonly achievementsStore = inject(AchievementsStore);
  private readonly notifications = inject(NotificationsStore);

  protected readonly auth = this.store.auth;
  protected readonly user = this.store.user;
  protected readonly xp = this.store.xp;
  protected readonly careerProgress = this.store.careerProgress;
  protected readonly nextStageLabel = this.store.nextStageLabel;
  protected readonly canAdvanceStage = this.store.canAdvanceSkillStage;
  protected readonly stagePromotionReasons = this.store.stagePromotionReasons;
  protected readonly createdAt = computed(() => {
    const value = this.user().startDate?.trim() ?? '';
    return value.length > 0 ? value : null;
  });

  protected readonly skillMasteries = this.achievementsStore.skillMasteries;
  protected readonly hasMasteries = computed(() => this.skillMasteries().length > 0);
  protected readonly stageMasteryCards = computed<StageMasteryCard[]>(() => {
    const profession = this.auth().profession || this.user().role;
    const mapping =
      PROFESSION_STAGE_SKILLS[profession as keyof typeof PROFESSION_STAGE_SKILLS] ?? null;

    return SKILL_STAGE_ORDER.map((stageId) => {
      const stageSkills = mapping?.[stageId] ?? [];
      const achievements = this.skillMasteries().filter(
        (achievement) => achievement.stage === stageId,
      );
      const achievedIds = new Set(achievements.map((item) => item.skillId));
      const masteredCount = stageSkills.filter((id) => achievedIds.has(id)).length;

      return {
        stageId,
        stageLabel: SKILL_STAGE_LABELS[stageId],
        masteredCount,
        total: stageSkills.length,
        achievements,
      };
    });
  });

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly repeatPassword = signal('');
  protected readonly passwordBlockReason = computed(() => {
    if (this.newPassword().trim().length < 6) {
      return 'Минимум 6 символов';
    }
    if (this.newPassword() !== this.repeatPassword()) {
      return 'Пароли не совпадают';
    }
    return null;
  });
  protected readonly isPasswordDisabled = computed(() => this.passwordBlockReason() !== null);

  protected changePassword(): void {
    if (this.isPasswordDisabled()) {
      return;
    }

    this.currentPassword.set('');
    this.newPassword.set('');
    this.repeatPassword.set('');
    this.notifications.success('Пароль обновлён.');
  }

  protected advanceStage(): void {
    this.store.advanceSkillStage();
  }

  protected logout(): void {
    this.store.logout();
    this.analyticsStore.clear();
    this.achievementsStore.reset();
    void this.router.navigateByUrl('/');
  }

  protected createNewAccount(): void {
    const confirmed = window.confirm('Это удалит прогресс, XP, историю и достижения. Продолжить?');
    if (!confirmed) {
      return;
    }

    this.store.resetAll();
    this.analyticsStore.clear();
    this.achievementsStore.reset();
    void this.router.navigateByUrl('/');
  }
}
