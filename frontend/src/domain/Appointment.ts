// ⚕️ HUMAN CHECK - Domain model synced with backend AppointmentEventPayload
export type AppointmentStatus =
  | "waiting"
  | "called"
  | "completed"
  | "cancelled";
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
  /** SPEC-008: doctor currently serving this appointment */
  doctorId?: string | null;
  doctorName?: string | null;
}
