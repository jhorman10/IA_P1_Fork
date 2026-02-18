import { CreateAppointmentDto } from '../../../dto/create-appointment.dto';

/**
 * Inbound Port: Create Appointment Use Case
 * ⚕️ HUMAN CHECK - Hexagonal: Controller depends on this interface, not the implementation.
 */
export interface CreateAppointmentResponse {
    status: 'accepted';
    message: string;
}

export interface CreateAppointmentUseCase {
    execute(dto: CreateAppointmentDto): Promise<CreateAppointmentResponse>;
}
