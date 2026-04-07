import { SetMetadata } from "@nestjs/common";

import { OperationalAuditAction } from "../../domain/ports/outbound/operational-audit.port";

export const AUDIT_ACTION_KEY = "audit:action";

/**
 * SPEC-011: Mark an HTTP handler with the OperationalAuditAction to record on success.
 * Consumed by AuditInterceptor.
 *
 * Usage:
 *   @Auditable("PROFILE_CREATED")
 *   async createProfile(...) { ... }
 */
export const Auditable = (action: OperationalAuditAction) =>
  SetMetadata(AUDIT_ACTION_KEY, action);
