import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../schemas/appointment.schema';
import { TurnosService } from './turnos.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
    ],
    providers: [TurnosService],
    exports: [TurnosService, MongooseModule],
})
export class TurnosModule { }
