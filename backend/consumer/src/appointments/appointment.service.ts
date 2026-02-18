import { Injectable, Inject, Logger } from '@nestjs/common';
import { RegisterAppointmentUseCase } from '../domain/ports/inbound/register-appointment.use-case';
import { AppointmentRepository } from '../domain/ports/outbound/appointment.repository';
import { AppointmentMapper } from '../infrastructure/persistence/appointment.mapper';
import { PersistenceAppointmentData } from '../infrastructure/persistence/persistence-appointment.interface';
import { Appointment } from '../domain/entities/appointment.entity';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { LoggerPort } from '../domain/ports/outbound/logger.port';

// Pattern: Application Service — Domain facade
// ⚕️ HUMAN CHECK - SRP: Orchestrates domain via Use Cases
// DIP: Depends on ports, not infrastructure

@Injectable()
export class AppointmentService {
    constructor(
        @Inject('RegisterAppointmentUseCase')
        private readonly registerAppointmentUseCase: RegisterAppointmentUseCase,
        @Inject('AppointmentRepository')
        private readonly repository: AppointmentRepository,
        @Inject('LoggerPort')
        private readonly logger: LoggerPort,
    ) { }

    /**
     * Facade: Delegates to Registration Use Case
     */
    async createAppointment(data: CreateAppointmentDto): Promise<PersistenceAppointmentData> {
        this.logger.log(`Service: Orchestrating registration for patient ${data.idCard}`, 'AppointmentService');
        const appointment = await this.registerAppointmentUseCase.execute({
            idCard: Number(data.idCard),
            fullName: data.fullName
        });

        return AppointmentMapper.toPersistence(appointment);
    }

    /**
     * Facade: Delegates to Repository Port
     */
    async findWaitingAppointments(): Promise<PersistenceAppointmentData[]> {
        const appointments = await this.repository.findWaiting();
        return appointments.map(a => AppointmentMapper.toPersistence(a));
    }

    /**
     * Facade: Delegates to Repository Port
     */
    async getOccupiedOffices(): Promise<string[]> {
        return this.repository.getOccupiedOfficeIds();
    }
}
