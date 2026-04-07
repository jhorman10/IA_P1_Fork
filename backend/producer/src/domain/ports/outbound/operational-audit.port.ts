import { OperationalAuditAction } from "../../../schemas/operational-audit-log.schema";

export { OperationalAuditAction };

export interface OperationalAuditEntry {
  action: OperationalAuditAction;
  actorUid: string;
  targetUid?: string | null;
  targetId?: string | null;
  details: Record<string, unknown>;
  timestamp: number;
  /** Populated by persistence adapters — MongoDB _id as string. */
  id?: string;
  /** Populated by persistence adapters — Mongoose createdAt timestamp. */
  createdAt?: Date;
}

/**
 * SPEC-011: Outbound port — write-only persistence for operational audit entries.
 * Implemented by MongooseOperationalAuditAdapter.
 *
 * - log(): fire-and-forget insert; caller must NOT await in the hot path.
 * - hasRecentEntry(): deduplication guard, used for SESSION_RESOLVED (24 h window).
 */
export interface OperationalAuditPort {
  log(entry: OperationalAuditEntry): Promise<void>;
  hasRecentEntry(
    actorUid: string,
    action: OperationalAuditAction,
    windowMs: number,
  ): Promise<boolean>;
}

/** DI token for OperationalAuditPort. */
export const OPERATIONAL_AUDIT_PORT = "OPERATIONAL_AUDIT_PORT";
