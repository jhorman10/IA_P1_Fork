import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ProfileAuditLogDocument = HydratedDocument<ProfileAuditLog>;

/**
 * SPEC-006: Schema ProfileAuditLog.
 * Registro dedicado de cambios a Perfiles operativos por administradores.
 * Colección: profile_audit_logs
 *
 * Índices:
 *   - profileUid:  búsqueda de histórico de un perfil específico
 *   - changedBy:   búsqueda de acciones por administrador
 *   - timestamp:   ordenamiento cronológico
 */
@Schema({
  timestamps: false,
  collection: "profile_audit_logs",
})
export class ProfileAuditLog {
  /** Firebase UID del Perfil que fue modificado. */
  @Prop({ required: true, index: true, maxlength: 128 })
  profileUid!: string;

  /** Firebase UID del administrador que realizó el cambio. */
  @Prop({ required: true, index: true, maxlength: 128 })
  changedBy!: string;

  /** Estado del perfil antes del cambio (campos relevantes). */
  @Prop({ required: true, type: Object })
  before!: Record<string, unknown>;

  /** Estado del perfil después del cambio (campos relevantes). */
  @Prop({ required: true, type: Object })
  after!: Record<string, unknown>;

  /** Motivo del cambio proporcionado por el administrador (opcional). */
  @Prop({ type: String, default: null, maxlength: 500 })
  reason!: string | null;

  /** Epoch ms UTC — momento exacto del cambio, generado en el producer. */
  @Prop({ required: true, index: true })
  timestamp!: number;
}

export const ProfileAuditLogSchema =
  SchemaFactory.createForClass(ProfileAuditLog);
