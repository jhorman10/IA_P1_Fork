import { Appointment } from '../../entities/appointment.entity';

export interface NotificationPort {
    notifyAppointmentUpdated(appointment: Appointment): Promise<void>;
}
