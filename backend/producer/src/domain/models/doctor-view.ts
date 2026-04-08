/**
 * Read model for Doctor — used in Producer API responses.
 * SPEC-003/015: Contrato de salida seguro para exponer datos del médico.
 * office es nullable: null cuando offline, string cuando en consultorio.
 */
export type DoctorStatus = "available" | "busy" | "offline";

export interface DoctorView {
  id: string;
  name: string;
  specialty: string;
  office: string | null;
  status: DoctorStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
