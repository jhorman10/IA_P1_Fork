/**
 * Read model for Specialty — used in Producer API responses.
 * SPEC-015: Contrato de salida seguro para exponer datos del catálogo de especialidades.
 */
export interface SpecialtyView {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
