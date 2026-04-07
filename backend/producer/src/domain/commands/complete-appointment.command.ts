/**
 * SPEC-012: Command to complete an appointment.
 * Decouples the use case from API/infrastructure DTOs.
 */
export class CompleteAppointmentCommand {
  constructor(
    public readonly appointmentId: string,
    public readonly actorUid: string,
    public readonly timestamp: number,
  ) {}
}
