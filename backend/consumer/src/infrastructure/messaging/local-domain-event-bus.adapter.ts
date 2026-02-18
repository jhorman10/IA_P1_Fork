import { Injectable, Logger } from '@nestjs/common';
import { DomainEventBus } from '../../domain/ports/outbound/domain-event-bus.port';
import { DomainEvent } from '../../domain/events/domain-event.base';

/**
 * Adapter: Infrastructure — Local implementation of the DomainEventBus.
 * Used to decouple side-effects within the same microservice.
 */
@Injectable()
export class LocalDomainEventBusAdapter implements DomainEventBus {
    private readonly logger = new Logger(LocalDomainEventBusAdapter.name);
    private readonly handers: Array<(event: DomainEvent) => Promise<void>> = [];

    async publish(events: DomainEvent | DomainEvent[]): Promise<void> {
        const eventArray = Array.isArray(events) ? events : [events];

        for (const event of eventArray) {
            this.logger.debug(`Publishing domain event: ${event.constructor.name} [ID: ${event.eventId}]`);
            // In a real system, this would use an Event Store or a Message Broker.
            // For now, we simulate local dispatch.
            this.dispatch(event);
        }
    }

    /**
     * Internal dispatch mechanism (simple observer pattern).
     */
    private async dispatch(event: DomainEvent): Promise<void> {
        // We'll hook this up to specific handlers in the next step.
        // For now, it just logs.
    }
}
