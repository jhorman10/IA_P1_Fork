import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type OperationalAuditAction =
  | "PROFILE_CREATED"
  | "PROFILE_UPDATED"
  | "DOCTOR_CHECK_IN"
  | "DOCTOR_CHECK_OUT"
  | "DOCTOR_CREATED"
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_COMPLETED"
  | "APPOINTMENT_CANCELLED"
  | "SESSION_RESOLVED"
  // SPEC-016: Office catalog admin actions
  | "OFFICE_CAPACITY_UPDATED"
  | "OFFICE_ENABLED"
  | "OFFICE_DISABLED";

export type OperationalAuditLogDocument = HydratedDocument<OperationalAuditLog>;

/**
 * SPEC-011: Schema OperationalAuditLog (Producer — escritura)
 * Registro de auditoría de operaciones HTTP administrativas del producer.
 * Colección separada de `audit_logs` del consumer — SRP entre microservicios.
 *
 * Índices:
 *   - { action: 1, timestamp: -1 }:              consulta por tipo de acción, más recientes primero
 *   - { actorUid: 1, timestamp: -1 }:            consulta de acciones por actor específico
 *   - { actorUid: 1, action: 1, timestamp: -1 }: deduplicación de SESSION_RESOLVED (24 h)
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: "operational_audit_logs",
})
export class OperationalAuditLog {
  @Prop({
    required: true,
    enum: [
      "PROFILE_CREATED",
      "PROFILE_UPDATED",
      "DOCTOR_CHECK_IN",
      "DOCTOR_CHECK_OUT",
      "DOCTOR_CREATED",
      "APPOINTMENT_CREATED",
      "APPOINTMENT_COMPLETED",
      "APPOINTMENT_CANCELLED",
      "SESSION_RESOLVED",
      "OFFICE_CAPACITY_UPDATED",
      "OFFICE_ENABLED",
      "OFFICE_DISABLED",
    ] as OperationalAuditAction[],
  })
  action!: OperationalAuditAction;

  /** Firebase UID del usuario que ejecutó la acción. */
  @Prop({ required: true, maxlength: 128 })
  actorUid!: string;

  /** Firebase UID del perfil/recurso afectado (si aplica). */
  @Prop({ type: String, default: null })
  targetUid!: string | null;

  /** MongoDB ObjectId del recurso afectado —doctor, appointment— (si aplica). */
  @Prop({ type: String, default: null })
  targetId!: string | null;

  /** Contexto libre de la operación (campos cambiados, valores previos/nuevos, etc.). */
  @Prop({ required: true, type: Object })
  details!: Record<string, unknown>;

  /** Epoch ms UTC — momento exacto de la operación, generado en el producer. */
  @Prop({ required: true })
  timestamp!: number;
}

export const OperationalAuditLogSchema =
  SchemaFactory.createForClass(OperationalAuditLog);

// SPEC-011: Consulta por tipo de acción, más recientes primero
OperationalAuditLogSchema.index({ action: 1, timestamp: -1 });

// SPEC-011: Consulta de acciones por actor específico
OperationalAuditLogSchema.index({ actorUid: 1, timestamp: -1 });

// SPEC-011: Verificar last SESSION_RESOLVED por actor (deduplicación 24 h)
OperationalAuditLogSchema.index({ actorUid: 1, action: 1, timestamp: -1 });
