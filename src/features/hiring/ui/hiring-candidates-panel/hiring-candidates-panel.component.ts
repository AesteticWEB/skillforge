import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import type { Candidate, CandidateRole } from '../../model/candidate.model';

const ROLE_LABELS: Record<CandidateRole, string> = {
  junior: 'Джуниор',
  middle: 'Миддл',
  senior: 'Сеньор',
};

@Component({
  selector: 'sf-hiring-candidates-panel',
  imports: [CardComponent, ButtonComponent, EmptyStateComponent],
  templateUrl: './hiring-candidates-panel.component.html',
  styleUrl: './hiring-candidates-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HiringCandidatesPanelComponent {
  @Input() candidates: Candidate[] = [];
  @Input() coins = 0;
  @Input() refreshCost = 0;
  @Input() canRefresh = true;
  @Input() refreshDisabledHint = 'Недоступно';
  @Output() refresh = new EventEmitter<void>();

  private readonly numberFormatter = new Intl.NumberFormat('ru-RU');

  protected handleRefresh(): void {
    if (this.isRefreshDisabled()) {
      return;
    }
    this.refresh.emit();
  }

  protected roleLabel(role: CandidateRole): string {
    return ROLE_LABELS[role] ?? role;
  }

  protected formatQuality(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return this.numberFormatter.format(Math.max(0, Math.min(100, Math.round(value))));
  }

  protected formatCoins(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return this.numberFormatter.format(Math.max(0, Math.floor(value)));
  }

  protected isRefreshDisabled(): boolean {
    return !this.canRefresh || this.coins < this.refreshCost;
  }

  protected refreshHint(): string | null {
    if (!this.canRefresh) {
      return this.refreshDisabledHint;
    }
    if (this.coins < this.refreshCost) {
      return 'Не хватает coins';
    }
    return null;
  }
}
