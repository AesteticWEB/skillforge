import { Injectable, computed, signal } from '@angular/core';

export type ErrorLogEntry = {
  id: string;
  message: string;
  stack?: string;
  context?: string;
  occurredAt: string;
};

const MAX_ERROR_ENTRIES = 50;

@Injectable({ providedIn: 'root' })
export class ErrorLogStore {
  private readonly entries = signal<ErrorLogEntry[]>([]);
  private readonly fatal = signal<ErrorLogEntry | null>(null);

  readonly errorLog = this.entries.asReadonly();
  readonly fatalError = this.fatal.asReadonly();
  readonly lastFive = computed(() => this.entries().slice(0, 5));

  capture(error: unknown, context = 'global', fatal = true): ErrorLogEntry {
    const entry = this.normalize(error, context);
    this.entries.update((current) => [entry, ...current].slice(0, MAX_ERROR_ENTRIES));
    if (fatal) {
      this.fatal.set(entry);
    }
    return entry;
  }

  clearFatal(): void {
    this.fatal.set(null);
  }

  clearAll(): void {
    this.entries.set([]);
    this.fatal.set(null);
  }

  private normalize(error: unknown, context?: string): ErrorLogEntry {
    const occurredAt = new Date().toISOString();
    if (error instanceof Error) {
      return {
        id: this.createId(occurredAt),
        message: error.message || 'Unknown error',
        stack: error.stack,
        context,
        occurredAt,
      };
    }

    if (typeof error === 'string') {
      return {
        id: this.createId(occurredAt),
        message: error,
        context,
        occurredAt,
      };
    }

    return {
      id: this.createId(occurredAt),
      message: 'Unexpected error',
      context,
      occurredAt,
    };
  }

  private createId(seed: string): string {
    return `${seed}-${Math.random().toString(16).slice(2)}`;
  }
}
