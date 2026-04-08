export interface AppointmentView {
  id: string;
  fullName: string;
  idCard: number;
  office: string | null;
  status: "waiting" | "called" | "completed";
  priority: "high" | "medium" | "low";
  timestamp: number;
  completedAt?: number;
  // SPEC-003: médico asignado — null para turnos en espera o migrados
  doctorId: string | null;
  doctorName: string | null;
}
