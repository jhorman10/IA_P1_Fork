import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../schemas/appointment.schema';
import { NestLoggerAdapter } from '../infrastructure/logging/nest-logger.adapter';
import { SystemClockAdapter } from '../infrastructure/utils/system-clock.adapter';

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
