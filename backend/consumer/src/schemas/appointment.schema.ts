import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AppointmentStatus, AppointmentPriority } from '../types/appointment-event';

export type AppointmentDocument = HydratedDocument<Appointment>;

// ⚕️ HUMAN CHECK - Appointment Schema
// Ensuring fields and types meet business needs.
@Schema({ timestamps: true })
export class Appointment {
    @Prop({ required: true })
    idCard: number;

    @Prop({ required: true })
    fullName: string;

    // ⚕️ HUMAN CHECK - Nullable office
    // null when waiting, assigned by the scheduler
    @Prop({ default: null })
    office: string | null;

    // ⚕️ HUMAN CHECK - Appointment states
    @Prop({ default: 'waiting', enum: ['waiting', 'called', 'completed'] })
    status: AppointmentStatus;

    // ⚕️ HUMAN CHECK - Appointment priority
    // Determines assignment order in the scheduler
    @Prop({ default: 'medium', enum: ['high', 'medium', 'low'] })
    priority: AppointmentPriority;

    // ⚕️ HUMAN CHECK - Creation timestamp (epoch ms)
    @Prop({ default: () => Date.now() })
    timestamp: number;

    // ⚕️ HUMAN CHECK - Completion timestamp
    @Prop({ default: null })
    completedAt: number | null;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
