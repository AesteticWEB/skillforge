import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppShellWidget } from '../widgets/app-shell/app-shell.widget';
import { AnalyticsEventsStore } from '@/features/analytics';
import { AchievementsStore } from '@/features/achievements';
import { NotificationsStore } from '@/features/notifications';

@Component({
  selector: 'app-root',
  imports: [AppShellWidget],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly _analyticsEvents = inject(AnalyticsEventsStore);
  private readonly _achievements = inject(AchievementsStore);
  private readonly _notifications = inject(NotificationsStore);
}
