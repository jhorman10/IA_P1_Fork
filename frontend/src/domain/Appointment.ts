// ⚕️ HUMAN CHECK - Domain model synced with backend AppointmentEventPayload
export type AppointmentStatus = "waiting" | "called" | "completed";
export type AppointmentPriority = "high" | "medium" | "low";

export interface Appointment {
  id: string;
  fullName: string;
  idCard: number;
  office: string | null;
  timestamp: number;
  completedAt?: number;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  doctorId: string | null; // SPEC-003: médico asignado
  doctorName: string | null; // SPEC-003: nombre desnormalizado
}
