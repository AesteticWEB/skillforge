import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-analytics-page',
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {}
