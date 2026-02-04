import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import type {
  Contract,
  ContractObjective,
  ContractReward,
  ContractType,
} from '@/entities/contracts';
import {
  ASSIGNMENT_LABELS,
  ASSIGNMENT_OPTIONS,
  CompanyLedgerReason,
  EmployeeAssignment,
  getCompanyModifiersFromAssignments,
} from '@/entities/company';
import type { IncidentDecision, IncidentDecisionId, IncidentSeverity } from '@/entities/incidents';
import { HiringCandidatesPanelComponent } from '@/features/hiring';
import type { CandidateRole } from '@/features/hiring';
import { BALANCE } from '@/shared/config';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { ModalComponent } from '@/shared/ui/modal';

const MAX_ACTIVE_CONTRACTS = 3;

const OBJECTIVE_LABELS: Record<ContractType, string> = {
  scenario: 'сценариев',
  exam: 'экзаменов',
  purchase: 'покупок',
  debt: 'техдолга',
};

const ROLE_LABELS: Record<CandidateRole, string> = {
  junior: 'Джуниор',
  middle: 'Миддл',
  senior: 'Сеньор',
};

const LEDGER_REASON_LABELS: Record<CompanyLedgerReason, string> = {
  scenario: 'Сценарий',
  exam: 'Экзамен',
  manual: 'Ручной',
  incident: 'Инцидент',
};

const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  minor: 'Мелкий',
  major: 'Крупный',
  critical: 'Критический',
};

@Component({
  selector: 'app-company-page',
  imports: [
    CardComponent,
    ButtonComponent,
    EmptyStateComponent,
    HiringCandidatesPanelComponent,
    ModalComponent,
  ],
  templateUrl: './company.page.html',
  styleUrl: './company.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyPage implements OnInit {
  private readonly store = inject(AppStore);
  private readonly numberFormatter = new Intl.NumberFormat('ru-RU');
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected readonly availableContracts = this.store.availableContracts;
  protected readonly activeContracts = this.store.activeContracts;
  protected readonly candidatesPool = this.store.candidatesPool;
  protected readonly company = this.store.company;
  protected readonly activeIncident = computed(() => this.company().activeIncident);
  protected readonly incidentTitle = computed(() => {
    const incident = this.activeIncident();
    return incident ? `Инцидент: ${incident.title}` : '';
  });
  protected readonly companyUnlocked = this.store.companyUnlocked;
  protected readonly companyOnboardingSeen = this.store.companyOnboardingSeen;
  protected readonly stageLabel = this.store.stageLabel;
  protected readonly companyCash = this.store.companyCash;
  protected readonly coins = this.store.coins;
  protected readonly hiringRefreshCost = BALANCE.hiring?.refreshCostCoins ?? 200;
  protected readonly maxActiveContracts = MAX_ACTIVE_CONTRACTS;
  protected readonly activeCount = computed(() => this.activeContracts().length);
  protected readonly canAcceptMore = computed(
    () => this.activeContracts().length < MAX_ACTIVE_CONTRACTS,
  );
  protected readonly employees = computed(() => this.company().employees ?? []);
  protected readonly hiredCandidateIds = computed(() =>
    this.employees().map((employee) => employee.id),
  );
  protected readonly assignmentOptions = ASSIGNMENT_OPTIONS;
  protected readonly assignmentSummary = computed(() =>
    getCompanyModifiersFromAssignments(this.employees()),
  );
  private readonly ledgerVisibleCount = signal(10);
  protected readonly companyLedger = computed(() => this.company().ledger ?? []);
  protected readonly visibleLedger = computed(() =>
    this.companyLedger().slice(0, this.ledgerVisibleCount()),
  );
  protected readonly canShowMoreLedger = computed(
    () => this.companyLedger().length > this.ledgerVisibleCount(),
  );

  ngOnInit(): void {
    if (this.companyUnlocked() && this.availableContracts().length === 0) {
      this.refreshAvailableContracts();
    }
    if (this.companyUnlocked() && this.candidatesPool().length === 0) {
      this.initCandidates();
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

  protected initCandidates(): void {
    this.store.initCandidatesIfEmpty();
  }

  protected refreshCandidates(): void {
    this.store.refreshCandidates();
  }

  protected hireCandidate(candidateId: string): void {
    this.store.hireCandidate(candidateId);
  }

  protected updateAssignment(employeeId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value as
      | EmployeeAssignment
      | undefined;
    if (!value) {
      return;
    }
    this.store.setEmployeeAssignment(employeeId, value);
  }

  protected dismissOnboarding(): void {
    this.store.setCompanyOnboardingSeen(true);
  }

  protected showMoreLedger(): void {
    const next = Math.min(this.companyLedger().length, this.ledgerVisibleCount() + 10);
    this.ledgerVisibleCount.set(next);
  }

  protected resolveIncidentDecision(decisionId: IncidentDecisionId): void {
    this.store.resolveIncident(decisionId);
  }

  protected formatIncidentSeverity(severity: IncidentSeverity): string {
    return INCIDENT_SEVERITY_LABELS[severity] ?? severity;
  }

  protected formatIncidentEffects(decision: IncidentDecision): string {
    const effects = decision.effects;
    const parts: string[] = [];
    if (effects.cashDelta) {
      parts.push(`${this.formatSignedValue(effects.cashDelta)} cash`);
    }
    if (effects.reputationDelta) {
      parts.push(`репутация ${this.formatSignedValue(effects.reputationDelta)}`);
    }
    if (effects.techDebtDelta) {
      parts.push(`техдолг ${this.formatSignedValue(effects.techDebtDelta)}`);
    }
    if (effects.moraleDelta) {
      parts.push(`мораль ${this.formatSignedValue(effects.moraleDelta)}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Без заметных последствий';
  }

  protected formatLedgerDateTime(value: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return this.dateTimeFormatter.format(date);
  }

  protected formatLedgerReason(reason: CompanyLedgerReason): string {
    return LEDGER_REASON_LABELS[reason] ?? reason;
  }

  protected formatSignedValue(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    const rounded = Math.round(value);
    const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
    return `${sign}${this.formatNumber(Math.abs(rounded))}`;
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

  protected formatRole(role: CandidateRole): string {
    return ROLE_LABELS[role] ?? role;
  }

  protected formatAssignmentLabel(assignment: EmployeeAssignment): string {
    return ASSIGNMENT_LABELS[assignment] ?? assignment;
  }

  protected assignmentEffectSummary(assignment: EmployeeAssignment): string {
    const effects = BALANCE.company?.assignments?.[assignment];
    if (!effects) {
      return 'Без эффекта';
    }
    const parts: string[] = [];
    if (effects.cashIncomePct) {
      parts.push(`Доход ${this.formatPercent(effects.cashIncomePct)}`);
    }
    if (effects.repDelta) {
      parts.push(`Репутация ${this.formatSigned(effects.repDelta)}`);
    }
    if (effects.debtDelta) {
      parts.push(`Техдолг ${this.formatSigned(effects.debtDelta)}`);
    }
    if (effects.incidentReducePct) {
      parts.push(`Защита ${this.formatPercent(effects.incidentReducePct)}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'Без эффекта';
  }

  protected formatAssignmentSummary(): string {
    const summary = this.assignmentSummary();
    return `Доход ${this.formatPercent(summary.cashIncomePctTotal)}, Репутация ${this.formatSigned(
      summary.repDeltaTotal,
    )}, Техдолг ${this.formatSigned(summary.debtDeltaTotal)}, Защита ${this.formatPercent(
      summary.incidentReducePctTotal,
    )}`;
  }

  private formatObjectiveTargetItem(objective: ContractObjective): string {
    const label = OBJECTIVE_LABELS[objective.type] ?? objective.type;
    return `${objective.targetValue} ${label}`;
  }

  private formatObjectiveProgressItem(objective: ContractObjective): string {
    const label = OBJECTIVE_LABELS[objective.type] ?? objective.type;
    return `${objective.currentValue}/${objective.targetValue} ${label}`;
  }

  protected formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return this.numberFormatter.format(Math.max(0, Math.floor(value)));
  }

  private formatSigned(value: number): string {
    const normalized = Math.round(value * 10) / 10;
    const sign = normalized > 0 ? '+' : '';
    return `${sign}${normalized}`;
  }

  private formatPercent(value: number): string {
    const percent = Math.round(value * 100);
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent}%`;
  }
}
