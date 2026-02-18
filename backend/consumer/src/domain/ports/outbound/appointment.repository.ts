import { Appointment } from '../../entities/appointment.entity';

export interface AppointmentRepository {
    findWaiting(): Promise<Appointment[]>;
    getOccupiedOfficeIds(): Promise<string[]>;
    save(appointment: Appointment): Promise<Appointment>;
    findById(id: string): Promise<Appointment | null>;
    findByIdCardAndActive(idCard: number): Promise<Appointment | null>;
    findExpiredCalled(now: number): Promise<Appointment[]>;
    updateStatus(id: string, status: string): Promise<void>;
}
