import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppStore } from '../../app/store/app.store';
import { CardComponent } from '../../shared/ui/card/card.component';

@Component({
  selector: 'app-analytics-page',
  imports: [CardComponent],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {
  private readonly store = inject(AppStore);
  protected readonly scenariosCount = this.store.scenariosCount;
}
