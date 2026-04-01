export type DoctorStatus = "available" | "busy" | "offline";

/**
 * Read model for Doctor — used in Producer API responses.
 * SPEC-003: Contrato de salida seguro para exponer datos del médico.
 */
export interface DoctorView {
  id: string;
  name: string;
  specialty: string;
  office: string;
  status: DoctorStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
