import { DoctorStatus, DoctorView } from "../../models/doctor-view";
import { CreateDoctorCommand } from "../inbound/doctor-service.port";

/**
 * Outbound Port: Doctor Repository
 * SPEC-003: Operaciones de persistencia sobre la colección de médicos.
 */
export interface DoctorRepository {
  save(command: CreateDoctorCommand): Promise<DoctorView>;
  findAll(status?: DoctorStatus): Promise<DoctorView[]>;
  findById(id: string): Promise<DoctorView | null>;
  findByOffice(office: string): Promise<DoctorView | null>;
  updateStatus(id: string, status: DoctorStatus): Promise<DoctorView | null>;
  updateSpecialty(id: string, name: string): Promise<void>;
}
