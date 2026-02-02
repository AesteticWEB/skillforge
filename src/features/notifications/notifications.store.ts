import { Injectable, computed, inject, signal } from '@angular/core';
import { DomainEventBus, DomainEvent } from '@/shared/lib/events';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationItem {
  id: string;
  message: string;
  createdAt: string;
  type: NotificationType;
}

const MAX_NOTIFICATIONS = 10;
const AUTO_DISMISS_MS: Record<NotificationType, number> = {
  success: 4500,
  info: 4500,
  error: 7000,
};

@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly eventBus = inject(DomainEventBus);
  private readonly items = signal<NotificationItem[]>([]);

  readonly notifications = computed(() => this.items());

  constructor() {
    this.eventBus.subscribe('ProfileCreated', (event) => {
      this.pushNotification(this.formatProfileCreated(event), 'success');
    });
    this.eventBus.subscribe('SkillUpgraded', (event) => {
      this.pushNotification(this.formatSkillUpgraded(event), 'success');
    });
    this.eventBus.subscribe('ScenarioCompleted', (event) => {
      this.pushNotification(this.formatScenarioCompleted(event), 'success');
    });
  }

  clear(): void {
    this.items.set([]);
  }

  dismiss(id: string): void {
    this.items.update((current) => current.filter((item) => item.id !== id));
  }

  notify(message: string, type: NotificationType = 'info'): void {
    this.pushNotification(message, type);
  }

  success(message: string): void {
    this.pushNotification(message, 'success');
  }

  error(message: string): void {
    this.pushNotification(message, 'error');
  }

  private pushNotification(message: string, type: NotificationType): void {
    const entry: NotificationItem = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      message,
      createdAt: new Date().toISOString(),
      type,
    };

    this.items.update((current) => [entry, ...current].slice(0, MAX_NOTIFICATIONS));
    const duration = AUTO_DISMISS_MS[type];
    if (duration > 0) {
      window.setTimeout(() => this.dismiss(entry.id), duration);
    }
  }

  private formatProfileCreated(event: DomainEvent): string {
    if (event.type !== 'ProfileCreated') {
      return '';
    }
    return 'Профиль создан.';
  }

  private formatSkillUpgraded(event: DomainEvent): string {
    if (event.type !== 'SkillUpgraded') {
      return '';
    }
    const name = event.payload.skillName ?? event.payload.skillId;
    const cost = event.payload.cost;
    if (typeof cost === 'number') {
      return `Навык ${name} повышен до уровня ${event.payload.level}. Потрачено: ${cost} XP.`;
    }
    return `Навык ${name} повышен до уровня ${event.payload.level}.`;
  }

  private formatScenarioCompleted(event: DomainEvent): string {
    if (event.type !== 'ScenarioCompleted') {
      return '';
    }
    return 'Сценарий пройден.';
  }
}
