import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RegisterAppointmentUseCase } from '../../domain/ports/inbound/register-appointment.use-case';
import { CreateAppointmentDto } from '../../dto/create-appointment.dto';
import { AppointmentDocument } from '../../schemas/appointment.schema';
import { AppointmentService } from '../../appointments/appointment.service';

@Injectable()
export class RegisterAppointmentUseCaseImpl implements RegisterAppointmentUseCase {
    private readonly logger = new Logger(RegisterAppointmentUseCaseImpl.name);

    constructor(private readonly appointmentService: AppointmentService) { }

    async execute(data: CreateAppointmentDto): Promise<AppointmentDocument> {
        // Validation logic extracted from the Controller (Infrastructure) to the Use Case (Application)
        if (typeof data.idCard !== 'number' || Number.isNaN(data.idCard)) {
            throw new BadRequestException('idCard must be numeric');
        }

        this.logger.log(`Registering appointment request for patient ${data.idCard}`);

        // Delegate to repository/entity logic via AppointmentService (which acts as a domain service/repository wrapper here)
        return this.appointmentService.createAppointment(data);
    }
}
