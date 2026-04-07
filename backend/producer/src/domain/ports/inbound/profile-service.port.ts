import {
  ProfileRole,
  ProfileStatus,
  ProfileView,
} from "../../models/profile-view";
import { ProfilePage } from "../outbound/profile.repository";

/**
 * Command: Create Profile
 * SPEC-004: Datos necesarios para registrar un nuevo perfil operativo.
 */
export interface CreateProfileCommand {
  uid: string;
  email: string;
  displayName: string;
  role: ProfileRole;
  doctorId?: string | null;
}

/**
 * Command: Update Profile
 * SPEC-004: Campos actualizables del perfil operativo.
 * SPEC-006: changedBy y reason agregados para auditoría de cambios.
 */
export interface UpdateProfileCommand {
  role?: ProfileRole;
  status?: ProfileStatus;
  doctorId?: string | null;
  /** SPEC-006: Firebase UID del admin que realiza el cambio (para auditoría). */
  changedBy?: string;
  /** SPEC-006: Motivo opcional del cambio (para auditoría). */
  reason?: string | null;
}

/**
 * Query filters for listing profiles.
 */
export interface ListProfilesQuery {
  role?: ProfileRole;
  status?: ProfileStatus;
  page?: number;
  limit?: number;
}

/**
 * Inbound Port: Profile Service
 * SPEC-004: Contratos de las operaciones de negocio sobre perfiles.
 * SPEC-006: initializeSelf() agregado para auto-inicialización de Perfil.
 */
export interface ProfileServicePort {
  resolveSession(uid: string): Promise<ProfileView>;
  findByUid(uid: string): Promise<ProfileView | null>;
  createProfile(command: CreateProfileCommand): Promise<ProfileView>;
  listProfiles(query: ListProfilesQuery): Promise<ProfilePage>;
  updateProfile(
    uid: string,
    command: UpdateProfileCommand,
  ): Promise<ProfileView>;
  /** SPEC-006: Creates a Profile for the authenticated user if it does not exist yet. */
  initializeSelf(
    uid: string,
    email: string,
    displayName: string,
    role?: Extract<ProfileRole, "recepcionista" | "doctor">,
  ): Promise<ProfileView>;
}

/** NestJS injection token for the Profile Service. */
export const PROFILE_SERVICE_TOKEN = "ProfileService";
