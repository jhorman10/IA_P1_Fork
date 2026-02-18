import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../schemas/appointment.schema';
import { AppointmentService } from './appointment.service';
import { RegisterAppointmentUseCaseImpl } from '../application/use-cases/register-appointment.use-case.impl';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
    ],
    providers: [
        AppointmentService,
        {
            provide: 'RegisterAppointmentUseCase',
            useClass: RegisterAppointmentUseCaseImpl,
        },
    ],
    exports: [AppointmentService, 'RegisterAppointmentUseCase', MongooseModule],
})
export class AppointmentModule { }
