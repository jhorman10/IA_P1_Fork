import { Appointment } from '../../entities/appointment.entity';
import { IdCard } from '../../value-objects/id-card.value-object';

export interface AppointmentRepository {
    findWaiting(): Promise<Appointment[]>;
    getOccupiedOfficeIds(): Promise<string[]>;
    save(appointment: Appointment): Promise<Appointment>;
    findById(id: string): Promise<Appointment | null>;
    findByIdCardAndActive(idCard: IdCard): Promise<Appointment | null>;
    findExpiredCalled(now: number): Promise<Appointment[]>;
    updateStatus(id: string, status: string): Promise<void>;
}
