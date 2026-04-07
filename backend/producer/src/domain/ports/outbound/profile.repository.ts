import {
  ProfileRole,
  ProfileStatus,
  ProfileView,
} from "../../models/profile-view";

/** Payload for creating a new Profile (no system-generated fields). */
export interface ProfileCreateInput {
  uid: string;
  email: string;
  display_name: string;
  role: ProfileRole;
  doctor_id?: string | null;
}

/** Partial payload for updating an existing Profile. */
export interface ProfileUpdateInput {
  role?: ProfileRole;
  status?: ProfileStatus;
  display_name?: string;
  doctor_id?: string | null;
}

/** Filters for paginated list queries. */
export interface ProfileListFilter {
  role?: ProfileRole;
  status?: ProfileStatus;
  page?: number;
  limit?: number;
}

/** Paginated result returned by findAll. */
export interface ProfilePage {
  data: ProfileView[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * SPEC-004: Outbound port — read/write repository for Profile persistence.
 * Owned by the data layer; implemented by MongooseProfileRepository.
 */
export interface ProfileRepository {
  /** Find a single Profile by Firebase UID. Returns null if not found. */
  findByUid(uid: string): Promise<ProfileView | null>;

  /** Find a single Profile by email address. Returns null if not found. */
  findByEmail(email: string): Promise<ProfileView | null>;

  /** Paginated list with optional role/status filters. */
  findAll(filter: ProfileListFilter): Promise<ProfilePage>;

  /** Persist a new Profile. Throws on duplicate uid or email (Mongoose duplicate-key). */
  create(data: ProfileCreateInput): Promise<ProfileView>;

  /**
   * Apply a partial update to an existing Profile identified by uid.
   * Returns the updated view, or null if the Profile does not exist.
   */
  update(uid: string, data: ProfileUpdateInput): Promise<ProfileView | null>;
}

/** NestJS injection token — use when binding the repository in a module provider. */
export const PROFILE_REPOSITORY_TOKEN = "ProfileRepository";
