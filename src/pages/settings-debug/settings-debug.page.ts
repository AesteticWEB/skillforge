import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { AnalyticsEventsStore } from '@/features/analytics';
import { AchievementsStore } from '@/features/achievements';
import { NotificationsStore } from '@/features/notifications';
import { FeatureFlagKey } from '@/shared/config';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { DomainEvent } from '@/shared/lib/events';

const FLAG_LABELS: Record<FeatureFlagKey, { title: string; description: string }> = {
  simulatorV2: {
    title: 'Simulator v2',
    description: 'Extend search to descriptions and show beta badge in simulator.',
  },
};

@Component({
  selector: 'app-settings-debug-page',
  imports: [CardComponent, ButtonComponent],
  templateUrl: './settings-debug.page.html',
  styleUrl: './settings-debug.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDebugPage {
  private readonly store = inject(AppStore);
  private readonly achievementsStore = inject(AchievementsStore);
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly analyticsStore = inject(AnalyticsEventsStore);

  protected readonly flags = this.store.featureFlags;
  protected readonly flagEntries = computed(
    () => Object.entries(this.flags()) as Array<[FeatureFlagKey, boolean]>,
  );
  protected readonly flagLabels = FLAG_LABELS;

  protected readonly achievements = this.achievementsStore.achievements;
  protected readonly scenarioStreak = this.achievementsStore.scenarioStreak;
  protected readonly maxedSkillsCount = this.achievementsStore.maxedSkillsCount;

  protected readonly notifications = this.notificationsStore.notifications;

  protected readonly eventLog = this.analyticsStore.eventLog;
  protected readonly eventCounts = this.analyticsStore.counts;
  protected readonly eventCards = computed(() =>
    this.eventLog().map((event, index) => ({
      key: `${event.type}-${event.occurredAt}-${index}`,
      occurredAt: event.occurredAt,
      type: event.type,
      summary: this.formatEvent(event),
    })),
  );

  protected toggleFlag(flag: FeatureFlagKey): void {
    this.store.toggleFeatureFlag(flag);
  }

  protected clearNotifications(): void {
    this.notificationsStore.clear();
  }

  protected clearEvents(): void {
    this.analyticsStore.clear();
  }

  private formatEvent(event: DomainEvent): string {
    if (event.type === 'ProfileCreated') {
      return `role=${event.payload.user.role}`;
    }
    if (event.type === 'SkillUpgraded') {
      return `skill=${event.payload.skillId}, level=${event.payload.level}/${event.payload.maxLevel}`;
    }
    return `scenario=${event.payload.scenarioId}, decision=${event.payload.decisionId}`;
  }
}
