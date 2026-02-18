import { AppointmentEventPayload } from '../../../types/appointment-event';

/**
 * Port: Outbound — Read-only repository for appointments.
 * ⚕️ HUMAN CHECK - DIP: Producer depends on this abstraction, not Mongoose.
 */
export interface AppointmentReadRepository {
    findAll(): Promise<AppointmentEventPayload[]>;
    findByIdCard(idCard: number): Promise<AppointmentEventPayload[]>;
}
