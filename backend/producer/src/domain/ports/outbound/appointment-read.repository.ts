import { AppointmentView } from "../../models/appointment-view";

/**
 * Port: Outbound — Read-only repository for appointments.
 * ⚕️ HUMAN CHECK - DIP: El Producer depende de esta abstracción, no de Mongoose.
 */
export interface AppointmentReadRepository {
  findAll(): Promise<AppointmentView[]>;
  findByIdCard(idCard: number): Promise<AppointmentView[]>;
  /** SPEC-003: Devuelve el turno activo (waiting/called) de un paciente, o null si no existe */
  findActiveByIdCard(idCard: number): Promise<AppointmentView | null>;
}
