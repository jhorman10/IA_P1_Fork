import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { DoctorStatus, DoctorView } from "../../../domain/models/doctor-view";
import { CreateDoctorCommand } from "../../../domain/ports/inbound/doctor-service.port";
import { DoctorRepository } from "../../../domain/ports/outbound/doctor.repository";
import { Doctor, DoctorDocument } from "../../../schemas/doctor.schema";

/**
 * Adapter: Infrastructure — Mongoose implementation of DoctorRepository (Producer).
 * SPEC-003: Gestiona persistencia de la colección de médicos.
 * SRP: Solo responsable del acceso a datos de médicos. Mapeo en línea.
 */
@Injectable()
export class MongooseDoctorRepository implements DoctorRepository {
  constructor(
    @InjectModel(Doctor.name)
    private readonly model: Model<DoctorDocument>,
  ) {}

  async save(command: CreateDoctorCommand): Promise<DoctorView> {
    const doc = await this.model.create({
      name: command.name,
      specialty: command.specialty,
      office: command.office ?? null,
      status: "offline",
    });
    return this.toView(doc);
  }

  async findAll(status?: DoctorStatus): Promise<DoctorView[]> {
    const query = status ? { status } : {};
    const docs = await this.model.find(query).exec();
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
      const doc = await this.model
        .findByIdAndUpdate(id, { $set: { status, office } }, { new: true })
        .exec();
      return doc ? this.toView(doc) : null;
    } catch {
      return null;
    }
  }

  async findByOffice(office: string): Promise<DoctorView | null> {
    const doc = await this.model
      .findOne({ office, status: { $in: ["available", "busy"] } })
      .exec();
    return doc ? this.toView(doc) : null;
  }

  async updateSpecialty(id: string, name: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) return;
      await this.model.findByIdAndUpdate(id, { specialty: name }).exec();
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
