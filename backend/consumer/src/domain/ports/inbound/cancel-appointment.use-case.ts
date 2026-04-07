/**
 * SPEC-012: Inbound port — cancel appointment use case.
 */
export interface CancelAppointmentUseCase {
  execute(appointmentId: string): Promise<void>;
}
