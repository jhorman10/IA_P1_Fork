import { AppointmentView } from "../../models/appointment-view";

/**
 * Inbound Port: Query Appointments Use Case
 * ⚕️ HUMAN CHECK - Hexagonal: El Controller y el Gateway dependen de esta interfaz, no de la implementación.
 */
export interface QueryAppointmentsUseCase {
  findAll(): Promise<AppointmentView[]>;
  findByIdCard(idCard: number): Promise<AppointmentView[]>;
}
