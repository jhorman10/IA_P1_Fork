import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { ProfileRole, ProfileView } from "../../domain/models/profile-view";
import {
  CreateProfileCommand,
  ListProfilesQuery,
  ProfileServicePort,
  UpdateProfileCommand,
} from "../../domain/ports/inbound/profile-service.port";
import {
  PROFILE_REPOSITORY_TOKEN,
  ProfilePage,
  ProfileRepository,
} from "../../domain/ports/outbound/profile.repository";
import {
  PROFILE_AUDIT_LOG_REPOSITORY_TOKEN,
  ProfileAuditLogRepository,
} from "../../domain/ports/outbound/profile-audit-log.repository";

/**
 * SPEC-004: Application Use Case — Profile Service.
 * SPEC-006: initializeSelf() + profile audit logging on updateProfile().
 * SRP: Only orchestrates the ProfileRepository and ProfileAuditLogRepository. No direct DB access.
 */
@Injectable()
export class ProfileServiceImpl implements ProfileServicePort {
  constructor(
    @Inject(PROFILE_REPOSITORY_TOKEN)
    private readonly repo: ProfileRepository,
    @Inject(PROFILE_AUDIT_LOG_REPOSITORY_TOKEN)
    private readonly auditLogRepo: ProfileAuditLogRepository,
  ) {}

  /**
   * Resolves session: returns active profile for the given Firebase uid.
   * HTTP 403 if profile not found or inactive.
   */
  async resolveSession(uid: string): Promise<ProfileView> {
    const profile = await this.repo.findByUid(uid);
    if (!profile) {
      throw new ForbiddenException("Perfil operativo no configurado");
    }
    if (profile.status !== "active") {
      throw new ForbiddenException("Perfil inactivo");
    }
    return profile;
  }

  /**
   * Returns the profile by uid or null (no throw).
   * Used by FirebaseAuthGuard.
   */
  async findByUid(uid: string): Promise<ProfileView | null> {
    return this.repo.findByUid(uid);
  }

  /**
   * Creates a new Profile.
   * Rules:
   *   - uid and email must be unique → 409 on duplicate
   *   - role=doctor requires doctor_id → 400 if missing
   */
  async createProfile(command: CreateProfileCommand): Promise<ProfileView> {
    if (command.role === "doctor" && !command.doctorId) {
      throw new BadRequestException(
        "doctor_id es obligatorio para el rol doctor",
      );
    }

    const [existsByUid, existsByEmail] = await Promise.all([
      this.repo.findByUid(command.uid),
      this.repo.findByEmail(command.email),
    ]);

    if (existsByUid || existsByEmail) {
      throw new ConflictException("Ya existe un Perfil con ese uid o email");
    }

    return this.repo.create({
      uid: command.uid,
      email: command.email,
      display_name: command.displayName,
      role: command.role,
      doctor_id: command.doctorId ?? null,
    });
  }

  /**
   * Paginated list of profiles. Admin-only enforcement at controller/guard level.
   */
  async listProfiles(query: ListProfilesQuery): Promise<ProfilePage> {
    return this.repo.findAll({
      role: query.role,
      status: query.status,
      page: query.page ?? 1,
      limit: Math.min(query.limit ?? 20, 100),
    });
  }

  /**
   * Updates role, status, or doctor_id of an existing profile.
   * Validates business rules before persisting.
   * SPEC-006: Persists a profile_audit_log entry after a successful update.
   */
  async updateProfile(
    uid: string,
    command: UpdateProfileCommand,
  ): Promise<ProfileView> {
    const existing = await this.repo.findByUid(uid);
    if (!existing) {
      throw new NotFoundException(`Perfil con uid ${uid} no encontrado`);
    }

    const newRole = command.role ?? existing.role;
    const newDoctorId =
      command.doctorId !== undefined ? command.doctorId : existing.doctor_id;

    if (newRole === "doctor" && !newDoctorId) {
      throw new BadRequestException(
        "doctor_id es obligatorio para el rol doctor",
      );
    }

    const updated = await this.repo.update(uid, {
      role: command.role,
      status: command.status,
      doctor_id: command.doctorId,
    });

    if (!updated) {
      throw new NotFoundException(`Perfil con uid ${uid} no encontrado`);
    }

    // SPEC-006: Persist profile audit log entry (fire-and-forget, never block response).
    if (command.changedBy) {
      const before = {
        role: existing.role,
        status: existing.status,
        doctor_id: existing.doctor_id,
      };
      const after = {
        role: updated.role,
        status: updated.status,
        doctor_id: updated.doctor_id,
      };
      this.auditLogRepo
        .log({
          profileUid: uid,
          changedBy: command.changedBy,
          before,
          after,
          reason: command.reason ?? null,
          timestamp: Date.now(),
        })
        .catch((err: unknown) =>
          console.warn("[ProfileService] profile audit log failed", err),
        );
    }

    return updated;
  }

  /**
   * SPEC-006: Self-initializes a Profile for an authenticated user who has no Profile yet.
   * Throws ConflictException (409) if a Profile already exists for this uid.
   * Admin role cannot be self-assigned.
   */
  async initializeSelf(
    uid: string,
    email: string,
    displayName: string,
    role?: Extract<ProfileRole, "recepcionista" | "doctor">,
  ): Promise<ProfileView> {
    const existing = await this.repo.findByUid(uid);
    if (existing) {
      throw new ConflictException("Ya existe un Perfil para este Usuario");
    }

    return this.repo.create({
      uid,
      email,
      display_name: displayName,
      role: role ?? "recepcionista",
      doctor_id: null,
    });
  }
}
