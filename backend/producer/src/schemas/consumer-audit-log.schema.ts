import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ConsumerAuditLogDocument =
  HydratedDocument<ConsumerAuditLogReadModel>;

/**
 * SPEC-013: Read-only Mongoose schema for the consumer's `audit_logs` collection.
 * The producer never writes to this collection; it only queries timing events
 * (APPOINTMENT_ASSIGNED, APPOINTMENT_COMPLETED) to compute operational metrics.
 *
 * Kept minimal — only the fields needed for metrics calculation.
 */
@Schema({
  collection: "audit_logs",
  // No timestamps option: we read the raw `timestamp` field written by consumer
})
export class ConsumerAuditLogReadModel {
  @Prop({ required: true, type: String })
  action!: string;

  @Prop({ type: String, default: null })
  appointmentId!: string | null;

  /** Epoch ms — moment the consumer recorded the event. */
  @Prop({ required: true, type: Number })
  timestamp!: number;
}

export const ConsumerAuditLogSchema = SchemaFactory.createForClass(
  ConsumerAuditLogReadModel,
);
