import { Appointment } from "../entities/appointment.entity";
import { IdCard } from "../value-objects/id-card.value-object";
import { FullName } from "../value-objects/full-name.value-object";
import { Priority } from "../value-objects/priority.value-object";

/**
 * ⚕️ HUMAN CHECK - Fábrica de Dominio (H-28)
 * Garantiza consistencia y estado inicial válido.
 */
export class AppointmentFactory {
  public static createNew(
    idCard: IdCard,
    fullName: FullName,
    timestamp: number,
  ): Appointment {
    return new Appointment(
      idCard,
      fullName,
      new Priority("medium"), // Business Policy: Default priority is medium
      "waiting",
      null,
      timestamp,
    );
  }

  public static createWithPriority(
    idCard: IdCard,
    fullName: FullName,
    priority: Priority,
    timestamp: number,
  ): Appointment {
    return new Appointment(
      idCard,
      fullName,
      priority,
      "waiting",
      null,
      timestamp,
    );
  }
}
