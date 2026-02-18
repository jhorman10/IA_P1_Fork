import { DomainEvent } from './domain-event.base';
import { Appointment } from '../entities/appointment.entity';

export class AppointmentRegisteredEvent extends DomainEvent {
    constructor(public readonly appointment: Appointment) {
        super();
    }
}
