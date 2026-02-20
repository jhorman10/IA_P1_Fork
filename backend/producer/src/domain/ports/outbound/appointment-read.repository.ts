import { AppointmentEventPayload } from "../../../types/appointment-event";

/**
 * Port: Outbound — Read-only repository for appointments.
 * ⚕️ HUMAN CHECK - DIP: El Producer depende de esta abstracción, no de Mongoose.
 */
export interface AppointmentReadRepository {
  findAll(): Promise<AppointmentEventPayload[]>;
  findByIdCard(idCard: number): Promise<AppointmentEventPayload[]>;
}
