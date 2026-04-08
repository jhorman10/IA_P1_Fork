import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { DoctorView } from "../../domain/models/doctor-view";
import { DoctorStatus } from "../../domain/models/doctor-view";
import {
  CreateDoctorCommand,
  DoctorServicePort,
} from "../../domain/ports/inbound/doctor-service.port";
import {
  AppointmentLifecyclePublisherPort,
  LIFECYCLE_PUBLISHER_TOKEN,
} from "../../domain/ports/outbound/appointment-lifecycle-publisher.port";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import { Doctor, DoctorDocument } from "../../schemas/doctor.schema";

/**
 * Application Use Case: Doctor Service
 * SPEC-003/015/016: Lógica de negocio sobre la entidad Doctor.
 * SRP: Orquesta DoctorRepository y valida consultorio contra catálogo Office.
 */
@Injectable()
export class DoctorServiceImpl implements DoctorServicePort {
  constructor(
    @Inject("DoctorRepository")
    private readonly repo: DoctorRepository,
    @Inject(LIFECYCLE_PUBLISHER_TOKEN)
    private readonly lifecyclePublisher: AppointmentLifecyclePublisherPort,
    @InjectModel(Doctor.name)
    private readonly doctorModel: Model<DoctorDocument>,
  ) {}

  async createDoctor(command: CreateDoctorCommand): Promise<DoctorView> {
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

  async checkIn(id: string, office: string): Promise<DoctorView> {
    const doctor = await this.repo.findById(id);
    if (!doctor) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    if (doctor.status === "available") {
      throw new ConflictException("El médico ya está disponible");
    }

    // SPEC-016: Validate office exists in catalog and is enabled
    const officeDoc = await this.doctorModel.db
      .collection("offices")
      .findOne({ number: office });
    if (!officeDoc) {
      throw new BadRequestException(
        `El consultorio ${office} no existe en el catálogo`,
      );
    }
    if (!officeDoc["enabled"]) {
      throw new ConflictException(
        `El consultorio ${office} está deshabilitado`,
      );
    }

    // SPEC-016: Validate the office is not currently occupied (race-condition guard)
    const occupant = await this.doctorModel
      .findOne({ office, status: { $in: ["available", "busy"] } })
      .exec();
    if (occupant) {
      throw new ConflictException(
        `El consultorio ${office} ya está ocupado`,
      );
    }

    const updated = await this.repo.updateStatusAndOffice(
      id,
      "available",
      office,
    );
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
        "El médico tiene un paciente asignado y no puede hacer check-out",
      );
    }
    const updated = await this.repo.updateStatusAndOffice(id, "offline", null);
    if (!updated) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    return updated;
  }

  async getAvailableOffices(): Promise<string[]> {
    // Get all enabled offices from catalog
    const enabledOffices = await this.doctorModel.db
      .collection("offices")
      .find({ enabled: true }, { projection: { number: 1 } })
      .toArray();

    if (enabledOffices.length === 0) return [];

    const enabledNumbers = (
      enabledOffices as unknown as Array<{ number: string }>
    ).map((o) => o.number);

    // Get offices currently occupied by active doctors
    const activeDoctors = await this.doctorModel
      .find(
        {
          status: { $in: ["available", "busy"] },
          office: { $ne: null },
        },
        { office: 1 },
      )
      .exec();

    const occupiedSet = new Set(
      activeDoctors.map((d) => d.office).filter(Boolean),
    );

    // Return enabled offices that are not occupied, sorted numerically
    return enabledNumbers
      .filter((n) => !occupiedSet.has(n))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }

  async updateSpecialty(
    id: string,
    name: string,
    specialtyId?: string,
  ): Promise<void> {
    const doctor = await this.repo.findById(id);
    if (!doctor) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }
    // SPEC-015: forward specialtyId so the catalog reference stays in sync
    await this.repo.updateSpecialty(id, name, specialtyId ?? null);
  }
}
