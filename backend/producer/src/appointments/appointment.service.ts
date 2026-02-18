import { Inject, Injectable } from '@nestjs/common';
import { AppointmentReadRepository } from '../domain/ports/outbound/appointment-read.repository';
import { AppointmentEventPayload } from '../types/appointment-event';

// Pattern: Application Service — Read-only Facade
// ⚕️ HUMAN CHECK - DIP: Depends on port, not Mongoose

@Injectable()
export class AppointmentService {
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
