import { ProfileRole, ProfileStatus } from "../../schemas/profile.schema";

export type { ProfileRole, ProfileStatus };

/**
 * SPEC-004: Read model for Profile — contrato de salida seguro para exponer datos del Usuario.
 * No incluye campos internos de MongoDB (_id, __v).
 */
export interface ProfileView {
  uid: string;
  email: string;
  display_name: string;
  role: ProfileRole;
  status: ProfileStatus;
  doctor_id: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
