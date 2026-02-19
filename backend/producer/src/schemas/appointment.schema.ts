import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AppointmentStatus, AppointmentPriority } from '../types/appointment-event';

export type AppointmentDocument = HydratedDocument<Appointment>;

// ⚕️ HUMAN CHECK - Appointment Schema (Producer - read-only)
// Must be synced with the Consumer schema.
// ⚕️ HUMAN CHECK - MongoDB Indexes (A-02)
// Producer uses these for Dashboard queries and patient history lookup.
@Schema({ timestamps: true })
export class Appointment {
    @Prop({ required: true, index: true })
    idCard!: number;

    @Prop({ required: true })
    fullName!: string;

    // ⚕️ HUMAN CHECK - Nullable office
    // null when the patient is waiting
    @Prop({ default: null, index: true })
    office!: string | null;

    @Prop({ default: 'waiting', enum: ['waiting', 'called', 'completed'], index: true })
    status!: AppointmentStatus;

    @Prop({ default: 'medium', enum: ['high', 'medium', 'low'] })
    priority!: AppointmentPriority;

    // ⚕️ HUMAN CHECK - Creation timestamp (epoch ms)
    @Prop({ default: () => Date.now() })
    timestamp!: number;

    // ⚕️ HUMAN CHECK - Completion timestamp
    @Prop({ default: null })
    completedAt!: number | null;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

