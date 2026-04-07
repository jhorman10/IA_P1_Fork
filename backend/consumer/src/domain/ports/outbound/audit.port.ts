import { AuditAction, AuditDetails } from "../../../schemas/audit-log.schema";

export interface AuditEntry {
  action: AuditAction;
  appointmentId: string | null;
  doctorId: string | null;
  details: AuditDetails;
  timestamp: number;
}

export interface AuditPort {
  log(entry: AuditEntry): Promise<void>;
}
