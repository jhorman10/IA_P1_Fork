// SPEC-011: AuditLog domain types — operational audit trail

export type AuditAction =
  | "PROFILE_CREATED"
  | "PROFILE_UPDATED"
  | "DOCTOR_CHECK_IN"
  | "DOCTOR_CHECK_OUT"
  | "DOCTOR_CREATED"
  | "APPOINTMENT_CREATED"
  | "SESSION_RESOLVED";

export interface AuditLogFilters {
  action?: AuditAction;
  actorUid?: string;
  actorSearch?: string;
  from?: number;
  to?: number;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorUid: string;
  targetUid: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  timestamp: number;
  createdAt: string;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
