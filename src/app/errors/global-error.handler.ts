import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationsStore } from '@/features/notifications';
import { ErrorLogStore } from '@/shared/lib/errors';
import { TelemetryService } from '@/shared/lib/telemetry';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errorLog = inject(ErrorLogStore);
  private readonly notifications = inject(NotificationsStore);
  private readonly telemetry = inject(TelemetryService);

  handleError(error: unknown): void {
    const entry = this.errorLog.capture(error, 'global', true);
    this.telemetry.capture(entry);
    const message = error instanceof Error ? error.message : 'Непредвиденная ошибка';
    this.notifications.error(`Ошибка: ${message}`);
    console.error('[SkillForge] Global error', error);
  }
}
