import { OfficeView } from "../../models/office-view";

/**
 * Port: Outbound — Office repository (read + write).
 * SPEC-016: Fuente de verdad para el catálogo administrable de consultorios.
 */
export interface OfficeReadRepository {
  /** Returns all offices ordered by number ASC. */
  findAll(): Promise<OfficeView[]>;
  /** Returns a single office by its stable number string, or null if not found. */
  findByNumber(number: string): Promise<OfficeView | null>;
  /** Returns the numbers of all enabled offices, sorted numerically ASC. */
  findEnabledNumbers(): Promise<string[]>;
  /** Returns the highest existing office number (0 if collection is empty). */
  findMaxNumber(): Promise<number>;
}

export interface OfficeWriteRepository {
  /** Persists a new office with the given number and enabled=true. */
  createMany(numbers: string[]): Promise<OfficeView[]>;
  /** Updates the enabled flag of an office identified by number. */
  updateEnabled(number: string, enabled: boolean): Promise<OfficeView | null>;
}

export interface OfficeRepository
  extends OfficeReadRepository, OfficeWriteRepository {}
