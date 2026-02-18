import { AppointmentEventPayload } from '../../../types/appointment-event';

/**
 * Inbound Port: Query Appointments Use Case
 * ⚕️ HUMAN CHECK - Hexagonal: Controller + Gateway depend on this interface, not the implementation.
 */
export interface QueryAppointmentsUseCase {
    findAll(): Promise<AppointmentEventPayload[]>;
    findByIdCard(idCard: number): Promise<AppointmentEventPayload[]>;
}
