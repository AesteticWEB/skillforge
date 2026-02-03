import { Injectable, computed, inject, signal } from '@angular/core';
import { BALANCE, SKILL_STAGE_LABELS } from '@/shared/config';
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
    this.eventBus.subscribe('StagePromoted', (event) => {
      this.pushNotification(this.formatStagePromoted(event), 'success');
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
    return 'РџСЂРѕС„РёР»СЊ СЃРѕР·РґР°РЅ.';
  }

  private formatSkillUpgraded(event: DomainEvent): string {
    if (event.type !== 'SkillUpgraded') {
      return '';
    }
    const name = event.payload.skillName ?? event.payload.skillId;
    const cost = event.payload.cost;
    if (typeof cost === 'number') {
      return `РќР°РІС‹Рє ${name} РїРѕРІС‹С€РµРЅ РґРѕ СѓСЂРѕРІРЅСЏ ${event.payload.level}. РџРѕС‚СЂР°С‡РµРЅРѕ: ${cost} XP.`;
    }
    return `РќР°РІС‹Рє ${name} РїРѕРІС‹С€РµРЅ РґРѕ СѓСЂРѕРІРЅСЏ ${event.payload.level}.`;
  }

  private formatScenarioCompleted(event: DomainEvent): string {
    if (event.type !== 'ScenarioCompleted') {
      return '';
    }
    const reward =
      typeof event.payload.rewardXp === 'number'
        ? event.payload.rewardXp
        : BALANCE.rewards.scenarioXp;
    const reputationDelta = event.payload.reputationDelta ?? 0;
    const techDebtDelta = event.payload.techDebtDelta ?? 0;
    const coinsDelta = event.payload.coinsDelta ?? 0;
    const metricParts: string[] = [];

    const formatDelta = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

    if (reputationDelta !== 0) {
      metricParts.push(`Р РµРїСѓС‚Р°С†РёСЏ ${formatDelta(reputationDelta)}`);
    }
    if (techDebtDelta !== 0) {
      metricParts.push(`РўРµС…РґРѕР»Рі ${formatDelta(techDebtDelta)}`);
    }
    if (coinsDelta !== 0) {
      metricParts.push(`Coins ${formatDelta(coinsDelta)}`);
    }

    const metrics = metricParts.length > 0 ? ` (${metricParts.join(', ')})` : '';
    return `Р РµС€РµРЅРёРµ РїСЂРёРЅСЏС‚Рѕ. +${reward} XP.${metrics}`;
  }

  private formatStagePromoted(event: DomainEvent): string {
    if (event.type !== 'StagePromoted') {
      return '';
    }
    const label = SKILL_STAGE_LABELS[event.payload.toStage];
    return `РџРѕР·РґСЂР°РІР»СЏРµРј! РўС‹ С‚РµРїРµСЂСЊ ${label}.`;
  }
}
