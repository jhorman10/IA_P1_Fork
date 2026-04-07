// ⚕️ HUMAN CHECK - Tipos de dominio para Appointment
// Estos tipos centralizan definiciones de estados, prioridades, y payloads
// para garantizar type safety y consistencia entre servicios.

/**
 * Valid states for the appointment lifecycle
 */
export type AppointmentStatus =
  | "waiting"
  | "called"
  | "completed"
  | "cancelled";

/**
 * Valid priorities for office assignment
 */
export type AppointmentPriority = "high" | "medium" | "low";

/**
 * Standardized payload for RabbitMQ and WebSocket events.
 * Used by: Consumer (emit), Producer (receive + broadcast), Frontend (receive).
 */
export interface AppointmentEventPayload {
  id: string;
  fullName: string;
  idCard: number;
  office: string | null;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  timestamp: number;
  completedAt?: number;
}
