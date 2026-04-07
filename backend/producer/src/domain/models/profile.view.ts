/**
 * Domain Read Model: Profile
 * SPEC-004: Perfil operativo del usuario autenticado mediante Firebase.
 */

export type ProfileRole = "admin" | "recepcionista" | "doctor";
export type ProfileStatus = "active" | "inactive";

export interface ProfileView {
  uid: string;
  email: string;
  displayName: string;
  role: ProfileRole;
  status: ProfileStatus;
  doctorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
