import { AuditAction, AuditDetails } from "../../../schemas/audit-log.schema";

export interface AuditEntry {
  action: AuditAction;
  appointmentId: string | null;
  doctorId: string | null;
  details: AuditDetails;
  timestamp: number;
}

/**
 * Port: Outbound — Write-only audit log.
 * SPEC-003: Persiste cada decisión de asignación / check-in / check-out.
 */
export interface AuditPort {
  log(entry: AuditEntry): Promise<void>;
}
