import { FullName } from '../../domain/value-objects/full-name.value-object';
import { IdCard } from '../../domain/value-objects/id-card.value-object';
import { AppointmentFactory } from '../../domain/factories/appointment.factory';
import { Appointment } from '../../domain/entities/appointment.entity';
import { RegisterAppointmentUseCase } from '../../domain/ports/inbound/register-appointment.use-case';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';
import { ClockPort } from '../../domain/ports/outbound/clock.port';
import { AppointmentRegisteredEvent } from '../../domain/events/appointment-registered.event';

import { RegisterAppointmentCommand } from '../commands/register-appointment.command';

/**
 * 🛰️ HUMAN CHECK - H-25 Fix: Side effects moved to Repository Decorator
 * H-28 Fix: Strict VO boundary
 * H-29 Fix: Deterministic timestamp
 */
export class RegisterAppointmentUseCaseImpl implements RegisterAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly logger: LoggerPort,
        private readonly clock: ClockPort,
    ) { }

    async execute(command: RegisterAppointmentCommand): Promise<Appointment> {
        // 1. Value Object Instantiation (Encapsulated Validation)
        const idCardVo = new IdCard(command.idCard);
        const fullNameVo = new FullName(command.fullName);

        this.logger.log(`Processing registration for patient ${idCardVo.toValue()}`, 'RegisterAppointmentUseCase');

        // 2. Idempotency Check (Domain Rule)
        const existing = await this.appointmentRepository.findByIdCardAndActive(idCardVo);
        if (existing) {
            this.logger.warn(`Patient ${idCardVo.toValue()} already has an active appointment. Reusing existing.`, 'RegisterAppointmentUseCase');
            return existing;
        }

        // 3. Domain Factory (Centralized Business Policies)
        const appointment = AppointmentFactory.createNew(idCardVo, fullNameVo, this.clock.now());

        // 🧠 Domain Concern: Intent of registration
        appointment.recordEvent(new AppointmentRegisteredEvent(appointment));

        // 🎯 Infrastructure Concern: Persistence + AUTOMATIC Side-effects (H-25)
        const saved = await this.appointmentRepository.save(appointment);

        this.logger.log(`Appointment registered for patient ${idCardVo.toValue()}`, 'RegisterAppointmentUseCase');

        return saved;
    }
}
