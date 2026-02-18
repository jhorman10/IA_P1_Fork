import { CreateAppointmentDto } from '../../../dto/create-appointment.dto';
import { AppointmentDocument } from '../../../schemas/appointment.schema';

export interface RegisterAppointmentUseCase {
    execute(data: CreateAppointmentDto): Promise<AppointmentDocument>;
}
