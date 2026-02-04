import { Injectable, computed, inject, signal } from '@angular/core';
import { DomainEvent, DomainEventBus } from '@/shared/lib/events';

@Injectable({ providedIn: 'root' })
export class AnalyticsEventsStore {
  private readonly eventBus = inject(DomainEventBus);
  private readonly events = signal<DomainEvent[]>([]);

  readonly eventLog = computed(() => this.events());
  readonly counts = computed(() => {
    const log = this.events();
    return {
      profileCreated: log.filter((event) => event.type === 'ProfileCreated').length,
      skillUpgraded: log.filter((event) => event.type === 'SkillUpgraded').length,
      scenarioCompleted: log.filter((event) => event.type === 'ScenarioCompleted').length,
      examPassed: log.filter((event) => event.type === 'ExamPassed').length,
    };
  });

  constructor() {
    this.eventBus.subscribe('ProfileCreated', (event) => this.push(event));
    this.eventBus.subscribe('SkillUpgraded', (event) => this.push(event));
    this.eventBus.subscribe('ScenarioCompleted', (event) => this.push(event));
    this.eventBus.subscribe('PurchaseMade', (event) => this.push(event));
    this.eventBus.subscribe('ExamPassed', (event) => this.push(event));
  }

  clear(): void {
    this.events.set([]);
  }

  private push(event: DomainEvent): void {
    this.events.update((current) => [event, ...current].slice(0, 50));
  }
}
