import { IdCard } from '../../domain/value-objects/id-card.value-object';
import { AppointmentFactory } from '../../domain/factories/appointment.factory';
import { Appointment } from '../../domain/entities/appointment.entity';
import { RegisterAppointmentUseCase } from '../../domain/ports/inbound/register-appointment.use-case';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';
import { DomainEventBus } from '../../domain/ports/outbound/domain-event-bus.port';
import { AppointmentRegisteredEvent } from '../../domain/events/appointment-registered.event';

import { RegisterAppointmentCommand } from '../commands/register-appointment.command';

export class RegisterAppointmentUseCaseImpl implements RegisterAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly logger: LoggerPort,
        private readonly eventBus: DomainEventBus,
    ) { }

    async execute(command: RegisterAppointmentCommand): Promise<Appointment> {
        // 1. Value Object Instantiation (Encapsulated Validation)
        const idCardVo = new IdCard(command.idCard);

        this.logger.log(`Processing registration for patient ${idCardVo.toValue()}`, 'RegisterAppointmentUseCase');

        // 2. Idempotency Check (Domain Rule)
        const existing = await this.appointmentRepository.findByIdCardAndActive(idCardVo);
        if (existing) {
            this.logger.warn(`Patient ${idCardVo.toValue()} already has an active appointment. Reusing existing.`, 'RegisterAppointmentUseCase');
            return existing;
        }

        // 3. Domain Factory (Centralized Business Policies)
        const appointment = AppointmentFactory.createNew(idCardVo, command.fullName);

        // Record Domain Event
        appointment.recordEvent(new AppointmentRegisteredEvent(appointment));

        const saved = await this.appointmentRepository.save(appointment);
        this.logger.log(`Appointment registered for patient ${idCardVo.toValue()} with ID ${saved.id}`, 'RegisterAppointmentUseCase');

        // 4. Dispatch Events (Decoupled Side Effects)
        await this.eventBus.publish(appointment.pullEvents());

        return saved;
    }
}
