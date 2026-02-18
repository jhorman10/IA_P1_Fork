import { Injectable, Logger } from '@nestjs/common';
import { AppointmentRegisteredEvent } from '../../domain/events/appointment-registered.event';
import { AppointmentAssignedEvent } from '../../domain/events/appointment-assigned.event';
import { NotificationPort } from '../../domain/ports/outbound/notification.port';

/**
 * Pattern: Domain Event Handler / Subscriber
 * Reacts to domain events and coordinates side effects.
 */
@Injectable()
export class AppointmentEventsHandler {
    private readonly logger = new Logger(AppointmentEventsHandler.name);

    constructor(private readonly notificationPort: NotificationPort) { }

    /**
     * React to Appointment Registration.
     */
    async onAppointmentRegistered(event: AppointmentRegisteredEvent): Promise<void> {
        this.logger.log(`Handling AppointmentRegisteredEvent for ${event.appointment.idCard.toValue()}`);
        await this.notificationPort.notifyAppointmentUpdated(event.appointment);
    }

    /**
     * React to Appointment Assignment.
     */
    async onAppointmentAssigned(event: AppointmentAssignedEvent): Promise<void> {
        this.logger.log(`Handling AppointmentAssignedEvent for ${event.appointment.idCard.toValue()}`);
        await this.notificationPort.notifyAppointmentUpdated(event.appointment);
    }
}
