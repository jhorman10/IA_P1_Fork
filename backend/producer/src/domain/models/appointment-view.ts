export interface AppointmentView {
  id: string;
  fullName: string;
  idCard: number;
  office: string | null;
  doctorId: string | null;
  status: "waiting" | "called" | "completed";
  priority: "high" | "medium" | "low";
  timestamp: number;
  completedAt?: number;
}
