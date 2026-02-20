import { AppointmentEventPayload } from '../../../types/appointment-event';

/**
 * Inbound Port: Query Appointments Use Case
 * ⚕️ HUMAN CHECK - Hexagonal: El Controller y el Gateway dependen de esta interfaz, no de la implementación.
 */
export interface QueryAppointmentsUseCase {
    findAll(): Promise<AppointmentEventPayload[]>;
    findByIdCard(idCard: number): Promise<AppointmentEventPayload[]>;
}
