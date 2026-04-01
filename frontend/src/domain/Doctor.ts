// SPEC-003: nueva entidad Doctor
export type DoctorStatus = "available" | "busy" | "offline";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  office: string;
  status: DoctorStatus;
  createdAt?: string;
  updatedAt?: string;
}
