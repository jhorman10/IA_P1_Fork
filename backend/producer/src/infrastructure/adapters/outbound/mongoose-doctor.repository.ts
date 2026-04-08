import { ConflictException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { DoctorStatus, DoctorView } from "../../../domain/models/doctor-view";
import { CreateDoctorCommand } from "../../../domain/ports/inbound/doctor-service.port";
import { DoctorRepository } from "../../../domain/ports/outbound/doctor.repository";
import { Doctor, DoctorDocument } from "../../../schemas/doctor.schema";

/**
 * Adapter: Infrastructure — Mongoose implementation of DoctorRepository (Producer).
 * SPEC-003: Gestiona CRUD de médicos y consultas por estado/consultorio.
 * SRP: Solo responsable del acceso a datos de médicos. Mapeo en línea.
 */
@Injectable()
export class MongooseDoctorRepository implements DoctorRepository {
  constructor(
    @InjectModel(Doctor.name)
    private readonly model: Model<DoctorDocument>,
  ) {}

  async save(command: CreateDoctorCommand): Promise<DoctorView> {
    // SPEC-015: specialtyId will be persisted once Database Agent adds the field to
    // doctor.schema.ts. Cast avoids TS strict-mode error during the transition.
    const payload: Record<string, unknown> = {
      name: command.name,
      specialty: command.specialty,
      specialtyId: command.specialtyId ?? null,
      status: "offline",
    };
    // SPEC-015: Only include office when assigned; omit to keep field absent for partial index
    if (command.office) {
      payload.office = command.office;
    }
    const doc = await this.model.create(payload);
    return this.toView(doc);
  }

  async findAll(status?: DoctorStatus): Promise<DoctorView[]> {
    const filter = status ? { status } : {};
    const docs = await this.model.find(filter).exec();
    return docs.map((doc) => this.toView(doc));
  }

  async findById(id: string): Promise<DoctorView | null> {
    try {
      if (!Types.ObjectId.isValid(id)) return null;
      const doc = await this.model.findById(id).exec();
      return doc ? this.toView(doc) : null;
    } catch {
      return null;
    }
  }

  async updateStatus(
    id: string,
    status: DoctorStatus,
  ): Promise<DoctorView | null> {
    try {
      if (!Types.ObjectId.isValid(id)) return null;
      const doc = await this.model
        .findByIdAndUpdate(id, { status }, { new: true })
        .exec();
      return doc ? this.toView(doc) : null;
    } catch {
      return null;
    }
  }

  async updateStatusAndOffice(
    id: string,
    status: DoctorStatus,
    office: string | null,
  ): Promise<DoctorView | null> {
    try {
      if (!Types.ObjectId.isValid(id)) return null;
      // SPEC-015: When office is null (check-out), $unset the field so the
      // partial unique index excludes this doc and allows multiple offline doctors.
      const update = office
        ? { $set: { status, office } }
        : { $set: { status }, $unset: { office: "" } };
      const doc = await this.model
        .findByIdAndUpdate(id, update, { new: true })
        .exec();
      return doc ? this.toView(doc) : null;
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000 || code === 11001) {
        throw new ConflictException("El consultorio ya está ocupado");
      }
      return null;
    }
  }

  async findByOffice(office: string): Promise<DoctorView | null> {
    const doc = await this.model
      .findOne({ office, status: { $in: ["available", "busy"] } })
      .exec();
    return doc ? this.toView(doc) : null;
  }

  async updateSpecialty(
    id: string,
    name: string,
    specialtyId?: string | null,
  ): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) return;
      const update: Record<string, unknown> = { specialty: name };
      // SPEC-015: also update specialtyId reference when provided
      if (specialtyId !== undefined) update.specialtyId = specialtyId;
      await this.model.findByIdAndUpdate(id, update).exec();
    } catch {
      // no-op on invalid id
    }
  }

  private toView(doc: DoctorDocument): DoctorView {
    return {
      id: String(doc._id),
      name: doc.name,
      specialty: doc.specialty,
      office: doc.office ?? null,
      status: doc.status as DoctorStatus,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
