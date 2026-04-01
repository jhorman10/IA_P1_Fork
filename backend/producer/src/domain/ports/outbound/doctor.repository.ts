import { DoctorStatus } from "../../models/doctor-view";
import { DoctorView } from "../../models/doctor-view";

/**
 * Port: Outbound — Read repository for doctors (Producer side).
 * SPEC-003: Permite al Producer consultar y escribir médicos desde su capa de aplicación.
 */
export interface DoctorReadRepository {
  findAll(status?: DoctorStatus): Promise<DoctorView[]>;
  findById(id: string): Promise<DoctorView | null>;
  findByOffice(office: string): Promise<DoctorView | null>;
}

export interface DoctorWriteRepository {
  save(
    doctor: Omit<DoctorView, "id" | "createdAt" | "updatedAt">,
  ): Promise<DoctorView>;
  updateStatus(id: string, status: DoctorStatus): Promise<DoctorView | null>;
}

export interface DoctorRepository
  extends DoctorReadRepository, DoctorWriteRepository {}
