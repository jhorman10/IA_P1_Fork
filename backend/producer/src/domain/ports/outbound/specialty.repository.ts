import { SpecialtyView } from "../../models/specialty-view";

/**
 * Outbound Port: Specialty Read Repository
 * SPEC-015: Operaciones de consulta sobre el catálogo de especialidades.
 */
export interface SpecialtyReadRepository {
  findAll(): Promise<SpecialtyView[]>;
  findById(id: string): Promise<SpecialtyView | null>;
  /** Case-insensitive lookup por nombre (para evitar duplicados). */
  findByName(name: string): Promise<SpecialtyView | null>;
}

/**
 * Outbound Port: Specialty Write Repository
 * SPEC-015: Operaciones de escritura sobre el catálogo de especialidades.
 */
export interface SpecialtyWriteRepository {
  save(name: string): Promise<SpecialtyView>;
  update(id: string, name: string): Promise<SpecialtyView | null>;
  /** Retorna true si el documento existía y fue eliminado. */
  delete(id: string): Promise<boolean>;
}

/**
 * SPEC-015: Conteo de doctores que referencian a una especialidad.
 * Usado para proteger delete contra integridad referencial.
 */
export interface SpecialtyReferenceRepository {
  countDoctorsBySpecialtyId(specialtyId: string): Promise<number>;
}

export interface SpecialtyRepository
  extends
    SpecialtyReadRepository,
    SpecialtyWriteRepository,
    SpecialtyReferenceRepository {}
