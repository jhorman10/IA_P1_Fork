import { Appointment } from '../../domain/entities/appointment.entity';
import { RegisterAppointmentUseCase } from '../../domain/ports/inbound/register-appointment.use-case';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';
import { NotificationPort } from '../../domain/ports/outbound/notification.port';
import { ValidationError } from '../../domain/errors/validation.error';

export class RegisterAppointmentUseCaseImpl implements RegisterAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly logger: LoggerPort,
        private readonly notificationPort: NotificationPort,
    ) { }

    async execute(data: { idCard: number; fullName: string }): Promise<Appointment> {
        // 1. Validation (DIP: Native Domain Error)
        if (typeof data.idCard !== 'number' || Number.isNaN(data.idCard)) {
            throw new ValidationError('idCard must be numeric');
        }

        this.logger.log(`Processing registration for patient ${data.idCard}`, 'RegisterAppointmentUseCase');

        // 2. Idempotency Check
        const existing = await this.appointmentRepository.findByIdCardAndActive(data.idCard);
        if (existing) {
            this.logger.warn(`Patient ${data.idCard} already has an active appointment. Reusing existing.`, 'RegisterAppointmentUseCase');
            return existing;
        }

        // 3. Creation
        const appointment = new Appointment(
            '',
            data.idCard,
            data.fullName,
            'medium',
            'waiting'
        );

        const saved = await this.appointmentRepository.save(appointment);
        this.logger.log(`Appointment registered for patient ${data.idCard} with ID ${saved.id}`, 'RegisterAppointmentUseCase');

        // 4. Orchestrate Side Effects (DIP: via NotificationPort)
        await this.notificationPort.notifyAppointmentUpdated(saved);

        return saved;
    }
}
