import { DoctorStatus, DoctorView } from "../../models/doctor-view";

/**
 * Command: Create Doctor
 * SPEC-003: Datos necesarios para registrar un nuevo médico.
 */
export interface CreateDoctorCommand {
  name: string;
  specialty: string;
  office: string;
}

/**
 * Inbound Port: Doctor Service
 * SPEC-003: Contratos de las operaciones de negocio sobre médicos.
 */
export interface DoctorServicePort {
  createDoctor(command: CreateDoctorCommand): Promise<DoctorView>;
  findAll(status?: DoctorStatus): Promise<DoctorView[]>;
  findById(id: string): Promise<DoctorView>;
  checkIn(id: string): Promise<DoctorView>;
  checkOut(id: string): Promise<DoctorView>;
}
