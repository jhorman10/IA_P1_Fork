import { DoctorStatus } from "../../../schemas/doctor.schema";
import { Doctor } from "../../entities/doctor.entity";

/**
 * Port: Outbound — Read repository for doctors.
 * SPEC-003: Usado por el motor de asignación para obtener médicos disponibles.
 */
export interface DoctorReadRepository {
  findAvailable(): Promise<Doctor[]>;
  findById(id: string): Promise<Doctor | null>;
  findAll(): Promise<Doctor[]>;
}

/**
 * Port: Outbound — Write repository for doctors.
 * SPEC-003: Usado para actualizar el estado del médico tras asignación o completar turno.
 */
export interface DoctorWriteRepository {
  updateStatus(id: string, status: DoctorStatus): Promise<Doctor | null>;
}

export interface DoctorRepository
  extends DoctorReadRepository, DoctorWriteRepository {}
