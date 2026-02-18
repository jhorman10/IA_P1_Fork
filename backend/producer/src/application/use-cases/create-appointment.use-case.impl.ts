import { Inject, Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from '../../dto/create-appointment.dto';
import { AppointmentPublisherPort } from '../../domain/ports/outbound/appointment-publisher.port';
import {
    CreateAppointmentUseCase,
    CreateAppointmentResponse,
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

    async execute(dto: CreateAppointmentDto): Promise<CreateAppointmentResponse> {
        await this.publisher.publishAppointmentCreated(dto);
        return { status: 'accepted', message: 'Appointment assignment in progress' };
    }
}
