import { OfficeDetailView, OfficeView } from "../../models/office-view";

/**
 * Command: Adjust capacity
 * SPEC-016: Establece la capacidad objetivo creando nuevos consultorios secuenciales.
 */
export interface AdjustCapacityCommand {
  targetTotal: number;
}

/**
 * Result: Adjust capacity
 */
export interface AdjustCapacityResult {
  targetTotal: number;
  createdOffices: string[];
  unchanged: boolean;
}

/**
 * Inbound Port: Office Service
 * SPEC-016: Contratos de las operaciones de negocio sobre el catálogo de consultorios.
 */
export interface OfficeServicePort {
  /** GET /offices — Lista completa con metadatos operativos derivados. */
  getAll(): Promise<OfficeDetailView[]>;
  /** PATCH /offices/capacity — Ajuste idempotente de capacidad objetivo. */
  adjustCapacity(command: AdjustCapacityCommand): Promise<AdjustCapacityResult>;
  /** PATCH /offices/:number — Habilita o deshabilita un consultorio. */
  updateEnabled(number: string, enabled: boolean): Promise<OfficeDetailView>;
  /** Internal: returned enabled office numbers; used by DoctorService. */
  getEnabledNumbers(): Promise<string[]>;
  /** Seed inicial: crea consultorios 1..5 habilitados si la colección está vacía. */
  seedIfEmpty(): Promise<void>;
}

/** Token de inyección para el servicio. */
export const OFFICE_SERVICE_TOKEN = "OfficeService";

/** Read-only facet used by DoctorServiceImpl to validate offices without full service injection. */
export interface OfficeReadServicePort {
  findByNumber(number: string): Promise<OfficeView | null>;
  findEnabledNumbers(): Promise<string[]>;
}
