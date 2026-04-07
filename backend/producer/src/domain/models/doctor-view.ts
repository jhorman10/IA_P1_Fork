/**
 * Read model for Doctor — used in Producer API responses.
 * SPEC-003: Contrato de salida seguro para exponer datos del médico.
 */
export type DoctorStatus = "available" | "busy" | "offline";

export interface DoctorView {
  id: string;
  name: string;
  specialty: string;
  office: string;
  status: DoctorStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
