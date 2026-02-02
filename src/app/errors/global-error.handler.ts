import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorLogStore } from '@/shared/lib/errors';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errorLog = inject(ErrorLogStore);

  handleError(error: unknown): void {
    this.errorLog.capture(error, 'global', true);
    // Mock logging
    // eslint-disable-next-line no-console
    console.error('[SkillForge] Global error', error);
  }
}
