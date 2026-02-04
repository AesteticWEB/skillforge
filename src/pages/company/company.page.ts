import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import type {
  Contract,
  ContractObjective,
  ContractReward,
  ContractType,
} from '@/entities/contracts';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';

const MAX_ACTIVE_CONTRACTS = 3;

const OBJECTIVE_LABELS: Record<ContractType, string> = {
  scenario: 'сценариев',
  exam: 'экзаменов',
  purchase: 'покупок',
  debt: 'техдолга',
};

@Component({
  selector: 'app-company-page',
  imports: [CardComponent, ButtonComponent, EmptyStateComponent],
  templateUrl: './company.page.html',
  styleUrl: './company.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyPage implements OnInit {
  private readonly store = inject(AppStore);
  private readonly numberFormatter = new Intl.NumberFormat('ru-RU');

  protected readonly availableContracts = this.store.availableContracts;
  protected readonly activeContracts = this.store.activeContracts;
  protected readonly companyUnlocked = this.store.companyUnlocked;
  protected readonly companyOnboardingSeen = this.store.companyOnboardingSeen;
  protected readonly stageLabel = this.store.stageLabel;
  protected readonly maxActiveContracts = MAX_ACTIVE_CONTRACTS;
  protected readonly activeCount = computed(() => this.activeContracts().length);
  protected readonly canAcceptMore = computed(
    () => this.activeContracts().length < MAX_ACTIVE_CONTRACTS,
  );

  ngOnInit(): void {
    if (this.companyUnlocked() && this.availableContracts().length === 0) {
      this.refreshAvailableContracts();
    }
  }

  protected refreshAvailableContracts(): void {
    this.store.refreshAvailableContracts();
  }

  protected acceptContract(contractId: string): void {
    this.store.acceptContract(contractId);
  }

  protected abandonContract(contractId: string): void {
    this.store.abandonContract(contractId);
  }

  protected dismissOnboarding(): void {
    this.store.setCompanyOnboardingSeen(true);
  }

  protected formatReward(reward: ContractReward): string {
    const coins = this.formatNumber(reward.coins);
    const cash = typeof reward.cash === 'number' ? ` (+${this.formatNumber(reward.cash)} кэш)` : '';
    return `+${coins} монет${cash}`;
  }

  protected formatObjectiveTarget(contract: Contract): string {
    return contract.objectives
      .map((objective) => this.formatObjectiveTargetItem(objective))
      .join(', ');
  }

  protected formatObjectiveProgress(contract: Contract): string {
    return contract.objectives
      .map((objective) => this.formatObjectiveProgressItem(objective))
      .join(', ');
  }

  private formatObjectiveTargetItem(objective: ContractObjective): string {
    const label = OBJECTIVE_LABELS[objective.type] ?? objective.type;
    return `${objective.targetValue} ${label}`;
  }

  private formatObjectiveProgressItem(objective: ContractObjective): string {
    const label = OBJECTIVE_LABELS[objective.type] ?? objective.type;
    return `${objective.currentValue}/${objective.targetValue} ${label}`;
  }

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return this.numberFormatter.format(Math.max(0, Math.floor(value)));
  }
}
