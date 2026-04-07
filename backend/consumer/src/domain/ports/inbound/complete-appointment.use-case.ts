/**
 * SPEC-012: Inbound port — explicitly complete a called appointment.
 */
export interface CompleteAppointmentUseCase {
  execute(appointmentId: string): Promise<void>;
}
