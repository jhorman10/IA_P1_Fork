import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { Doctor } from "../../domain/entities/doctor.entity";
import { DoctorDocument, DoctorStatus } from "../../schemas/doctor.schema";

@Injectable()
export class MongooseDoctorRepository {
  constructor(
    @InjectModel("Doctor") private readonly model: Model<DoctorDocument>,
  ) {}

  async findAvailable(): Promise<Doctor[]> {
    const docs = await this.model.find({ status: "available" }).exec();
    return docs.map(
      (d: DoctorDocument) =>
        new Doctor(
          d._id?.toString() ?? String(d._id),
          d.name,
          d.specialty,
          d.office,
          d.status,
        ),
    );
  }

  async findById(id: string): Promise<Doctor | null> {
    const doc = await this.model.findById(id).exec();
    if (!doc) return null;
    return new Doctor(
      doc._id?.toString() ?? String(doc._id),
      doc.name,
      doc.specialty,
      doc.office,
      doc.status,
    );
  }

  async findAll(): Promise<Doctor[]> {
    const docs = await this.model.find().exec();
    return docs.map(
      (d: DoctorDocument) =>
        new Doctor(
          d._id?.toString() ?? String(d._id),
          d.name,
          d.specialty,
          d.office,
          d.status,
        ),
    );
  }

  async updateStatus(id: string, status: DoctorStatus): Promise<Doctor | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!doc) return null;
    return new Doctor(
      doc._id?.toString() ?? String(doc._id),
      doc.name,
      doc.specialty,
      doc.office,
      doc.status,
    );
  }
}
