import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { COMPANY_LEVELS, CompanyLevel } from '@/entities/company';
import { AnalyticsEventsStore } from '@/features/analytics';
import { NotificationsStore } from '@/features/notifications';
import { BALANCE, SKILL_STAGE_LABELS, SKILL_STAGE_ORDER, type SkillStageId } from '@/shared/config';
import { ErrorLogStore } from '@/shared/lib/errors';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { DomainEvent } from '@/shared/lib/events';

const COMPANY_LEVEL_LABELS: Record<CompanyLevel, string> = {
  none: 'Нет',
  lead: 'Тимлид',
  manager: 'Менеджер',
  director: 'Директор',
  cto: 'CTO',
};

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
  private readonly numberFormatter = new Intl.NumberFormat('ru-RU');

  protected readonly devMode = isDevMode();
  protected readonly notifications = this.notificationsStore.notifications;
  protected readonly hasProfile = this.appStore.hasProfile;
  protected readonly backupAvailable = this.appStore.backupAvailable;
  protected readonly careerStage = this.appStore.careerStage;
  protected readonly stageLabel = this.appStore.stageLabel;
  protected readonly reputation = this.appStore.reputation;
  protected readonly techDebt = this.appStore.techDebt;
  protected readonly coins = this.appStore.coins;
  protected readonly company = this.appStore.company;
  protected readonly companyUnlocked = this.appStore.companyUnlocked;
  protected readonly companyCash = this.appStore.companyCash;
  protected readonly stageOptions = SKILL_STAGE_ORDER;
  protected readonly companyLevelOptions = COMPANY_LEVELS;
  protected readonly companyLevelLabels = COMPANY_LEVEL_LABELS;
  protected readonly selectedStage = signal<SkillStageId>(this.appStore.careerStage());
  protected readonly selectedCompanyLevel = signal<CompanyLevel>(this.appStore.company().level);
  protected readonly companyUnlockedInput = signal<boolean>(this.appStore.company().unlocked);
  protected readonly coinsInput = signal<string>(String(this.appStore.coins()));
  protected readonly cashInput = signal<string>(String(this.appStore.companyCash()));
  protected readonly reputationInput = signal<string>(String(this.appStore.reputation()));
  protected readonly techDebtInput = signal<string>(String(this.appStore.techDebt()));
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

  protected updateSelectedStage(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as SkillStageId | undefined;
    if (!value || !this.stageOptions.includes(value)) {
      return;
    }
    this.selectedStage.set(value);
  }

  protected updateCompanyUnlocked(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }
    this.companyUnlockedInput.set(Boolean(target.checked));
  }

  protected updateCompanyLevel(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as CompanyLevel | undefined;
    if (!value || !this.companyLevelOptions.includes(value)) {
      return;
    }
    this.selectedCompanyLevel.set(value);
  }

  protected updateCoinsInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.coinsInput.set(value);
  }

  protected updateCashInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.cashInput.set(value);
  }

  protected updateReputationInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.reputationInput.set(value);
  }

  protected updateTechDebtInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.techDebtInput.set(value);
  }

  protected applyCareerStage(): void {
    if (!this.devMode) {
      return;
    }
    this.appStore.setCareerStage(this.selectedStage());
    this.notificationsStore.success('Применено');
  }

  protected applyCompanySettings(): void {
    if (!this.devMode) {
      return;
    }
    this.appStore.setCompanyUnlocked(this.companyUnlockedInput());
    this.appStore.setCompanyLevel(this.selectedCompanyLevel());
    this.notificationsStore.success('Применено');
  }

  protected applyCoins(): void {
    if (!this.devMode) {
      return;
    }
    const value = this.parseNumber(this.coinsInput());
    if (value === null) {
      this.notifyInvalid();
      return;
    }
    this.appStore.setCoins(value);
    this.syncNumericInputs();
    this.notificationsStore.success('Применено');
  }

  protected addCoins(delta: number): void {
    if (!this.devMode) {
      return;
    }
    this.appStore.addCoins(delta);
    this.syncNumericInputs();
    this.notificationsStore.success(`Начислено +${this.formatNumber(delta)} монет`);
  }

  protected applyCash(): void {
    if (!this.devMode) {
      return;
    }
    const value = this.parseNumber(this.cashInput());
    if (value === null) {
      this.notifyInvalid();
      return;
    }
    this.appStore.setCompanyCash(value);
    this.syncNumericInputs();
    this.notificationsStore.success('Применено');
  }

  protected addCash(delta: number): void {
    if (!this.devMode) {
      return;
    }
    this.appStore.addCompanyCash(delta);
    this.syncNumericInputs();
    this.notificationsStore.success(`Начислено +${this.formatNumber(delta)} кэша`);
  }

  protected applyReputation(): void {
    if (!this.devMode) {
      return;
    }
    const value = this.parseNumber(this.reputationInput());
    if (value === null) {
      this.notifyInvalid();
      return;
    }
    this.appStore.setReputation(value);
    this.syncNumericInputs();
    this.notificationsStore.success('Применено');
  }

  protected addReputation(delta: number): void {
    if (!this.devMode) {
      return;
    }
    this.appStore.addReputation(delta);
    this.syncNumericInputs();
    this.notificationsStore.success(`Начислено +${this.formatNumber(delta)} репутации`);
  }

  protected applyTechDebt(): void {
    if (!this.devMode) {
      return;
    }
    const value = this.parseNumber(this.techDebtInput());
    if (value === null) {
      this.notifyInvalid();
      return;
    }
    this.appStore.setTechDebt(value);
    this.syncNumericInputs();
    this.notificationsStore.success('Применено');
  }

  protected addTechDebt(delta: number): void {
    if (!this.devMode) {
      return;
    }
    this.appStore.addTechDebt(delta);
    this.syncNumericInputs();
    this.notificationsStore.success(`Начислено +${this.formatNumber(delta)} техдолга`);
  }

  protected resetProgress(): void {
    if (!this.devMode) {
      return;
    }
    const confirmed = window.confirm(
      'Сбросить прогресс и сохранение? Это действие нельзя отменить.',
    );
    if (!confirmed) {
      return;
    }
    this.appStore.resetAll();
    this.notificationsStore.success('Прогресс сброшен');
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

  protected formatStageLabel(stage: SkillStageId): string {
    return SKILL_STAGE_LABELS[stage] ?? stage;
  }

  protected formatCompanyLevel(level: CompanyLevel): string {
    return this.companyLevelLabels[level] ?? level;
  }

  private parseNumber(value: string): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
  }

  private notifyInvalid(): void {
    this.notificationsStore.error('Некорректное значение');
  }

  private formatNumber(value: number): string {
    return this.numberFormatter.format(Math.floor(Math.abs(value)));
  }

  private syncNumericInputs(): void {
    this.coinsInput.set(String(this.coins()));
    this.cashInput.set(String(this.companyCash()));
    this.reputationInput.set(String(this.reputation()));
    this.techDebtInput.set(String(this.techDebt()));
  }
}

type BalanceSandboxRow = {
  step: number;
  coins: number;
  cash: number;
  reputation: number;
  techDebt: number;
};
