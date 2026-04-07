import { SetMetadata } from "@nestjs/common";

import { ProfileRole } from "../../schemas/profile.schema";

export const ROLES_KEY = "roles";

/**
 * SPEC-004: Mark an endpoint with the roles that are allowed to access it.
 * Consumed by RoleGuard.
 */
export const Roles = (...roles: ProfileRole[]) => SetMetadata(ROLES_KEY, roles);
