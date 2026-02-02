import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  protected logDecision(): void {
    const scenario = this.store.scenarios()[0];
    const decision = scenario?.decisions[0];
    if (!scenario || !decision) {
      return;
    }
    this.store.recordDecision(scenario.id, decision.id);
  }
}
