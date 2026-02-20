import { Inject, Injectable } from "@nestjs/common";
import { AppointmentPublisherPort } from "../../domain/ports/outbound/appointment-publisher.port";
import {
  CreateAppointmentUseCase,
  CreateAppointmentCommand,
} from "../../domain/ports/inbound/create-appointment.use-case";
import { IdCard } from "../../domain/value-objects/id-card.vo";
import { PatientName } from "../../domain/value-objects/patient-name.vo";

/**
 * Application Use Case: Create Appointment
 * ⚕️ HUMAN CHECK - Hexagonal: Orquesta el puerto de salida (publicador).
 * Reemplaza el antiguo ProducerService.
 */
@Injectable()
export class CreateAppointmentUseCaseImpl implements CreateAppointmentUseCase {
  constructor(
    @Inject("AppointmentPublisherPort")
    private readonly publisher: AppointmentPublisherPort,
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<void> {
    // ⚕️ HUMAN CHECK - H-09 Fix: Validación de dominio mediante Value Objects.
    // Se instancian para garantizar que los datos cumplen las reglas de negocio.
    // Si la validación falla, lanza inmediatamente.
    const idCardVo = new IdCard(command.idCard);
    const nameVo = new PatientName(command.fullName);

    // Usage: We could pass VOs to the publisher, but the interface expects the Command schema or primitive types.
    // For this refactor, we use VOs as "Guards" and then pass the valid data.

    await this.publisher.publishAppointmentCreated({
      ...command,
      // Ensure we send the sanitized/trimmed values if necessary
      fullName: nameVo.Value,
      idCard: idCardVo.Value,
    });
  }
}
