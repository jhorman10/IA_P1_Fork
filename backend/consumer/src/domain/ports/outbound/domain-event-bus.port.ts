import { DomainEvent } from "../../events/domain-event.base";

/**
 * Port: Outbound — Contract for publishing Domain Events.
 */
export interface DomainEventBus {
  publish(events: DomainEvent | DomainEvent[]): Promise<void>;
}
