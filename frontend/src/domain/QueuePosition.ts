// SPEC-003: posición en cola del paciente
export interface QueuePosition {
  idCard: number;
  position: number; // 1-based; 0 si no está en cola
  total: number;
  status: string; // AppointmentStatus | "not_found"
  priority: string | null;
}
