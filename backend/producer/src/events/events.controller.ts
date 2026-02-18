import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TurnosGateway } from './appointments.gateway';
import { AppointmentEventPayload } from '../types/appointment-event';

@Controller()
export class EventsController {
    private readonly logger = new Logger(EventsController.name);

    constructor(private readonly turnosGateway: TurnosGateway) { }

    @EventPattern('appointment_created')
    async handleAppointmentCreated(@Payload() data: AppointmentEventPayload): Promise<void> {
        this.logger.log(`Event appointment_created received: ${data.id} — ${data.fullName}`);
        this.turnosGateway.broadcastAppointmentUpdated(data);
    }

    @EventPattern('appointment_updated')
    async handleAppointmentUpdated(@Payload() data: AppointmentEventPayload): Promise<void> {
        this.logger.log(`Event appointment_updated received: ${data.id} — ${data.fullName} → ${data.status}`);
        this.turnosGateway.broadcastAppointmentUpdated(data);
    }
}
