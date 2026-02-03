import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { AnalyticsEventsStore } from '@/features/analytics';
import { NotificationsStore } from '@/features/notifications';
import { FeatureFlagKey } from '@/shared/config';
import { ErrorLogStore } from '@/shared/lib/errors';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { DomainEvent } from '@/shared/lib/events';

type DebugFlagKey = Exclude<FeatureFlagKey, 'demoMode'>;

const DEBUG_FLAGS: DebugFlagKey[] = ['simulatorV2'];

const FLAG_LABELS: Record<DebugFlagKey, { title: string; description: string }> = {
  simulatorV2: {
    title: 'Симулятор v2',
    description: 'Поиск по описанию и отметка beta в списке сценариев.',
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
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly analyticsStore = inject(AnalyticsEventsStore);
  private readonly errorLogStore = inject(ErrorLogStore);

  protected readonly flags = this.store.featureFlags;
  protected readonly flagEntries = computed(() =>
    DEBUG_FLAGS.map((flag) => [flag, this.flags()[flag]] as const),
  );
  protected readonly flagLabels = FLAG_LABELS;

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

  protected readonly errorLog = this.errorLogStore.errorLog;
  protected readonly fatalError = this.errorLogStore.fatalError;

  protected readonly stateSnapshot = computed(() => ({
    user: this.store.user(),
    progress: this.store.progress(),
    featureFlags: this.store.featureFlags(),
    auth: this.store.auth(),
    xp: this.store.xp(),
    skills: this.store.skills(),
    scenarios: this.store.scenarios(),
  }));
  protected readonly stateSnapshotText = computed(() =>
    JSON.stringify(this.stateSnapshot(), null, 2),
  );

  protected readonly exportText = signal('');
  protected readonly importText = signal('');
  protected readonly importStatus = signal<string | null>(null);

  protected toggleFlag(flag: DebugFlagKey): void {
    this.store.toggleFeatureFlag(flag);
  }

  protected clearNotifications(): void {
    this.notificationsStore.clear();
  }

  protected clearEvents(): void {
    this.analyticsStore.clear();
  }

  protected clearErrors(): void {
    this.errorLogStore.clearAll();
  }

  protected exportState(): void {
    this.exportText.set(this.store.exportState());
  }

  protected downloadState(): void {
    const data = this.store.exportState();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'skillforge-state.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected async copyState(): Promise<void> {
    const data = this.store.exportState();
    try {
      await navigator.clipboard.writeText(data);
      this.importStatus.set('Экспорт скопирован в буфер.');
      this.notificationsStore.success('Экспорт скопирован в буфер.');
    } catch {
      this.importStatus.set('Не удалось скопировать экспорт.');
      this.notificationsStore.error('Не удалось скопировать экспорт.');
    }
  }

  protected importState(): void {
    const result = this.store.importState(this.importText());
    if (result.ok) {
      this.importStatus.set('Импорт завершён.');
      this.importText.set('');
      this.notificationsStore.success('Импорт завершён.');
      return;
    }
    this.importStatus.set(result.error ?? 'Импорт не выполнен.');
    this.errorLogStore.capture(result.error ?? 'Импорт не выполнен.', 'import', false);
    this.notificationsStore.error(result.error ?? 'Импорт не выполнен.');
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
}
