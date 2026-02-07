import { Injectable } from '@angular/core';
import type { ErrorLogEntry } from '@/shared/lib/errors';

type TelemetryPayload = {
  level: 'error' | 'warn' | 'info';
  message: string;
  context?: string;
  stack?: string;
  occurredAt: string;
};

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly endpoint = '/api/telemetry';

  capture(entry: ErrorLogEntry): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (this.isDisabled()) {
      return;
    }

    const payload: TelemetryPayload = {
      level: 'error',
      message: entry.message,
      context: entry.context,
      stack: entry.stack,
      occurredAt: entry.occurredAt,
    };
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(this.endpoint, blob);
      return;
    }

    void fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'include',
    }).catch(() => void 0);
  }

  private isDisabled(): boolean {
    try {
      return window.localStorage.getItem('skillforge.telemetry.disabled') === 'true';
    } catch {
      return false;
    }
  }
}
