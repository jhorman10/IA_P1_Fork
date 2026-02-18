import { CreateAppointmentDto } from '../../../dto/create-appointment.dto';

export interface AppointmentPublisherPort {
    publishAppointmentCreated(data: CreateAppointmentDto): Promise<void>;
}
