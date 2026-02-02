import { Injectable, computed, inject, signal } from '@angular/core';
import { DomainEventBus, DomainEvent } from '@/shared/lib/events';

export interface NotificationItem {
  id: string;
  message: string;
  createdAt: string;
}

const MAX_NOTIFICATIONS = 10;

@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly eventBus = inject(DomainEventBus);
  private readonly items = signal<NotificationItem[]>([]);

  readonly notifications = computed(() => this.items());

  constructor() {
    this.eventBus.subscribe('ProfileCreated', (event) => {
      this.pushNotification(this.formatProfileCreated(event));
    });
    this.eventBus.subscribe('SkillUpgraded', (event) => {
      this.pushNotification(this.formatSkillUpgraded(event));
    });
    this.eventBus.subscribe('ScenarioCompleted', (event) => {
      this.pushNotification(this.formatScenarioCompleted(event));
    });
  }

  clear(): void {
    this.items.set([]);
  }

  private pushNotification(message: string): void {
    const entry: NotificationItem = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      message,
      createdAt: new Date().toISOString(),
    };

    this.items.update((current) => [entry, ...current].slice(0, MAX_NOTIFICATIONS));
  }

  private formatProfileCreated(event: DomainEvent): string {
    if (event.type !== 'ProfileCreated') {
      return '';
    }
    return `Profile created for ${event.payload.user.role}.`;
  }

  private formatSkillUpgraded(event: DomainEvent): string {
    if (event.type !== 'SkillUpgraded') {
      return '';
    }
    return `Skill upgraded: ${event.payload.skillId} -> level ${event.payload.level}.`;
  }

  private formatScenarioCompleted(event: DomainEvent): string {
    if (event.type !== 'ScenarioCompleted') {
      return '';
    }
    return `Scenario completed: ${event.payload.scenarioId}.`;
  }
}
