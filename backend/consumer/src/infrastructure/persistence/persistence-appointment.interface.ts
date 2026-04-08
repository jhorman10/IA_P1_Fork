import { AppointmentStatus } from "../../domain/entities/appointment.entity";

/**
 * Typed contract for the persistence layer.
 * ⚕️ HUMAN CHECK - Elimina todos los 'any' en el Data Mapper (F-09).
 */
export interface PersistenceAppointmentData {
  idCard: number;
  fullName: string;
  priority: string;
  status: AppointmentStatus;
  office: string | null;
  timestamp: number;
  completedAt?: number;
  domainId: string;
  // SPEC-003: médico asignado
  doctorId?: string | null;
  doctorName?: string | null;
}
