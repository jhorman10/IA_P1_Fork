import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

import {
  AppointmentPriority,
  AppointmentStatus,
} from "../types/appointment-event";

export type AppointmentDocument = HydratedDocument<Appointment>;

// ⚕️ HUMAN CHECK - Esquema de Appointment
// Asegura que los campos y tipos cumplen los requisitos de negocio.
// ⚕️ HUMAN CHECK - Índices de MongoDB (A-02)
// idCard: Chequeo único (soporte de idempotencia) y búsqueda rápida de paciente
// status: Optimización para Scheduler y Dashboard
// Composite: Optimización para la consulta de turnos pendientes
@Schema({ timestamps: true })
export class Appointment {
  @Prop({ required: true, index: true })
  idCard!: number;

  @Prop({ required: true })
  fullName!: string;

  // Store domain UUID separately
  @Prop({ required: true, unique: true })
  domainId!: string;

  // ⚕️ HUMAN CHECK - Campo office nullable
  // null cuando está en espera, asignado por el scheduler
  @Prop({ type: String, default: null, index: true })
  office!: string | null;

  // ⚕️ HUMAN CHECK - Estados del Appointment
  @Prop({
    default: "waiting",
    enum: ["waiting", "called", "completed"],
    index: true,
  })
  status!: AppointmentStatus;

  // ⚕️ HUMAN CHECK - Prioridad del Appointment
  // Determina el orden de asignación en el scheduler
  @Prop({ default: "medium", enum: ["high", "medium", "low"] })
  priority!: AppointmentPriority;

  // ⚕️ HUMAN CHECK - Timestamp de creación (epoch ms)
  @Prop({ default: () => Date.now() })
  timestamp!: number;

  // ⚕️ HUMAN CHECK - Timestamp de finalización
  @Prop({ type: Number, default: null })
  completedAt!: number | null;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// ⚕️ HUMAN CHECK - Índice compuesto para optimización del Scheduler
AppointmentSchema.index({ status: 1, priority: 1, timestamp: 1 });
