import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

export interface CreateAppointmentResponse {
    status: 'accepted';
    message: string;
}

@Injectable()
export class ProducerService {
    private readonly logger = new Logger(ProducerService.name);

    constructor(@Inject('TURNOS_SERVICE') private readonly client: ClientProxy) { }

    async createAppointment(createAppointmentDto: CreateAppointmentDto): Promise<CreateAppointmentResponse> {
        try {
            this.client.emit('create_appointment', createAppointmentDto);
            return { status: 'accepted', message: 'Appointment assignment in progress' };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error publishing message: ${message}`);
            throw error;
        }
    }
}
