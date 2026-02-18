import { Inject, Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentPublisherPort } from './domain/ports/outbound/appointment-publisher.port';

export interface CreateAppointmentResponse {
    status: 'accepted';
    message: string;
}

@Injectable()
export class ProducerService {
    constructor(
        @Inject('AppointmentPublisherPort')
        private readonly publisher: AppointmentPublisherPort
    ) { }

    async createAppointment(createAppointmentDto: CreateAppointmentDto): Promise<CreateAppointmentResponse> {
        await this.publisher.publishAppointmentCreated(createAppointmentDto);
        return { status: 'accepted', message: 'Appointment assignment in progress' };
    }
}
