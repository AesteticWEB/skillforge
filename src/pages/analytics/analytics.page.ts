import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppStore } from '@/app/store/app.store';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';

@Component({
  selector: 'app-analytics-page',
  imports: [CardComponent, ButtonComponent, EmptyStateComponent],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {
  private readonly store = inject(AppStore);
  protected readonly scenariosCount = this.store.scenariosCount;
  protected readonly decisionCount = this.store.decisionCount;
  protected readonly history = this.store.decisionHistoryDetailed;
  protected readonly recentHistory = computed(() =>
    this.history()
      .slice(-5)
      .reverse()
      .map((entry) => ({
        key: `${entry.decidedAt}-${entry.decisionId}`,
        ...entry,
        formattedDate: new Date(entry.decidedAt).toLocaleString(),
        effectsText: this.formatEffects(entry.effects),
      })),
  );
  protected readonly completedScenarios = this.store.completedScenarioCount;
  protected readonly topSkills = this.store.topSkillsByLevel;
  protected readonly progressChart = this.store.progressChart;
  protected readonly skillsError = this.store.skillsError;
  protected readonly scenariosError = this.store.scenariosError;
  protected readonly canUndoDecision = this.store.canUndoDecision;

  protected logDecision(): void {
    const scenario = this.store.scenarios()[0];
    const decision = scenario?.decisions[0];
    if (!scenario || !decision) {
      return;
    }
    this.store.recordDecision(scenario.id, decision.id);
  }

  protected clearHistory(): void {
    if (confirm('Clear decision history?')) {
      this.store.clearDecisionHistory();
    }
  }

  protected undoLastDecision(): void {
    if (this.store.canUndoDecision()) {
      this.store.undoLastDecision();
    }
  }

  private formatEffects(effects: Record<string, number>): string {
    const entries = Object.entries(effects);
    if (entries.length === 0) {
      return 'No effects';
    }
    return entries.map(([key, delta]) => `${key} ${delta >= 0 ? '+' : ''}${delta}`).join(', ');
  }
}
