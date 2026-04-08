import { DomainError } from "./domain.error";

/**
 * Thrown when a patient already has an active (waiting/called) appointment.
 * Fatal: moves to DLQ — must not be retried.
 */
export class DuplicateActiveAppointmentError extends DomainError {
  constructor(idCard: number) {
    super(
      `Patient ${idCard} already has an active appointment`,
      "DUPLICATE_ACTIVE_APPOINTMENT",
      { idCard },
    );
  }
}
