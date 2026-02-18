import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AppointmentModule } from '../appointments/appointment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseAppointmentRepository } from '../infrastructure/persistence/mongoose-appointment.repository';
import { RabbitMQNotificationAdapter } from '../infrastructure/messaging/rabbitmq-notification.adapter';
import { CompleteExpiredAppointmentsUseCaseImpl } from '../application/use-cases/complete-expired-appointments.use-case.impl';
import { AssignAvailableOfficesUseCaseImpl } from '../application/use-cases/assign-available-offices.use-case.impl';

@Module({
    imports: [AppointmentModule, NotificationsModule, ConfigModule],
    providers: [
        SchedulerService,
        {
            provide: 'AppointmentRepository',
            useClass: MongooseAppointmentRepository,
        },
        {
            provide: 'NotificationPort',
            useClass: RabbitMQNotificationAdapter,
        },
        {
            provide: 'CompleteExpiredAppointmentsUseCase',
            inject: ['AppointmentRepository', 'NotificationPort', 'LoggerPort', 'ClockPort'],
            useFactory: (repo, notifier, logger, clock) => new CompleteExpiredAppointmentsUseCaseImpl(repo, notifier, logger, clock),
        },
        {
            provide: 'AssignAvailableOfficesUseCase',
            inject: ['AppointmentRepository', 'NotificationPort', 'LoggerPort', 'ClockPort', ConfigService],
            useFactory: (repo, notifier, logger, clock, config) => {
                const totalOffices = Number(config.get('CONSULTORIOS_TOTAL')) || 5;
                return new AssignAvailableOfficesUseCaseImpl(repo, notifier, logger, clock, totalOffices);
            },
        },
    ],
    exports: [SchedulerService],
})
export class SchedulerModule { }
