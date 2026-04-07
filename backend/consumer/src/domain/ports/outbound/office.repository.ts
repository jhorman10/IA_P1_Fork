/**
 * Port: Outbound — Read-only repository for Office catalog (Consumer side).
 * SPEC-016: Permite al motor de asignación filtrar doctores cuyos consultorios
 * ya no están habilitados en el catálogo.
 */
export interface OfficeReadRepository {
  /** Returns the set of enabled office numbers. */
  findEnabledNumbers(): Promise<Set<string>>;
}
