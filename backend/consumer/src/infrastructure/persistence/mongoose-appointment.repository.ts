import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { Appointment } from '../../domain/entities/appointment.entity';
import { Appointment as AppointmentSchema, AppointmentDocument } from '../../schemas/appointment.schema';
import { IdCard } from '../../domain/value-objects/id-card.value-object';
import { AppointmentMapper } from './appointment.mapper';
import { AppointmentQuerySpecification } from '../../domain/specifications/appointment-query.specification';

// Pattern: Adapter + Repository — Bridges Mongoose with the Domain Port
// ⚕️ HUMAN CHECK - DIP: Implements domain port using infra-specific Mongoose
// SRP: Delegates mapping to AppointmentMapper and query logic to Specification

@Injectable()
export class MongooseAppointmentRepository implements AppointmentRepository {
    constructor(
        @InjectModel(AppointmentSchema.name)
        private readonly model: Model<AppointmentDocument>,
    ) { }

    async findWaiting(): Promise<Appointment[]> {
        const docs = await this.model
            .find({ status: 'waiting' })
            .sort(AppointmentQuerySpecification.QUEUE_SORT_ORDER)
            .exec();
        return docs.map(doc => AppointmentMapper.toDomain(doc));
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
        const persistenceData = AppointmentMapper.toPersistence(appointment);
        const updated = await this.model.findByIdAndUpdate(
            appointment.id,
            persistenceData,
            { new: true, upsert: true },
        ).exec();
        return AppointmentMapper.toDomain(updated);
    }

    async findById(id: string): Promise<Appointment | null> {
        const doc = await this.model.findById(id).exec();
        return doc ? AppointmentMapper.toDomain(doc) : null;
    }

    async findByIdCardAndActive(idCard: IdCard): Promise<Appointment | null> {
        const doc = await this.model.findOne({
            idCard: idCard.toValue(),
            ...AppointmentQuerySpecification.getActiveFilter()
        }).exec();
        return doc ? AppointmentMapper.toDomain(doc) : null;
    }

    async findExpiredCalled(now: number): Promise<Appointment[]> {
        const docs = await this.model.find(
            AppointmentQuerySpecification.getExpiredCalledFilter(now)
        ).exec();
        return docs.map(doc => AppointmentMapper.toDomain(doc));
    }

    async updateStatus(id: string, status: string): Promise<void> {
        await this.model.findByIdAndUpdate(id, { status }).exec();
    }
}
