import { ProfileRole, ProfileStatus } from "../../schemas/profile.schema";

/**
 * SPEC-004: Authenticated user payload attached to Express Request by FirebaseAuthGuard.
 */
export interface AuthenticatedUser {
  uid: string;
  role: ProfileRole;
  status: ProfileStatus;
  doctor_id: string | null;
}
