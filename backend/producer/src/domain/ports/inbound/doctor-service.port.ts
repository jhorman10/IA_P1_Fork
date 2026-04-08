import { DoctorStatus, DoctorView } from "../../models/doctor-view";

/**
 * Command: Create Doctor
 * SPEC-003/015: Datos necesarios para registrar un nuevo médico.
 */
export interface CreateDoctorCommand {
  name: string;
  specialty: string;
  specialtyId?: string | null;
  office: string | null;
}

/**
 * Inbound Port: Doctor Service
 * SPEC-003/015/016: Contratos de las operaciones de negocio sobre médicos.
 */
export interface DoctorServicePort {
  createDoctor(command: CreateDoctorCommand): Promise<DoctorView>;
  findAll(status?: DoctorStatus): Promise<DoctorView[]>;
  findById(id: string): Promise<DoctorView>;
  /** SPEC-015/016: Check-in requires choosing an available office from the catalog. */
  checkIn(id: string, office: string): Promise<DoctorView>;
  /** SPEC-015: Check-out clears office to null and validates not busy. */
  checkOut(id: string): Promise<DoctorView>;
  /** SPEC-016: Returns enabled office numbers not occupied by any active doctor, sorted ascending. */
  getAvailableOffices(): Promise<string[]>;
  updateSpecialty(
    id: string,
    name: string,
    specialtyId?: string,
  ): Promise<void>;
}
