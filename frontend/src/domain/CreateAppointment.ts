// ⚕️ HUMAN CHECK - Frontend DTO synced with backend
export interface CreateAppointmentDTO {
  fullName: string;
  idCard: number;
  priority: "high" | "medium" | "low"; // SPEC-003: obligatorio, sin valor por defecto
}

// ⚕️ HUMAN CHECK - Response synced with backend (ProducerService)
export interface CreateAppointmentResponse {
  status: "accepted" | "error";
  message: string;
}
