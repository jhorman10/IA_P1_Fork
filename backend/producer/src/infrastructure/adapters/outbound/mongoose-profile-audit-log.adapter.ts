import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  ProfileAuditEntry,
  ProfileAuditLogRepository,
} from "../../../domain/ports/outbound/profile-audit-log.repository";
import {
  ProfileAuditLog,
  ProfileAuditLogDocument,
} from "../../../schemas/profile-audit-log.schema";

/**
 * SPEC-006: Adapter — Mongoose implementation of ProfileAuditLogRepository.
 * Persists profile change entries in the `profile_audit_logs` collection.
 * Write-only invariant: no update or delete operations are ever issued.
 */
@Injectable()
export class MongooseProfileAuditLogAdapter implements ProfileAuditLogRepository {
  constructor(
    @InjectModel(ProfileAuditLog.name)
    private readonly model: Model<ProfileAuditLogDocument>,
  ) {}

  async log(entry: ProfileAuditEntry): Promise<void> {
    await this.model.create({
      profileUid: entry.profileUid,
      changedBy: entry.changedBy,
      before: entry.before,
      after: entry.after,
      reason: entry.reason ?? null,
      timestamp: entry.timestamp,
    });
  }
}
