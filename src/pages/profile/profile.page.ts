import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { AnalyticsEventsStore } from '@/features/analytics';
import { AchievementsStore, ACHIEVEMENTS_CATALOG, AchievementId } from '@/features/achievements';
import { NotificationsStore } from '@/features/notifications';
import { RANK_STAGES } from '@/shared/lib/rank';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { InputComponent } from '@/shared/ui/input';

type AchievementCard = {
  id: AchievementId;
  title: string;
  description: string;
  earnedAt: string | null;
  isEarned: boolean;
};

@Component({
  selector: 'app-profile-page',
  imports: [CardComponent, ButtonComponent, InputComponent, EmptyStateComponent],
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
  protected readonly rankStages = RANK_STAGES;
  protected readonly rankProgress = this.store.rankProgress;
  protected readonly createdAt = computed(() => {
    const value = this.user().startDate?.trim() ?? '';
    return value.length > 0 ? value : null;
  });

  protected readonly achievements = this.achievementsStore.achievements;
  protected readonly hasAchievements = computed(() => this.achievements().length > 0);
  protected readonly achievementCards = computed<AchievementCard[]>(() => {
    const earnedMap = new Map(
      this.achievements().map((achievement) => [achievement.id, achievement]),
    );

    return ACHIEVEMENTS_CATALOG.map((definition) => {
      const earned = earnedMap.get(definition.id);
      return {
        ...definition,
        earnedAt: earned?.earnedAt ?? null,
        isEarned: Boolean(earned),
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
