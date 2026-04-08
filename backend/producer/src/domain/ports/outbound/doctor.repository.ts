import { DoctorStatus, DoctorView } from "../../models/doctor-view";
import { CreateDoctorCommand } from "../inbound/doctor-service.port";

/**
 * Outbound Port: Doctor Repository
 * SPEC-003/015: Operaciones de persistencia sobre la colección de médicos.
 */
export interface DoctorRepository {
  save(command: CreateDoctorCommand): Promise<DoctorView>;
  findAll(status?: DoctorStatus): Promise<DoctorView[]>;
  findById(id: string): Promise<DoctorView | null>;
  findByOffice(office: string): Promise<DoctorView | null>;
  updateStatus(id: string, status: DoctorStatus): Promise<DoctorView | null>;
  /** SPEC-015: Atomically set status and office in one update (check-in / check-out). */
  updateStatusAndOffice(
    id: string,
    status: DoctorStatus,
    office: string | null,
  ): Promise<DoctorView | null>;
  /** SPEC-015: Update display name and optionally the specialtyId catalog reference. */
  updateSpecialty(
    id: string,
    name: string,
    specialtyId?: string | null,
  ): Promise<void>;
}
