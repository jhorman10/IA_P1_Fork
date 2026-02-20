import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppointmentReadRepository } from '../../../domain/ports/outbound/appointment-read.repository';
import { Appointment, AppointmentDocument } from '../../../schemas/appointment.schema';
import { AppointmentEventPayload } from '../../../types/appointment-event';

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
    ) { }

    async findAll(): Promise<AppointmentEventPayload[]> {
        const docs = await this.appointmentModel
            .find()
            .sort({ timestamp: 1 })
            .exec();
        return docs.map(doc => this.toPayload(doc));
    }

    async findByIdCard(idCard: number): Promise<AppointmentEventPayload[]> {
        const docs = await this.appointmentModel
            .find({ idCard })
            .sort({ createdAt: -1 })
            .exec();

        if (docs.length === 0) {
            throw new NotFoundException(`No appointments found for ID card ${idCard}`);
        }

        return docs.map(doc => this.toPayload(doc));
    }

    /**
     * Maps a Mongoose document to the standardized event payload DTO.
     * SRP: Mapping responsibility isolated here, not in the service.
     */
    private toPayload(doc: AppointmentDocument): AppointmentEventPayload {
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
