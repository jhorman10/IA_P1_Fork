import { RegisterAppointmentUseCase } from '../../domain/ports/inbound/register-appointment.use-case';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';

export class RegisterAppointmentUseCaseImpl implements RegisterAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly logger: LoggerPort,
    ) { }

    async execute(data: { idCard: number; fullName: string }): Promise<Appointment> {
        // 1. Validation (DIP: Native Error, not NestJS Exception)
        if (typeof data.idCard !== 'number' || Number.isNaN(data.idCard)) {
            throw new Error('idCard must be numeric');
        }

        this.logger.log(`Processing registration for patient ${data.idCard}`, 'RegisterAppointmentUseCase');

        // 2. Idempotency Check (Domain Logic moved from service)
        const existing = await this.appointmentRepository.findByIdCardAndActive(data.idCard);
        if (existing) {
            this.logger.warn(`Patient ${data.idCard} already has an active appointment. Reusing existing.`, 'RegisterAppointmentUseCase');
            return existing;
        }

        // 3. Creation (Domain Entity logic)
        // Note: ID generation is currently handled by DB in repository.save if null/empty
        const appointment = new Appointment(
            '', // Repository will generate ID
            data.idCard,
            data.fullName,
            'medium',
            'waiting'
        );

        const saved = await this.appointmentRepository.save(appointment);
        this.logger.log(`Appointment registered for patient ${data.idCard} with ID ${saved.id}`, 'RegisterAppointmentUseCase');

        return saved;
    }
}
