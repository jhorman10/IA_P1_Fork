// ⚕️ HUMAN CHECK - Frontend DTO synced with backend
export interface CreateAppointmentDTO {
  fullName: string;
  idCard: number | string;
  priority?: "high" | "medium" | "low";
}

// ⚕️ HUMAN CHECK - Response synced with backend (ProducerService)
export interface CreateAppointmentResponse {
  /** Optional id returned by backend on success */
  id?: string;
  status?: "accepted" | "error";
  message?: string;
}
