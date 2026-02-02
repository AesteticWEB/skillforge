import { Injectable } from '@angular/core';
import { DomainEvent, DomainEventType } from './domain-events';

type DomainEventHandler<Event extends DomainEvent> = (event: Event) => void;

@Injectable({ providedIn: 'root' })
export class DomainEventBus {
  private readonly handlers = new Map<DomainEventType, Set<DomainEventHandler<DomainEvent>>>();

  publish(event: DomainEvent): void {
    const subscribers = this.handlers.get(event.type);
    if (!subscribers) {
      return;
    }
    for (const handler of subscribers) {
      handler(event);
    }
  }

  subscribe<Type extends DomainEventType>(
    type: Type,
    handler: DomainEventHandler<Extract<DomainEvent, { type: Type }>>,
  ): () => void {
    const current = this.handlers.get(type) ?? new Set();
    current.add(handler as DomainEventHandler<DomainEvent>);
    this.handlers.set(type, current);

    return () => {
      current.delete(handler as DomainEventHandler<DomainEvent>);
      if (current.size === 0) {
        this.handlers.delete(type);
      }
    };
  }
}
