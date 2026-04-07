/**
 * SPEC-012: Inbound port — complete appointment use case.
 */
export interface CompleteAppointmentUseCase {
  execute(appointmentId: string): Promise<void>;
}
