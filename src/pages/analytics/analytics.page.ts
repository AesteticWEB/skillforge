import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ScenariosApi } from '../../shared/api/scenarios/scenarios.api';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-analytics-page',
  imports: [CardComponent, AsyncPipe],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {
  private readonly scenariosApi = inject(ScenariosApi);
  protected readonly scenarios$ = this.scenariosApi.getScenarios();
}
