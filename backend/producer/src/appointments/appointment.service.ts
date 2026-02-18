import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../schemas/appointment.schema';
import { AppointmentEventPayload } from '../types/appointment-event';

@Injectable()
export class AppointmentService {
    constructor(@InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>) { }

    /**
     * Get all appointments ordered by timestamp (oldest first).
     */
    async findAll(): Promise<AppointmentDocument[]> {
        return this.appointmentModel
            .find()
            .sort({ timestamp: 1 })
            .exec();
    }

    /**
     * Find appointments by patient ID card.
     */
    async findByIdCard(idCard: number): Promise<AppointmentDocument[]> {
        const appointments = await this.appointmentModel
            .find({ idCard })
            .sort({ createdAt: -1 })
            .exec();

        if (appointments.length === 0) {
            throw new NotFoundException(`No appointments found for ID card ${idCard}`);
        }

        return appointments;
    }

    /**
     * Maps an AppointmentDocument to AppointmentEventPayload for WebSocket broadcast.
     */
    toEventPayload(appointment: AppointmentDocument): AppointmentEventPayload {
        return {
            id: String(appointment._id),
            fullName: appointment.fullName,
            idCard: appointment.idCard,
            office: appointment.office,
            status: appointment.status,
            priority: appointment.priority,
            timestamp: appointment.timestamp,
        };
    }
}
