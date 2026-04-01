import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { Doctor } from "../../domain/entities/doctor.entity";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import {
  Doctor as DoctorSchema,
  DoctorDocument,
  DoctorStatus,
} from "../../schemas/doctor.schema";
import { DoctorMapper } from "./doctor.mapper";

/**
 * Adapter: Infrastructure — Mongoose implementation of DoctorRepository.
 * SPEC-003: Proporciona acceso de lectura y actualización de estado de médicos.
 * SRP: Solo responsable de consultas/actualizaciones y mapeo a entidades de dominio.
 */
@Injectable()
export class MongooseDoctorRepository implements DoctorRepository {
  constructor(
    @InjectModel(DoctorSchema.name)
    private readonly model: Model<DoctorDocument>,
  ) {}

  async findAvailable(): Promise<Doctor[]> {
    const docs = await this.model.find({ status: "available" }).exec();
    return docs.map((doc) => DoctorMapper.toDomain(doc));
  }

  async findById(id: string): Promise<Doctor | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? DoctorMapper.toDomain(doc) : null;
  }

  async findAll(): Promise<Doctor[]> {
    const docs = await this.model.find().exec();
    return docs.map((doc) => DoctorMapper.toDomain(doc));
  }

  async updateStatus(id: string, status: DoctorStatus): Promise<Doctor | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    return doc ? DoctorMapper.toDomain(doc) : null;
  }
}
