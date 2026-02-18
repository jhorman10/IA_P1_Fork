import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from '../schemas/appointment.schema';
import { AppointmentService } from './appointment.service';
import { RegisterAppointmentUseCaseImpl } from '../application/use-cases/register-appointment.use-case.impl';
import { MongooseAppointmentRepository } from '../infrastructure/persistence/mongoose-appointment.repository';
import { NestLoggerAdapter } from '../infrastructure/logging/nest-logger.adapter';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
    ],
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
            provide: 'RegisterAppointmentUseCase',
            inject: ['AppointmentRepository', 'LoggerPort'],
            useFactory: (repo, logger) => new RegisterAppointmentUseCaseImpl(repo, logger),
        },
    ],
    exports: [AppointmentService, 'AppointmentRepository', 'RegisterAppointmentUseCase', 'LoggerPort', MongooseModule],
})
export class AppointmentModule { }
