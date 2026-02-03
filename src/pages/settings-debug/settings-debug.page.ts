import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { AnalyticsEventsStore } from '@/features/analytics';
import { NotificationsStore } from '@/features/notifications';
import { BALANCE } from '@/shared/config';
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
  private readonly appStore = inject(AppStore);
  private readonly notificationsStore = inject(NotificationsStore);
  private readonly analyticsStore = inject(AnalyticsEventsStore);
  private readonly errorLogStore = inject(ErrorLogStore);

  private readonly dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected readonly notifications = this.notificationsStore.notifications;
  protected readonly hasProfile = this.appStore.hasProfile;
  protected readonly backupAvailable = this.appStore.backupAvailable;
  protected readonly companyCash = this.appStore.companyCash;
  protected readonly sandboxSteps = BALANCE.sandbox.steps;
  private readonly _sandboxRows = signal<BalanceSandboxRow[]>([]);
  protected readonly sandboxRows = this._sandboxRows.asReadonly();

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

  protected restoreBackup(): void {
    this.appStore.restoreBackup();
  }

  protected runBalanceSandbox(): void {
    if (!this.hasProfile()) {
      this._sandboxRows.set([]);
      return;
    }

    const { steps, starting, outcomes, coins, cash, reputation, techDebt } = BALANCE.sandbox;
    let currentCoins: number = starting.coins;
    let currentCash: number = starting.cash;
    let currentReputation: number = starting.reputation;
    let currentTechDebt: number = starting.techDebt;
    const totalWeight = outcomes.positive + outcomes.neutral + outcomes.negative;
    const rows: BalanceSandboxRow[] = [];

    const rollBetween = (min: number, max: number): number => {
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      return low + Math.floor(Math.random() * (high - low + 1));
    };

    for (let step = 1; step <= steps; step += 1) {
      let outcome: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (totalWeight > 0) {
        const roll = rollBetween(1, totalWeight);
        if (roll <= outcomes.positive) {
          outcome = 'positive';
        } else if (roll <= outcomes.positive + outcomes.neutral) {
          outcome = 'neutral';
        } else {
          outcome = 'negative';
        }
      }

      if (outcome === 'positive') {
        currentCoins += rollBetween(coins.gainMin, coins.gainMax);
        currentCash += rollBetween(cash.gainMin, cash.gainMax);
        currentReputation += rollBetween(reputation.gainMin, reputation.gainMax);
        currentTechDebt -= rollBetween(techDebt.reliefMin, techDebt.reliefMax);
      } else if (outcome === 'negative') {
        currentCoins -= rollBetween(coins.lossMin, coins.lossMax);
        currentCash -= rollBetween(cash.lossMin, cash.lossMax);
        currentReputation -= rollBetween(reputation.lossMin, reputation.lossMax);
        currentTechDebt += rollBetween(techDebt.gainMin, techDebt.gainMax);
      } else {
        currentCoins += rollBetween(coins.gainMin, coins.gainMax);
        currentCash += rollBetween(cash.gainMin, cash.gainMax);
        currentTechDebt += rollBetween(techDebt.gainMin, techDebt.gainMax);
      }

      currentCoins = Math.max(0, currentCoins);
      currentCash = Math.max(0, currentCash);

      rows.push({
        step,
        coins: currentCoins,
        cash: currentCash,
        reputation: currentReputation,
        techDebt: currentTechDebt,
      });
    }

    this._sandboxRows.set(rows);
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
    if (event.type === 'PurchaseMade') {
      const currency = event.payload.currency ?? 'coins';
      return `purchase=${event.payload.itemId}, price=${event.payload.price} ${currency}`;
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

type BalanceSandboxRow = {
  step: number;
  coins: number;
  cash: number;
  reputation: number;
  techDebt: number;
};
