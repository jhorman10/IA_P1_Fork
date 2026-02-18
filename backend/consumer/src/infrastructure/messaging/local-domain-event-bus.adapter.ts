import { Injectable, Logger } from '@nestjs/common';
import { DomainEventBus } from '../../domain/ports/outbound/domain-event-bus.port';
import { DomainEvent } from '../../domain/events/domain-event.base';
import { AppointmentEventsHandler } from '../../application/event-handlers/appointment-events.handler';
import { AppointmentRegisteredEvent } from '../../domain/events/appointment-registered.event';
import { AppointmentAssignedEvent } from '../../domain/events/appointment-assigned.event';

/**
 * Adapter: Infrastructure — Local implementation of the DomainEventBus.
 * Used to decouple side-effects within the same microservice.
 */
@Injectable()
export class LocalDomainEventBusAdapter implements DomainEventBus {
    private readonly logger = new Logger(LocalDomainEventBusAdapter.name);

    constructor(private readonly handlers: AppointmentEventsHandler) { }

    async publish(events: DomainEvent | DomainEvent[]): Promise<void> {
        const eventArray = Array.isArray(events) ? events : [events];

        for (const event of eventArray) {
            this.logger.debug(`Publishing domain event: ${event.constructor.name} [ID: ${event.eventId}]`);
            // In a real system, this would use an Event Store or a Message Broker.
            await this.dispatch(event);
        }
    }

    /**
     * Internal dispatch mechanism.
     */
    private async dispatch(event: DomainEvent): Promise<void> {
        if (event instanceof AppointmentRegisteredEvent) {
            await this.handlers.onAppointmentRegistered(event);
        } else if (event instanceof AppointmentAssignedEvent) {
            await this.handlers.onAppointmentAssigned(event);
        }
    }
}
