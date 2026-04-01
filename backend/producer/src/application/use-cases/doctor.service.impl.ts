import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { DoctorView, DoctorStatus } from "../../domain/models/doctor-view";
import {
  CreateDoctorCommand,
  DoctorServicePort,
} from "../../domain/ports/inbound/doctor-service.port";
import {
  DOCTOR_OFFICE_RANGE_MESSAGE,
  isValidDoctorOffice,
} from "../../doctors/doctor-office.constants";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import { DoctorEventPublisherPort } from "../../domain/ports/outbound/doctor-event-publisher.port";

/**
 * Application Use Case: Doctor Service
 * SPEC-003: Lógica de negocio para CRUD de médicos y transiciones check-in/check-out.
 * SRP: Solo orquesta el repositorio y el publicador de eventos. Sin acceso directo a DB.
 */
@Injectable()
export class DoctorServiceImpl implements DoctorServicePort {
  constructor(
    @Inject("DoctorRepository")
    private readonly repo: DoctorRepository,
    @Inject("DoctorEventPublisherPort")
    private readonly publisher: DoctorEventPublisherPort,
  ) {}

  async createDoctor(command: CreateDoctorCommand): Promise<DoctorView> {
    if (!isValidDoctorOffice(command.office)) {
      throw new BadRequestException(DOCTOR_OFFICE_RANGE_MESSAGE);
    }

    const existing = await this.repo.findByOffice(command.office);
    if (existing) {
      throw new ConflictException(
        `El consultorio ${command.office} ya tiene un médico asignado`,
      );
    }
    return this.repo.save({
      name: command.name,
      specialty: command.specialty,
      office: command.office,
      status: "offline" as DoctorStatus,
    });
  }

  async findAll(status?: DoctorStatus): Promise<DoctorView[]> {
    return this.repo.findAll(status);
  }

  async findById(id: string): Promise<DoctorView> {
    const doctor = await this.repo.findById(id);
    if (!doctor) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    return doctor;
  }

  async checkIn(id: string): Promise<DoctorView> {
    const doctor = await this.repo.findById(id);
    if (!doctor) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    if (doctor.status === "available") {
      throw new ConflictException("El médico ya está disponible");
    }
    const updated = await this.repo.updateStatus(id, "available");
    if (!updated) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    await this.publisher.publishDoctorCheckedIn({
      doctorId: updated.id,
      doctorName: updated.name,
      office: updated.office,
      timestamp: Date.now(),
    });
    return updated;
  }

  async checkOut(id: string): Promise<DoctorView> {
    const doctor = await this.repo.findById(id);
    if (!doctor) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    if (doctor.status === "busy") {
      throw new ConflictException(
        "El médico tiene un paciente asignado, no puede hacer check-out",
      );
    }
    const updated = await this.repo.updateStatus(id, "offline");
    if (!updated) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    return updated;
  }
}
