import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

import {
  AppointmentPriority,
  AppointmentStatus,
} from "../types/appointment-event";

export type AppointmentDocument = HydratedDocument<Appointment>;

// ⚕️ HUMAN CHECK - Esquema de Appointment (Producer - solo lectura)
// Debe estar sincronizado con el esquema del Consumer.
// ⚕️ HUMAN CHECK - Índices de MongoDB (A-02)
// El Producer los usa para queries de Dashboard y consulta de historial de paciente.
@Schema({ timestamps: true })
export class Appointment {
  @Prop({ required: true, index: true })
  idCard!: number;

  @Prop({ required: true })
  fullName!: string;

  // ⚕️ HUMAN CHECK - Campo office nullable
  // null cuando el paciente está en espera
  @Prop({ type: String, default: null, index: true })
  office!: string | null;

  // Doctor assigned to the appointment (domain id)
  @Prop({ type: String, default: null, index: true })
  doctorId!: string | null;

  @Prop({
    default: "waiting",
    enum: ["waiting", "called", "completed"],
    index: true,
  })
  status!: AppointmentStatus;

  @Prop({ default: "medium", enum: ["high", "medium", "low"] })
  priority!: AppointmentPriority;

  // ⚕️ HUMAN CHECK - Timestamp de creación (epoch ms)
  @Prop({ default: () => Date.now() })
  timestamp!: number;

  // ⚕️ HUMAN CHECK - Timestamp de finalización
  @Prop({ type: Number, default: null })
  completedAt!: number | null;

  // SPEC-003: Nombre desnormalizado para consultas rápidas sin lookup
  @Prop({ type: String, default: null, maxlength: 100 })
  doctorName!: string | null;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
