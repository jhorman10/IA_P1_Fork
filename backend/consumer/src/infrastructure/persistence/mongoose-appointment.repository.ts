import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { Appointment, AppointmentStatus, AppointmentPriority } from '../../domain/entities/appointment.entity';
import { Appointment as AppointmentSchema, AppointmentDocument } from '../../schemas/appointment.schema';
import { IdCard } from '../../domain/value-objects/id-card.value-object';

// Pattern: Adapter + Repository — Bridges Mongoose with the Domain Port
// ⚕️ HUMAN CHECK - DIP: Implements domain port using infra-specific Mongoose

@Injectable()
export class MongooseAppointmentRepository implements AppointmentRepository {
    constructor(
        @InjectModel(AppointmentSchema.name)
        private readonly model: Model<AppointmentDocument>,
    ) { }

    async findWaiting(): Promise<Appointment[]> {
        const docs = await this.model
            .find({ status: 'waiting' })
            .sort({ priority: 1, timestamp: 1 })
            .exec();
        return docs.map(doc => this.mapToDomain(doc));
    }

    async getOccupiedOfficeIds(): Promise<string[]> {
        const docs = await this.model
            .find({ status: 'called' })
            .select('office')
            .lean()
            .exec();
        return docs.map(d => String(d.office));
    }

    async save(appointment: Appointment): Promise<Appointment> {
        const updated = await this.model.findByIdAndUpdate(
            appointment.id,
            {
                idCard: appointment.idCard.toValue(),
                fullName: appointment.fullName,
                priority: appointment.priority,
                status: appointment.status,
                office: appointment.office,
                completedAt: appointment.completedAt,
            },
            { new: true, upsert: true },
        ).exec();
        return this.mapToDomain(updated);
    }

    async findById(id: string): Promise<Appointment | null> {
        const doc = await this.model.findById(id).exec();
        return doc ? this.mapToDomain(doc) : null;
    }

    async findByIdCardAndActive(idCard: IdCard): Promise<Appointment | null> {
        const doc = await this.model.findOne({
            idCard: idCard.toValue(),
            status: { $in: ['waiting', 'called'] }
        }).exec();
        return doc ? this.mapToDomain(doc) : null;
    }

    async findExpiredCalled(now: number): Promise<Appointment[]> {
        const docs = await this.model.find({
            status: 'called',
            completedAt: { $lte: now },
        }).exec();
        return docs.map(doc => this.mapToDomain(doc));
    }

    async updateStatus(id: string, status: string): Promise<void> {
        await this.model.findByIdAndUpdate(id, { status }).exec();
    }

    private mapToDomain(doc: AppointmentDocument): Appointment {
        return new Appointment(
            String(doc._id),
            new IdCard(doc.idCard),
            doc.fullName,
            doc.priority as AppointmentPriority,
            doc.status as AppointmentStatus,
            doc.office,
            doc.timestamp,
            doc.completedAt,
        );
    }
}
