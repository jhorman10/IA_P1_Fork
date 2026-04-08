import { ConflictException, Inject, Injectable } from "@nestjs/common";

import {
  CreateAppointmentCommand,
  CreateAppointmentUseCase,
} from "../../domain/ports/inbound/create-appointment.use-case";
import { AppointmentPublisherPort } from "../../domain/ports/outbound/appointment-publisher.port";
import { AppointmentReadRepository } from "../../domain/ports/outbound/appointment-read.repository";
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
    @Inject("AppointmentReadRepository")
    private readonly appointmentReadRepository: AppointmentReadRepository,
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<void> {
    // ⚕️ HUMAN CHECK - H-09 Fix: Validación de dominio mediante Value Objects.
    const idCardVo = new IdCard(command.idCard);
    const nameVo = new PatientName(command.fullName);

    // SPEC-003: Reject duplicate active appointments synchronously before publishing
    const active = await this.appointmentReadRepository.findActiveByIdCard(
      idCardVo.Value,
    );
    if (active) {
      throw new ConflictException(
        `Patient ${idCardVo.Value} already has an active appointment`,
      );
    }

    await this.publisher.publishAppointmentCreated({
      ...command,
      fullName: nameVo.Value,
      idCard: idCardVo.Value,
    });
  }
}
