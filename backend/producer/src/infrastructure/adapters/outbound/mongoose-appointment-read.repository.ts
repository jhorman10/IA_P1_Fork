import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { AppointmentReadRepository } from "../../../domain/ports/outbound/appointment-read.repository";
import {
  Appointment,
  AppointmentDocument,
} from "../../../schemas/appointment.schema";
import { AppointmentView } from "../../../domain/models/appointment-view";

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

  async findWaiting(): Promise<AppointmentView[]> {
    const docs = await this.appointmentModel
      .find({ status: "waiting" })
      .sort({ timestamp: 1 })
      .exec();
    return docs.map((doc) => this.toPayload(doc));
  }

  async findActiveByIdCard(idCard: number): Promise<AppointmentView | null> {
    const doc = await this.appointmentModel
      .findOne({ idCard, status: { $in: ["waiting", "called"] } })
      .exec();
    return doc ? this.toPayload(doc) : null;
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
      status: doc.status,
      priority: doc.priority,
      timestamp: doc.timestamp,
      completedAt: doc.completedAt ?? undefined,
    };
  }
}
