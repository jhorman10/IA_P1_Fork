import { Inject, Injectable } from '@nestjs/common';
import { AppointmentReadRepository } from '../../domain/ports/outbound/appointment-read.repository';
import { QueryAppointmentsUseCase } from '../../domain/ports/inbound/query-appointments.use-case';
import { AppointmentEventPayload } from '../../types/appointment-event';

/**
 * Application Use Case: Query Appointments
 * ⚕️ HUMAN CHECK - Hexagonal: Orchestrates outbound port (read repository).
 * Replaces former AppointmentService facade.
 */
@Injectable()
export class QueryAppointmentsUseCaseImpl implements QueryAppointmentsUseCase {
    constructor(
        @Inject('AppointmentReadRepository')
        private readonly repository: AppointmentReadRepository,
    ) { }

    async findAll(): Promise<AppointmentEventPayload[]> {
        return this.repository.findAll();
    }

    async findByIdCard(idCard: number): Promise<AppointmentEventPayload[]> {
        return this.repository.findByIdCard(idCard);
    }
}
