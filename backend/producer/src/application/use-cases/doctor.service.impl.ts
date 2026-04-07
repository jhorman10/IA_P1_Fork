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
  AppointmentLifecyclePublisherPort,
  LIFECYCLE_PUBLISHER_TOKEN,
} from "../../domain/ports/outbound/appointment-lifecycle-publisher.port";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import {
  DOCTOR_OFFICE_RANGE_MESSAGE,
  isValidDoctorOffice,
} from "../../doctors/doctor-office.constants";

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
    @Inject(LIFECYCLE_PUBLISHER_TOKEN)
    private readonly lifecyclePublisher: AppointmentLifecyclePublisherPort,
  ) {}

  async createDoctor(command: CreateDoctorCommand): Promise<DoctorView> {
    if (command.office && !isValidDoctorOffice(command.office)) {
      throw new BadRequestException(DOCTOR_OFFICE_RANGE_MESSAGE);
    }

    if (command.office) {
      const existing = await this.repo.findByOffice(command.office);
      if (existing) {
        throw new ConflictException(
          `El consultorio ${command.office} ya tiene un médico asignado`,
        );
      }
    }

    return this.repo.save(command);
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

    // SPEC-003: Publish event to trigger reactive assignment in the consumer
    await this.lifecyclePublisher.publishDoctorCheckedIn({
      doctorId: id,
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

  async updateSpecialty(
    id: string,
    name: string,
    _specialtyId?: string,
  ): Promise<void> {
    const doctor = await this.repo.findById(id);
    if (!doctor) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    await this.repo.updateSpecialty(id, name);
  }
}
