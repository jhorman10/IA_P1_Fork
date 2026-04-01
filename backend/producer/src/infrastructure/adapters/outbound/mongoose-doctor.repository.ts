import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { DoctorView, DoctorStatus } from "../../../domain/models/doctor-view";
import { DoctorRepository } from "../../../domain/ports/outbound/doctor.repository";
import { Doctor, DoctorDocument } from "../../../schemas/doctor.schema";

/**
 * Adapter: Infrastructure — Mongoose implementation of DoctorRepository (Producer).
 * SPEC-003: Gestiona CRUD de médicos y consultas por estado/consultorio.
 * SRP: Solo responsable del acceso a datos de médicos. Mapeo en línea (sin mapper separado
 * dado que DoctorView es plano y no tiene VOs de dominio en el Producer).
 */
@Injectable()
export class MongooseDoctorRepository implements DoctorRepository {
  constructor(
    @InjectModel(Doctor.name)
    private readonly model: Model<DoctorDocument>,
  ) {}

  async findAll(status?: DoctorStatus): Promise<DoctorView[]> {
    const filter = status ? { status } : {};
    const docs = await this.model.find(filter).exec();
    return docs.map((doc) => this.toView(doc));
  }

  async findById(id: string): Promise<DoctorView | null> {
    try {
      const doc = await this.model.findById(id).exec();
      return doc ? this.toView(doc) : null;
    } catch {
      return null;
    }
  }

  async findByOffice(office: string): Promise<DoctorView | null> {
    const doc = await this.model.findOne({ office }).exec();
    return doc ? this.toView(doc) : null;
  }

  async save(
    data: Omit<DoctorView, "id" | "createdAt" | "updatedAt">,
  ): Promise<DoctorView> {
    const created = await this.model.create(data);
    return this.toView(created);
  }

  async updateStatus(
    id: string,
    status: DoctorStatus,
  ): Promise<DoctorView | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    return doc ? this.toView(doc) : null;
  }

  private toView(doc: DoctorDocument): DoctorView {
    return {
      id: String(doc._id),
      name: doc.name,
      specialty: doc.specialty,
      office: doc.office,
      status: doc.status,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
