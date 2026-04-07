import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { SpecialtyView } from "../../../domain/models/specialty-view";
import { SpecialtyRepository } from "../../../domain/ports/outbound/specialty.repository";
import { Doctor, DoctorDocument } from "../../../schemas/doctor.schema";
import {
  Specialty,
  SpecialtyDocument,
} from "../../../schemas/specialty.schema";

/**
 * Adapter: Infrastructure — Mongoose implementation of SpecialtyRepository.
 * SPEC-015: Gestiona persistencia del catálogo de especialidades.
 * SRP: Solo responsable del acceso a datos de especialidades. Mapeo en línea.
 * Nota: las queries por nombre usan collation { locale: "en", strength: 2 }
 * para respetar el índice case-insensitive definido en el schema.
 */
@Injectable()
export class MongooseSpecialtyRepository implements SpecialtyRepository {
  constructor(
    @InjectModel(Specialty.name)
    private readonly model: Model<SpecialtyDocument>,
    @InjectModel(Doctor.name)
    private readonly doctorModel: Model<DoctorDocument>,
  ) {}

  async findAll(): Promise<SpecialtyView[]> {
    const docs = await this.model.find().sort({ name: 1 }).exec();
    return docs.map((doc) => this.toView(doc));
  }

  async findById(id: string): Promise<SpecialtyView | null> {
    try {
      const doc = await this.model.findById(id).exec();
      return doc ? this.toView(doc) : null;
    } catch {
      return null;
    }
  }

  async findByName(name: string): Promise<SpecialtyView | null> {
    const doc = await this.model
      .findOne({ name })
      .collation({ locale: "en", strength: 2 })
      .exec();
    return doc ? this.toView(doc) : null;
  }

  async save(name: string): Promise<SpecialtyView> {
    const created = await this.model.create({ name });
    return this.toView(created);
  }

  async update(id: string, name: string): Promise<SpecialtyView | null> {
    try {
      const doc = await this.model
        .findByIdAndUpdate(id, { name }, { new: true })
        .exec();
      return doc ? this.toView(doc) : null;
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id).exec();
      return result !== null;
    } catch {
      return false;
    }
  }

  async countDoctorsBySpecialtyId(specialtyId: string): Promise<number> {
    return this.doctorModel.countDocuments({ specialtyId }).exec();
  }

  private toView(doc: SpecialtyDocument): SpecialtyView {
    return {
      id: String(doc._id),
      name: doc.name,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
