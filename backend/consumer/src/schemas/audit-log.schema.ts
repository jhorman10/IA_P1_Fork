import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AuditAction =
  | "APPOINTMENT_ASSIGNED"
  | "APPOINTMENT_COMPLETED"
  | "DOCTOR_CHECK_IN"
  | "DOCTOR_CHECK_OUT";

export type AuditLogDocument = HydratedDocument<AuditLog>;

export interface AuditDetails {
  patientIdCard?: number;
  patientName?: string;
  doctorName?: string;
  office?: string | null;
  priority?: string;
  queuePosition?: number;
  [key: string]: unknown;
}

/**
 * ⚕️ HUMAN CHECK - Schema AuditLog (Consumer — escritura)
 * Registro de auditoría por cada decisión de asignación / check-in / check-out.
 * Índices compuestos para consultas por tipo de acción + timestamp desc,
 * e índice simple por appointmentId para trazabilidad de turno.
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: "audit_logs",
})
export class AuditLog {
  @Prop({
    required: true,
    enum: [
      "APPOINTMENT_ASSIGNED",
      "APPOINTMENT_COMPLETED",
      "DOCTOR_CHECK_IN",
      "DOCTOR_CHECK_OUT",
    ] as AuditAction[],
  })
  action!: AuditAction;

  @Prop({ type: String, default: null })
  appointmentId!: string | null;

  @Prop({ type: String, default: null })
  doctorId!: string | null;

  @Prop({ required: true, type: Object })
  details!: AuditDetails;

  // Epoch ms — momento exacto de la acción de negocio
  @Prop({ required: true })
  timestamp!: number;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// SPEC-003: Consulta por tipo de acción, más recientes primero
AuditLogSchema.index({ action: 1, timestamp: -1 });

// SPEC-003: Auditoría por turno específico
AuditLogSchema.index({ appointmentId: 1 });
