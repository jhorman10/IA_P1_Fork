import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { AppointmentView } from "../../../domain/models/appointment-view";
import { AppointmentReadRepository } from "../../../domain/ports/outbound/appointment-read.repository";
import {
  Appointment,
  AppointmentDocument,
} from "../../../schemas/appointment.schema";

/**
 * Adapter: Infrastructure — Mongoose implementation of AppointmentReadRepository.
 * ⚕️ HUMAN CHECK - DIP: Implementa el puerto de dominio usando Mongoose (infraestructura)
 * SRP: Solo responsable de consultas de lectura y mapeo a DTOs
 */
@Injectable()
export class MongooseAppointmentReadRepository implements AppointmentReadRepository {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  async findAll(): Promise<AppointmentView[]> {
    const docs = await this.appointmentModel
      .find()
      .sort({ timestamp: 1 })
      .exec();
    return docs.map((doc) => this.toPayload(doc));
  }

  async findByIdCard(idCard: number): Promise<AppointmentView[]> {
    const docs = await this.appointmentModel
      .find({ idCard })
      .sort({ createdAt: -1 })
      .exec();

    if (docs.length === 0) {
      throw new NotFoundException(
        `No appointments found for ID card ${idCard}`,
      );
    }

    return docs.map((doc) => this.toPayload(doc));
  }

  async findById(id: string): Promise<AppointmentView | null> {
    const doc = await this.appointmentModel.findById(id).exec();
    if (!doc) return null;
    return this.toPayload(doc);
  }

  /**
   * Maps a Mongoose document to the standardized event payload DTO.
   * SRP: Mapping responsibility isolated here, not in the service.
   */
  private toPayload(doc: AppointmentDocument): AppointmentView {
    return {
      id: String(doc._id),
      fullName: doc.fullName,
      idCard: doc.idCard,
      office: doc.office,
      doctorId: (doc as any).doctorId ?? null,
      status: doc.status,
      priority: doc.priority,
      timestamp: doc.timestamp,
      completedAt: doc.completedAt ?? undefined,
    };
  }
}
