import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Appointment as AppointmentSchema, AppointmentSchema as SchemaDef } from '../schemas/appointment.schema';
import { AppointmentService } from './appointment.service';
import { RegisterAppointmentUseCaseImpl } from '../application/use-cases/register-appointment.use-case.impl';
import { MongooseAppointmentRepository } from '../infrastructure/persistence/mongoose-appointment.repository';
import { NestLoggerAdapter } from '../infrastructure/logging/nest-logger.adapter';
import { SystemClockAdapter } from '../infrastructure/utils/system-clock.adapter';
import { RmqNotificationAdapter } from '../infrastructure/adapters/rmq-notification.adapter';
import { NotificationsService } from '../notifications/notifications.service';
import { Appointment } from '../domain/entities/appointment.entity';
import { AppointmentEventsHandler } from '../application/event-handlers/appointment-events.handler';
import { LocalDomainEventBusAdapter } from '../infrastructure/messaging/local-domain-event-bus.adapter';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
        ClientsModule.registerAsync([
            {
                name: 'APPOINTMENT_NOTIFICATIONS',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (config: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
                        queue: 'appointment_notifications_queue',
                    },
                }),
            },
        ]),
    ],
    providers: [
        AppointmentService,
        NotificationsService,
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
            provide: 'NotificationPort',
            useClass: RmqNotificationAdapter,
        },
        AppointmentEventsHandler,
        {
            provide: 'DomainEventBus',
            inject: [AppointmentEventsHandler],
            useFactory: (handler: AppointmentEventsHandler) => new LocalDomainEventBusAdapter(handler),
        },
        {
            provide: 'RegisterAppointmentUseCase',
            inject: ['AppointmentRepository', 'LoggerPort', 'DomainEventBus'],
            useFactory: (repo, logger, eventBus) => new RegisterAppointmentUseCaseImpl(repo, logger, eventBus),
        },
    ],
    exports: [
        AppointmentService,
        'AppointmentRepository',
        'RegisterAppointmentUseCase',
        'LoggerPort',
        'ClockPort',
        'NotificationPort',
        'DomainEventBus',
        MongooseModule
    ],
})
export class AppointmentModule { }
