// SPEC-003 / SPEC-008 / SPEC-014 / SPEC-015: Doctor domain model
export type DoctorStatus = "available" | "busy" | "offline";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  /** SPEC-015: specialty ID reference (optional — backend may not return it always) */
  specialtyId?: string;
  office: string | null;
  status: DoctorStatus;
  createdAt?: string;
  updatedAt?: string;
}
