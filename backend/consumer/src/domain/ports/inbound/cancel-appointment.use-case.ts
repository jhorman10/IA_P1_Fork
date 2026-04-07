/**
 * SPEC-012: Inbound port — cancel a waiting appointment.
 */
export interface CancelAppointmentUseCase {
  execute(appointmentId: string): Promise<void>;
}
