import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AuditAction =
  | "APPOINTMENT_ASSIGNED"
  | "APPOINTMENT_COMPLETED"
  | "DOCTOR_CHECK_IN"
  | "DOCTOR_CHECK_OUT";

export interface AuditDetails {
  patientIdCard?: number;
  doctorName?: string;
  office?: string;
  priority?: string;
  queuePosition?: number;
  [key: string]: unknown;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: "audit_logs", timestamps: true })
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

  @Prop({ type: Object, required: true })
  details!: AuditDetails;

  @Prop({ required: true })
  timestamp!: number;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
