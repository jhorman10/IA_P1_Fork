import { Appointment } from "../../entities/appointment.entity";
import { IdCard } from "../../value-objects/id-card.value-object";

export interface AppointmentReadRepository {
  findWaiting(): Promise<Appointment[]>;
  findAvailableOffices(allOfficeIds: string[]): Promise<string[]>;
  findById(id: string): Promise<Appointment | null>;
  findByIdCardAndActive(idCard: IdCard): Promise<Appointment | null>;
  findExpiredCalled(now: number): Promise<Appointment[]>;
}

export interface AppointmentWriteRepository {
  save(appointment: Appointment): Promise<Appointment>;
  updateStatus(id: string, status: string): Promise<void>;
}

export interface AppointmentRepository
  extends AppointmentReadRepository,
    AppointmentWriteRepository {}
