import { Appointment } from '../entities/appointment.entity';
import { IdCard } from '../value-objects/id-card.value-object';
import { FullName } from '../value-objects/full-name.value-object';
import { Priority } from '../value-objects/priority.value-object';

export class AppointmentFactory {
    public static createNew(idCard: IdCard, fullNameStr: string): Appointment {
        return new Appointment(
            '', // ID will be assigned by persistence or a UUID generator
            idCard,
            new FullName(fullNameStr),
            new Priority('medium'), // Business Policy: Default priority is medium
            'waiting',
            null,
            Date.now()
        );
    }

    public static createWithPriority(idCard: IdCard, fullNameStr: string, priorityStr: string): Appointment {
        return new Appointment(
            '',
            idCard,
            new FullName(fullNameStr),
            new Priority(priorityStr),
            'waiting',
            null,
            Date.now()
        );
    }
}
