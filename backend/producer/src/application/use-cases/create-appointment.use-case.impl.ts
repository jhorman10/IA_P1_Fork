import { Inject, Injectable } from '@nestjs/common';
import { AppointmentPublisherPort } from '../../domain/ports/outbound/appointment-publisher.port';
import {
    CreateAppointmentUseCase,
    CreateAppointmentCommand,
} from '../../domain/ports/inbound/create-appointment.use-case';

/**
 * Application Use Case: Create Appointment
 * ⚕️ HUMAN CHECK - Hexagonal: Orchestrates outbound port (publisher).
 * Replaces former ProducerService.
 */
@Injectable()
export class CreateAppointmentUseCaseImpl implements CreateAppointmentUseCase {
    constructor(
        @Inject('AppointmentPublisherPort')
        private readonly publisher: AppointmentPublisherPort,
    ) { }

    async execute(command: CreateAppointmentCommand): Promise<void> {
        // ⚕️ HUMAN CHECK - SRP: Use Case only orchestrates business logic.
        // Returns void. UI response is Controller responsibility.
        await this.publisher.publishAppointmentCreated(command);
    }
}
