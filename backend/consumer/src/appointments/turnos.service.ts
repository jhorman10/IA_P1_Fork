import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../schemas/appointment.schema';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { AppointmentEventPayload, AppointmentPriority } from '../types/appointment-event';

// ⚕️ HUMAN CHECK - Priority order for the scheduler
const PRIORITY_ORDER: Record<AppointmentPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
};

@Injectable()
export class TurnosService {
    private readonly logger = new Logger(TurnosService.name);

    constructor(@InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>) { }

    /**
     * Creates an appointment in 'waiting' state.
     */
    async createAppointment(data: CreateAppointmentDto): Promise<AppointmentDocument> {
        const appointment = new this.appointmentModel({
            idCard: data.idCard,
            fullName: data.fullName,
            office: null,
            status: 'waiting',
            priority: data.priority ?? 'medium',
            timestamp: Date.now(),
        });

        const saved = await appointment.save();
        this.logger.log(`Appointment created for patient ${saved.idCard} — ID: ${saved._id}`);
        return saved;
    }

    /**
     * Find appointments in waiting state, sorted by priority and timestamp.
     */
    async findWaitingAppointments(): Promise<AppointmentDocument[]> {
        const appointments = await this.appointmentModel
            .find({ status: 'waiting' })
            .exec();

        appointments.sort((a, b) => {
            const pA = PRIORITY_ORDER[a.priority] ?? PRIORITY_ORDER.medium;
            const pB = PRIORITY_ORDER[b.priority] ?? PRIORITY_ORDER.medium;
            if (pA !== pB) return pA - pB;
            return a.timestamp - b.timestamp;
        });

        return appointments;
    }

    /**
     * IDs of currently occupied offices.
     */
    async getOccupiedOffices(): Promise<string[]> {
        const appointments = await this.appointmentModel
            .find({ status: 'called', office: { $ne: null } })
            .select('office')
            .lean()
            .exec();

        return appointments
            .map(t => t.office)
            .filter((c): c is string => c !== null && c !== undefined);
    }

    /**
     * Atomic assignment of an office to an appointment.
     */
    async assignOffice(appointmentId: string, office: string): Promise<AppointmentDocument | null> {
        const randomDurationSeconds = Math.floor(Math.random() * (15 - 8 + 1)) + 8;
        const completedAt = Date.now() + randomDurationSeconds * 1000;

        const appointment = await this.appointmentModel.findOneAndUpdate(
            { _id: appointmentId, status: 'waiting' },
            {
                office,
                status: 'called',
                completedAt,
            },
            { new: true },
        ).exec();

        if (appointment) {
            this.logger.log(`Appointment ${appointmentId} assigned to office ${office} (duration: ${randomDurationSeconds}s)`);
        }

        return appointment;
    }

    /**
     * Transition appointments from 'called' to 'completed' if time exposure has expired.
     */
    async completeCalledAppointments(): Promise<AppointmentDocument[]> {
        const now = Date.now();
        const expired = await this.appointmentModel.find({
            status: 'called',
            completedAt: { $lte: now }
        }).exec();

        if (expired.length === 0) return [];

        await this.appointmentModel.updateMany(
            {
                status: 'called',
                completedAt: { $lte: now }
            },
            { status: 'completed' },
        ).exec();

        this.logger.log(`Completed ${expired.length} appointments whose attention time expired.`);

        return expired.map(t => {
            t.status = 'completed';
            return t;
        });
    }

    /**
     * Maps an AppointmentDocument to AppointmentEventPayload for events.
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
            completedAt: appointment.completedAt ?? undefined,
        };
    }
}
