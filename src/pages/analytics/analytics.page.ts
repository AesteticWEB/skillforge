import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppStore } from '../../app/store/app.store';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-analytics-page',
  imports: [CardComponent, ButtonComponent],
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
    this.history().slice(-5).reverse()
  );
  protected readonly completedScenarios = this.store.completedScenarioCount;
  protected readonly topSkills = this.store.topSkillsByLevel;
  protected readonly progressChart = this.store.progressChart;
  protected readonly skillsError = this.store.skillsError;
  protected readonly scenariosError = this.store.scenariosError;

  protected logDecision(): void {
    const scenario = this.store.scenarios()[0];
    const decision = scenario?.decisions[0];
    if (!scenario || !decision) {
      return;
    }
    this.store.recordDecision(scenario.id, decision.id);
  }

  protected clearHistory(): void {
    if (confirm('Очистить историю решений?')) {
      this.store.clearDecisionHistory();
    }
  }

  protected formatEffects(effects: Record<string, number>): string {
    const entries = Object.entries(effects);
    if (entries.length === 0) {
      return 'No effects';
    }
    return entries
      .map(([key, delta]) => `${key} ${delta >= 0 ? '+' : ''}${delta}`)
      .join(', ');
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }
}
