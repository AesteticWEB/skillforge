import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AnalyticsEventsStore } from '@/features/analytics';
import { NotificationsStore } from '@/features/notifications';
import { ErrorLogStore } from '@/shared/lib/errors';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { DomainEvent } from '@/shared/lib/events';

@Component({
  selector: 'app-settings-debug-page',
  imports: [CardComponent, ButtonComponent],
  templateUrl: './settings-debug.page.html',
  styleUrl: './settings-debug.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDebugPage {
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly analyticsStore = inject(AnalyticsEventsStore);
  private readonly errorLogStore = inject(ErrorLogStore);

  private readonly dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected readonly notifications = this.notificationsStore.notifications;

  protected readonly eventLog = this.analyticsStore.eventLog;
  protected readonly eventCounts = this.analyticsStore.counts;
  protected readonly eventCards = computed(() =>
    this.eventLog().map((event, index) => ({
      key: `${event.type}-${event.occurredAt}-${index}`,
      occurredAt: this.formatDate(event.occurredAt),
      type: event.type,
      summary: this.formatEvent(event),
    })),
  );

  protected readonly errorLog = this.errorLogStore.errorLog;
  protected readonly fatalError = this.errorLogStore.fatalError;

  protected clearNotifications(): void {
    this.notificationsStore.clear();
  }

  protected clearEvents(): void {
    this.analyticsStore.clear();
  }

  protected clearErrors(): void {
    this.errorLogStore.clearAll();
  }

  private formatEvent(event: DomainEvent): string {
    if (event.type === 'ProfileCreated') {
      return `role=${event.payload.user.role}`;
    }
    if (event.type === 'SkillUpgraded') {
      return `skill=${event.payload.skillId}, level=${event.payload.level}/${event.payload.maxLevel}`;
    }
    if (event.type === 'ScenarioCompleted') {
      return `scenario=${event.payload.scenarioId}, decision=${event.payload.decisionId}`;
    }
    return `stage=${event.payload.fromStage} -> ${event.payload.toStage}`;
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return this.dateFormatter.format(date);
  }
}
