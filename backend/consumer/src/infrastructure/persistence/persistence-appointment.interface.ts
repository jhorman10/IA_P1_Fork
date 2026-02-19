import { AppointmentStatus } from '../../domain/entities/appointment.entity';

/**
 * Typed contract for the persistence layer.
 * ⚕️ HUMAN CHECK - Eliminates all 'any' in the Data Mapper (F-09).
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
}
