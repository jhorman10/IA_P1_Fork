import {
  OperationalAuditAction,
  OperationalAuditEntry,
} from "./operational-audit.port";

export interface AuditLogFilters {
  action?: OperationalAuditAction;
  actorUid?: string;
  /** Epoch ms, inclusive lower bound on timestamp. */
  from?: number;
  /** Epoch ms, inclusive upper bound on timestamp. */
  to?: number;
}

export interface AuditLogPage {
  data: OperationalAuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * SPEC-011: Outbound port — read-only query over operational audit logs.
 * Implemented by MongooseOperationalAuditAdapter.
 */
export interface OperationalAuditQueryPort {
  findPaginated(
    filters: AuditLogFilters,
    page: number,
    limit: number,
  ): Promise<AuditLogPage>;
}

/** DI token for OperationalAuditQueryPort. */
export const OPERATIONAL_AUDIT_QUERY_PORT = "OPERATIONAL_AUDIT_QUERY_PORT";
