/**
 * Read model for Office — used in Producer API responses.
 * SPEC-016: Catálogo administrable de consultorios individuales.
 */
export interface OfficeView {
  number: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended view with derived occupancy fields for GET /offices response.
 * Fields are computed at query time by crossing Office catalog with Doctor state.
 */
export interface OfficeDetailView extends OfficeView {
  occupied: boolean;
  occupiedByDoctorId: string | null;
  occupiedByDoctorName: string | null;
  occupiedByStatus: string | null;
  canDisable: boolean;
}
