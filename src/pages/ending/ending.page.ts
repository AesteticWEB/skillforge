import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import type { EndingHistoryEntry } from '@/entities/ending';
import type { CompanyLevel } from '@/entities/company';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';

type StatRow = {
  label: string;
  value: string;
};

const COMPANY_LEVEL_LABELS: Record<CompanyLevel, string> = {
  none: 'Нет',
  lead: 'Тимлид',
  manager: 'Менеджер',
  director: 'Директор',
  cto: 'CTO',
};

@Component({
  selector: 'app-ending-page',
  imports: [CardComponent, ButtonComponent],
  templateUrl: './ending.page.html',
  styleUrl: './ending.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndingPage {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);
  private readonly numberFormatter = new Intl.NumberFormat('ru-RU');
  private readonly dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected readonly endingState = this.store.ending;
  protected readonly finale = this.store.finale;
  protected readonly ending = computed(() => this.endingState().last);
  protected readonly endingFinishedAt = computed(() => this.endingState().finishedAtIso);
  protected readonly accessAllowed = computed(
    () => this.finale().finished && Boolean(this.ending()),
  );
  protected readonly summaryLines = computed(() => {
    const summary = this.ending()?.summary ?? '';
    return summary ? summary.split('\n') : [];
  });
  protected readonly statsRows = computed<StatRow[]>(() => this.buildStatsRows());
  protected readonly canContinue = computed(() => {
    const endingId = this.ending()?.endingId;
    return endingId !== 'bankrupt' && endingId !== 'scandal';
  });
  protected readonly historyPreview = computed(() => this.endingState().history.slice(0, 5));

  constructor() {
    effect(() => {
      if (!this.accessAllowed()) {
        void this.router.navigateByUrl('/');
      }
    });
  }

  protected formatNumber(value: number): string {
    return this.numberFormatter.format(Math.round(value));
  }

  protected formatDate(iso: string | null): string {
    if (!iso) {
      return '';
    }
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) {
      return iso;
    }
    return this.dateFormatter.format(new Date(time));
  }

  protected formatHistoryTitle(entry: EndingHistoryEntry): string {
    return entry.title || entry.endingId.toUpperCase();
  }

  protected formatEndingId(endingId: string): string {
    return endingId.toUpperCase();
  }

  protected continueGame(): void {
    void this.router.navigateByUrl('/');
  }

  protected startNewGamePlus(): void {
    this.store.startNewGamePlus();
    void this.router.navigateByUrl('/');
  }

  protected startNewGame(): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Вы уверены? Это удалит прогресс.');
      if (!confirmed) {
        return;
      }
    }
    this.store.resetAll();
    void this.router.navigateByUrl('/');
  }

  private buildStatsRows(): StatRow[] {
    const stats = this.ending()?.stats;
    if (!stats) {
      return [];
    }
    const rows: StatRow[] = [
      { label: 'Кэш', value: this.formatNumber(stats.cash) },
      { label: 'Репутация', value: this.formatNumber(stats.reputation) },
      { label: 'Техдолг', value: this.formatNumber(stats.techDebt) },
    ];

    if (typeof stats.avgMorale === 'number') {
      rows.push({ label: 'Средняя мораль', value: this.formatNumber(stats.avgMorale) });
    }
    if (stats.companyLevel) {
      rows.push({
        label: 'Уровень компании',
        value: COMPANY_LEVEL_LABELS[stats.companyLevel as CompanyLevel] ?? stats.companyLevel,
      });
    }
    if (typeof stats.completedContracts === 'number') {
      rows.push({
        label: 'Выполнено контрактов',
        value: this.formatNumber(stats.completedContracts),
      });
    }
    if (typeof stats.incidentsResolved === 'number') {
      rows.push({
        label: 'Решено инцидентов',
        value: this.formatNumber(stats.incidentsResolved),
      });
    }
    if (typeof stats.score === 'number') {
      rows.push({ label: 'Счёт', value: this.formatNumber(stats.score) });
    }

    return rows;
  }
}
