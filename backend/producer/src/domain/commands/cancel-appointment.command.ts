/**
 * SPEC-012: Command to cancel an appointment.
 * Decouples the use case from API/infrastructure DTOs.
 */
export class CancelAppointmentCommand {
  constructor(
    public readonly appointmentId: string,
    public readonly actorUid: string,
    public readonly timestamp: number,
  ) {}
}
