import { Appointment } from "../../domain/entities/appointment.entity";
import { AppointmentRegisteredEvent } from "../../domain/events/appointment-registered.event";
import { AppointmentFactory } from "../../domain/factories/appointment.factory";
import { RegisterAppointmentUseCase } from "../../domain/ports/inbound/register-appointment.use-case";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { ClockPort } from "../../domain/ports/outbound/clock.port";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { FullName } from "../../domain/value-objects/full-name.value-object";
import { IdCard } from "../../domain/value-objects/id-card.value-object";
import { Priority } from "../../domain/value-objects/priority.value-object";
import { RegisterAppointmentCommand } from "../../domain/commands/register-appointment.command";

/**
 * 🛰️ HUMAN CHECK - H-25 Fix: Efectos secundarios movidos al Decorador del Repositorio
 * H-28 Fix: Frontera estricta de Value Objects
 * H-29 Fix: Timestamp determinista
 */
export class RegisterAppointmentUseCaseImpl implements RegisterAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly logger: LoggerPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(command: RegisterAppointmentCommand): Promise<Appointment> {
    // 1. Value Object Instantiation (Encapsulated Validation)
    const idCardVo = new IdCard(command.idCard);
    const fullNameVo = new FullName(command.fullName);

    this.logger.log(
      `Processing registration for patient ${idCardVo.toValue()}`,
      "RegisterAppointmentUseCase",
    );

    // 2. Idempotency Check (Domain Rule)
    const existing =
      await this.appointmentRepository.findByIdCardAndActive(idCardVo);
    if (existing) {
      this.logger.warn(
        `Patient ${idCardVo.toValue()} already has an active appointment. Reusing existing.`,
        "RegisterAppointmentUseCase",
      );
      return existing;
    }

    // 3. Domain Factory (Centralized Business Policies)
    let appointment: Appointment;
    if (command.priority) {
      appointment = AppointmentFactory.createWithPriority(
        idCardVo,
        fullNameVo,
        new Priority(command.priority),
        this.clock.now(),
      );
    } else {
      appointment = AppointmentFactory.createNew(
        idCardVo,
        fullNameVo,
        this.clock.now(),
      );
    }

    // 🧠 Domain Concern: Intent of registration
    appointment.recordEvent(new AppointmentRegisteredEvent(appointment));

    // 🎯 Infrastructure Concern: Persistence + AUTOMATIC Side-effects (H-25)
    const saved = await this.appointmentRepository.save(appointment);

    this.logger.log(
      `Appointment registered for patient ${idCardVo.toValue()}`,
      "RegisterAppointmentUseCase",
    );

    return saved;
  }
}
