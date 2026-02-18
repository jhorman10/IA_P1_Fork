import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../schemas/appointment.schema';
import { AppointmentService } from './appointment.service';
import { MongooseAppointmentReadRepository } from '../infrastructure/adapters/outbound/mongoose-appointment-read.repository';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
    ],
    providers: [
        AppointmentService,
        {
            provide: 'AppointmentReadRepository',
            useClass: MongooseAppointmentReadRepository,
        },
    ],
    exports: [AppointmentService],
})
export class AppointmentModule { }
