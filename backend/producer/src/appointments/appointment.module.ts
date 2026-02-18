import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../schemas/appointment.schema';
import { MongooseAppointmentReadRepository } from '../infrastructure/adapters/outbound/mongoose-appointment-read.repository';
import { QueryAppointmentsUseCaseImpl } from '../application/use-cases/query-appointments.use-case.impl';

// ⚕️ HUMAN CHECK - Hexagonal Module: Binds inbound port → use-case, outbound port → adapter
@Module({
    imports: [
        MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
    ],
    providers: [
        {
            provide: 'QueryAppointmentsUseCase',
            useClass: QueryAppointmentsUseCaseImpl,
        },
        {
            provide: 'AppointmentReadRepository',
            useClass: MongooseAppointmentReadRepository,
        },
    ],
    exports: ['QueryAppointmentsUseCase'],
})
export class AppointmentModule { }
