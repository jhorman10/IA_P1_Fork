import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AppointmentStatus, AppointmentPriority } from '../types/appointment-event';

export type AppointmentDocument = HydratedDocument<Appointment>;

// ⚕️ HUMAN CHECK - Appointment Schema
// Ensuring fields and types meet business needs.
// ⚕️ HUMAN CHECK - MongoDB Indexes (A-02)
// idCard: Unique check (idempotency support) and fast patient search
// status: Scheduler and Dashboard optimization
// Composite: Optimization for the pending appointments query
@Schema({ timestamps: true })
export class Appointment {
    @Prop({ required: true, index: true })
    idCard!: number;

    @Prop({ required: true })
    fullName!: string;

    // ⚕️ HUMAN CHECK - Nullable office
    // null when waiting, assigned by the scheduler
    @Prop({ default: null, index: true })
    office!: string | null;

    // ⚕️ HUMAN CHECK - Appointment states
    @Prop({ default: 'waiting', enum: ['waiting', 'called', 'completed'], index: true })
    status!: AppointmentStatus;

    // ⚕️ HUMAN CHECK - Appointment priority
    // Determines assignment order in the scheduler
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

// ⚕️ HUMAN CHECK - Composite index for Scheduler optimization
AppointmentSchema.index({ status: 1, priority: 1, timestamp: 1 });

