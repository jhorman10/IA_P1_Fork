import { AppointmentView } from "../../models/appointment-view";

/**
 * Port: Outbound — Read-only repository for appointments.
 * ⚕️ HUMAN CHECK - DIP: El Producer depende de esta abstracción, no de Mongoose.
 */
export interface AppointmentReadRepository {
  findAll(): Promise<AppointmentView[]>;
  findByIdCard(idCard: number): Promise<AppointmentView[]>;
  findById(id: string): Promise<AppointmentView | null>;
}
