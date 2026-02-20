import { Controller, Inject, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventBroadcasterPort } from '../domain/ports/outbound/event-broadcaster.port';
import { AppointmentEventPayload } from '../types/appointment-event';

// ⚕️ HUMAN CHECK - DIP: Depende de EventBroadcasterPort, no del AppointmentsGateway concreto
@Controller()
export class EventsController {
    private readonly logger = new Logger(EventsController.name);

    constructor(
        @Inject('EventBroadcasterPort')
        private readonly broadcaster: EventBroadcasterPort,
    ) { }

    @EventPattern('appointment_created')
    async handleAppointmentCreated(@Payload() data: AppointmentEventPayload): Promise<void> {
        this.logger.log(`Event appointment_created received: ${data.id} — ${data.fullName}`);
        this.broadcaster.broadcastAppointmentUpdated(data);
    }

    @EventPattern('appointment_updated')
    async handleAppointmentUpdated(@Payload() data: AppointmentEventPayload): Promise<void> {
        this.logger.log(`Event appointment_updated received: ${data.id} — ${data.fullName} → ${data.status}`);
        this.broadcaster.broadcastAppointmentUpdated(data);
    }
}
