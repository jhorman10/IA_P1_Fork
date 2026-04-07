import { Inject, Injectable } from "@nestjs/common";

import { AppointmentView } from "../../domain/models/appointment-view";
import { QueryAppointmentsUseCase } from "../../domain/ports/inbound/query-appointments.use-case";
import { AppointmentReadRepository } from "../../domain/ports/outbound/appointment-read.repository";

/**
 * Application Use Case: Query Appointments
 * ⚕️ HUMAN CHECK - Hexagonal: Orquesta el puerto de salida (repositorio de lectura).
 * Reemplaza la antigua fachada AppointmentService.
 */
@Injectable()
export class QueryAppointmentsUseCaseImpl implements QueryAppointmentsUseCase {
  constructor(
    @Inject("AppointmentReadRepository")
    private readonly repository: AppointmentReadRepository,
  ) {}

  async findAll(): Promise<AppointmentView[]> {
    return this.repository.findAll();
  }

  async findByIdCard(idCard: number): Promise<AppointmentView[]> {
    return this.repository.findByIdCard(idCard);
  }
}
