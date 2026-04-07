// SPEC-004: Profile domain types
export type UserRole = "admin" | "recepcionista" | "doctor";

export type ProfileStatus = "active" | "inactive";

export interface Profile {
  uid: string;
  email: string;
  display_name: string;
  role: UserRole;
  status: ProfileStatus;
  doctor_id: string | null;
  allowed_modules?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateProfileDTO {
  /** Firebase UID — required when backend binds Firebase Auth to the profile */
  uid?: string;
  email: string;
  password?: string;
  display_name: string;
  role: UserRole;
  doctor_id?: string | null;
  /** SPEC-015: for doctor role — backend creates Doctor entity transparently */
  specialty_id?: string | null;
}

export interface UpdateProfileDTO {
  role?: UserRole;
  status?: ProfileStatus;
  doctor_id?: string | null;
  /** SPEC-015: for doctor role — update specialty reference */
  specialty_id?: string | null;
}

export interface ProfilesResponse {
  data: Profile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
