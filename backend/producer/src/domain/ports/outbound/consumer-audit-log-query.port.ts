/**
 * SPEC-013: Outbound port — read-only query over consumer's audit_logs collection.
 * Implemented by MongooseConsumerAuditLogAdapter.
 *
 * This port allows the producer to read timing events written by the consumer
 * into the shared `audit_logs` collection, enabling calculation of
 * avgWaitTimeMinutes and avgConsultationTimeMinutes without schema migrations.
 */

export type ConsumerAuditAction =
  | "APPOINTMENT_ASSIGNED"
  | "APPOINTMENT_COMPLETED";

export interface ConsumerAuditTimingEntry {
  /** MongoDB ObjectId as string — can be null for non-appointment events. */
  appointmentId: string | null;
  action: ConsumerAuditAction;
  /** Epoch ms — moment recorded by the consumer. */
  timestamp: number;
}

export interface ConsumerAuditLogQueryPort {
  /**
   * Returns all APPOINTMENT_ASSIGNED and APPOINTMENT_COMPLETED events
   * with timestamp >= fromMs. Used to compute wait and consultation averages.
   */
  findTimingEvents(
    actions: ConsumerAuditAction[],
    fromMs: number,
  ): Promise<ConsumerAuditTimingEntry[]>;
}

/** DI token for ConsumerAuditLogQueryPort. */
export const CONSUMER_AUDIT_LOG_QUERY_PORT = "CONSUMER_AUDIT_LOG_QUERY_PORT";
