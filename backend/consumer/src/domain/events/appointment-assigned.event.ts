import { DomainEvent } from './domain-event.base';
import { Appointment } from '../entities/appointment.entity';

export class AppointmentAssignedEvent extends DomainEvent {
    constructor(public readonly appointment: Appointment) {
        super();
    }
}
