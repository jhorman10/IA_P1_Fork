import { Appointment } from '../../entities/appointment.entity';

export interface RegisterAppointmentUseCase {
    execute(data: { idCard: number; fullName: string }): Promise<Appointment>;
}
