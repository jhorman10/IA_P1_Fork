import { ProfileView } from "../../models/profile-view";

/**
 * SPEC-006: Payload for a profile audit log entry.
 * Records the before/after state of a profile change made by an admin.
 */
export interface ProfileAuditEntry {
  /** Firebase UID of the profile that was modified. */
  profileUid: string;
  /** Firebase UID of the admin that performed the change. */
  changedBy: string;
  /** Relevant fields of the profile before the change. */
  before: Partial<ProfileView>;
  /** Relevant fields of the profile after the change. */
  after: Partial<ProfileView>;
  /** Optional reason provided by the admin. */
  reason?: string | null;
  /** Epoch ms UTC — moment of the change. */
  timestamp: number;
}

/**
 * SPEC-006: Outbound port — write-only persistence for profile audit entries.
 * Implemented by MongooseProfileAuditLogAdapter.
 */
export interface ProfileAuditLogRepository {
  log(entry: ProfileAuditEntry): Promise<void>;
}

/** NestJS injection token for ProfileAuditLogRepository. */
export const PROFILE_AUDIT_LOG_REPOSITORY_TOKEN = "ProfileAuditLogRepository";
