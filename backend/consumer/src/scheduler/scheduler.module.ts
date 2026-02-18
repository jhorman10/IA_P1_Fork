import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { TurnosModule } from '../appointments/turnos.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseAppointmentRepository } from '../infrastructure/persistence/mongoose-appointment.repository';
import { RabbitMQNotificationAdapter } from '../infrastructure/messaging/rabbitmq-notification.adapter';
import { AssignAppointmentsUseCaseImpl } from '../application/use-cases/assign-appointments.use-case.impl';

@Module({
    imports: [TurnosModule, NotificationsModule, ConfigModule],
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
            provide: 'AssignAppointmentsUseCase',
            inject: ['AppointmentRepository', 'NotificationPort', ConfigService],
            useFactory: (repo, notifier, config) => {
                const totalOffices = Number(config.get('CONSULTORIOS_TOTAL')) || 5;
                return new AssignAppointmentsUseCaseImpl(repo, notifier, totalOffices);
            },
        },
    ],
    exports: [SchedulerService],
})
export class SchedulerModule { }
