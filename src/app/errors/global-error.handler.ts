import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationsStore } from '@/features/notifications';
import { ErrorLogStore } from '@/shared/lib/errors';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errorLog = inject(ErrorLogStore);
  private readonly notifications = inject(NotificationsStore);

  handleError(error: unknown): void {
    this.errorLog.capture(error, 'global', true);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    this.notifications.error(`Error: ${message}`);
    // Mock logging
    // eslint-disable-next-line no-console
    console.error('[SkillForge] Global error', error);
  }
}
