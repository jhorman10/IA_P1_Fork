import { DomainEvent } from '../../events/domain-event.base';

/**
 * Port: Contract for handling a specific type of domain event.
 * ⚕️ HUMAN CHECK - OCP: New event types require new handlers, not modifications to the bus.
 */
export interface DomainEventHandler<T extends DomainEvent = DomainEvent> {
    readonly eventType: string;
    handle(event: T): Promise<void>;
}
