import { SpecialtyView } from "../../models/specialty-view";

/**
 * Command: Create Specialty
 * SPEC-015: Datos necesarios para crear una especialidad en el catálogo.
 */
export interface CreateSpecialtyCommand {
  name: string;
}

/**
 * Inbound Port: Specialty Service
 * SPEC-015: Contratos de las operaciones CRUD del catálogo de especialidades.
 */
export interface SpecialtyServicePort {
  createSpecialty(command: CreateSpecialtyCommand): Promise<SpecialtyView>;
  findAll(): Promise<SpecialtyView[]>;
  findById(id: string): Promise<SpecialtyView>;
  updateSpecialty(id: string, name: string): Promise<SpecialtyView>;
  deleteSpecialty(id: string): Promise<void>;
}

/** NestJS injection token for the Specialty Service. */
export const SPECIALTY_SERVICE_TOKEN = "SpecialtyService";
