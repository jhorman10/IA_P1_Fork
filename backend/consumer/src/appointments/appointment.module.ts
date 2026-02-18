import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment as AppointmentSchema, AppointmentSchema as SchemaDef } from '../schemas/appointment.schema';
import { AppointmentService } from './appointment.service';
import { RegisterAppointmentUseCaseImpl } from '../application/use-cases/register-appointment.use-case.impl';
import { MongooseAppointmentRepository } from '../infrastructure/persistence/mongoose-appointment.repository';
import { NestLoggerAdapter } from '../infrastructure/logging/nest-logger.adapter';
import { SystemClockAdapter } from '../infrastructure/utils/system-clock.adapter';
import { Appointment } from '../domain/entities/appointment.entity';

@Module({
    imports: [MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }])],
    providers: [
        AppointmentService,
        {
            provide: 'AppointmentRepository',
            useClass: MongooseAppointmentRepository,
        },
        {
            provide: 'LoggerPort',
            useClass: NestLoggerAdapter,
        },
        {
            provide: 'ClockPort',
            useClass: SystemClockAdapter,
        },
        {
            provide: 'RegisterAppointmentUseCase',
            inject: ['AppointmentRepository', 'LoggerPort'],
            useFactory: (repo, logger) => new RegisterAppointmentUseCaseImpl(repo, logger),
        },
    ],
    exports: [AppointmentService, 'AppointmentRepository', 'RegisterAppointmentUseCase', 'LoggerPort', 'ClockPort', MongooseModule],
})
export class AppointmentModule { }
