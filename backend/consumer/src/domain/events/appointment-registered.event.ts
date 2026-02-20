import { Appointment } from "../entities/appointment.entity";
import { DomainEvent } from "./domain-event.base";

export class AppointmentRegisteredEvent extends DomainEvent {
  constructor(public readonly appointment: Appointment) {
    super();
  }
}
